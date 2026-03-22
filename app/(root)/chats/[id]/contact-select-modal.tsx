"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Send, Check, User as UserIcon } from "lucide-react";
import { db } from "@/lib/indexdb";
import { Contact, User } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLiveQuery } from "dexie-react-hooks";

interface ContactSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (selectedContacts: Contact[]) => void;
}

const PAGE_SIZE = 25;

export const ContactSelectModal = ({
  isOpen,
  onClose,
  onSend,
}: ContactSelectModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [loadedContacts, setLoadedContacts] = useState<Contact[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Get current user only for "You" display and filtering
  const currentUser = useLiveQuery(() => db.user.toCollection().first());

  // Find the contact record that represents "You"
  const currentUserContact = useLiveQuery(async () => {
    if (!currentUser) return null;
    const all = await db.contact.toArray();
    return all.find(c => c.contact_user?.id === currentUser.id) || null;
  }, [currentUser]);

  // Reset pagination when search query changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setLoadedContacts([]);
      setHasMore(true);
    }
  }, [searchQuery, isOpen]);

  // Fetch contacts from IndexedDB with pagination and search
  const fetchContacts = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      const offset = page * PAGE_SIZE;
      let collection;
      
      if (searchQuery) {
        collection = db.contact
          .where("contact_name")
          .startsWithIgnoreCase(searchQuery)
          .or("contact_phone_number")
          .startsWith(searchQuery);
      } else {
        collection = db.contact.orderBy("contact_name");
      }

      const results = await collection
        .offset(offset)
        .limit(PAGE_SIZE)
        .toArray();

      if (results.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
          setHasMore(true);
      }

      setLoadedContacts((prev) => {
        // First, apply current user filtering to the existing list (in case currentUser just loaded)
        const filteredPrev = prev.filter(c => 
          currentUser ? c.contact_user?.id !== currentUser.id : true
        );
        
        const existingIds = new Set(filteredPrev.map(c => c.id));
        
        // Then, filter the new results for uniqueness and against the current user
        const uniqueAndFilteredNew = results.filter(c => {
          const idMatch = !existingIds.has(c.id);
          const notMe = currentUser ? c.contact_user?.id !== currentUser.id : true;
          return idMatch && notMe;
        });
        
        return [...filteredPrev, ...uniqueAndFilteredNew];
      });
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  }, [page, searchQuery, isOpen, currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [fetchContacts, isOpen]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && isOpen) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 } // More sensitive for smaller lists
    );

    if (observerTarget.current && isOpen) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isOpen]);

  const toggleSelection = (id: string | undefined) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = () => {
    const selected = [];
    
    // Add "You" contact if selected
    if (currentUserContact && selectedIds.has(currentUserContact.id)) {
        selected.push(currentUserContact);
    }
    
    // Add other selected contacts (ensuring no duplicates with You card)
    const others = loadedContacts.filter((c) => 
        selectedIds.has(c.id) && (!currentUserContact || c.id !== currentUserContact.id)
    );
    
    selected.push(...others);

    onSend(selected);
    onClose();
  };

  // List summary for footer
  const getSelectedNames = () => {
    const names: string[] = [];
    if (currentUserContact && selectedIds.has(currentUserContact.id)) {
        names.push(currentUserContact.contact_name);
    }
    
    loadedContacts.forEach(c => {
      if (selectedIds.has(c.id) && (!currentUserContact || c.id !== currentUserContact.id)) {
         names.push(c.contact_name);
      }
    });
    
    return names.join(", ");
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 animate-in fade-in duration-200 p-4 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-[400px] h-full max-h-[700px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center gap-6 px-6 py-4 border-b border-gray-100">
          <button onClick={onClose} className="text-[#54656f] hover:text-black transition-colors">
            <X size={24} />
          </button>
          <h2 className="text-[19px] font-medium text-[#111b21]">Send contacts</h2>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3">
          <div className="relative flex items-center gap-4 bg-[#f0f2f5] rounded-lg px-4 py-2">
            <Search size={18} className="text-[#8696a0]" />
            <input
              type="text"
              placeholder="Search name or number"
              className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder-[#8696a0]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* "You" Section */}
          {!searchQuery && currentUserContact && (
            <div className="mt-2 text-[#00a884]">
              <div className="px-6 py-3 text-[14px] font-medium">You</div>
              <ContactItem 
                id={currentUserContact.id} 
                name={currentUserContact.contact_name} 
                about={null} 
                avatar={currentUserContact.contact_user?.profile_pic}
                isSelected={selectedIds.has(currentUserContact.id)}
                onToggle={() => toggleSelection(currentUserContact.id)}
              />
            </div>
          )}

          {/* "Contacts" Section */}
          <div className="mt-2">
            {!searchQuery && (
              <div className="px-6 py-3 text-[14px] font-medium text-[#667781]">Contacts</div>
            )}
            
            {loadedContacts.map((contact) => (
              <ContactItem
                key={contact.id}
                id={contact.id}
                name={contact.contact_name}
                about={contact.contact_user?.bio || contact.contact_phone_number}
                avatar={contact.contact_user?.profile_pic}
                isSelected={selectedIds.has(contact.id)}
                onToggle={() => toggleSelection(contact.id)}
              />
            ))}

            {/* Empty State */}
            {loadedContacts.length === 0 && !hasMore && (
              <div className="text-center py-10 px-6 animate-in fade-in duration-300">
                <p className="text-[#8696a0] text-[14px]">No contacts found</p>
              </div>
            )}

            {/* Loading / Infinite Scroll Target */}
            {hasMore && (
              <div ref={observerTarget} className="h-14 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Footer Action */}
        {selectedIds.size > 0 && (
          <div className="p-4 bg-[#f0f2f5] flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
             <div className="flex-1 min-w-0">
                <p className="text-[#54656f] text-[15px] font-normal truncate">
                   {getSelectedNames()}
                </p>
             </div>
             
             <button
                onClick={handleSend}
                className="w-14 h-14 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#008f72] transition-all relative transform active:scale-95 shrink-0"
              >
                <Send size={24} className="ml-1" />
                <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-[#00a884] border-2 border-[#f0f2f5] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                    {selectedIds.size}
                </span>
              </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ItemProps {
  id: string;
  name: string;
  about?: string | null;
  avatar?: string | null;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const ContactItem = ({ id, name, about, avatar, isSelected, onToggle }: ItemProps) => {
  return (
    <div 
      className="flex items-center gap-4 px-6 py-3 hover:bg-[#f0f2f5] cursor-pointer transition-colors group"
      onClick={() => onToggle(id)}
    >
      {/* Checkbox */}
      <div className={cn(
        "w-5 h-5 border-2 rounded transition-all flex items-center justify-center",
        isSelected ? "bg-[#00a884] border-[#00a884]" : "border-gray-300 group-hover:border-[#00a884]"
      )}>
        {isSelected && <Check size={14} className="text-white stroke-4" />}
      </div>

      {/* Avatar */}
      <Avatar className="w-12 h-12">
        <AvatarImage src={avatar || ""} />
        <AvatarFallback className="bg-[#dfe5e7]">
           <UserIcon size={24} className="text-[#8696a0]" />
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 border-b border-gray-50 pb-3 group-last:border-none overflow-hidden">
        <div className={cn(
            "text-[17px] font-normal text-[#111b21] leading-tight truncate",
            !about && "flex items-center h-full pt-1"
        )}>{name}</div>
        {about && (
          <div className="text-[14px] text-[#667781] truncate mt-0.5">{about}</div>
        )}
      </div>
    </div>
  );
};
