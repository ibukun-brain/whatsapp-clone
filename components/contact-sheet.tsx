"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  BackspaceIcon,
  CancelIcon,
  CommunitiesIcon,
  ContactAddIcon,
  GroupAddIcon,
  PhoneDialIcon,
  SearchIcon,
} from "./icons/chats-icon";
import { Contact } from "@/types";

interface ContactSheetProps {
  open: boolean;
  contacts?: Contact[];
  currentUserid?: string;
  onOpenChange: (open: boolean) => void;
}

export function ContactSheet({ open, contacts, currentUserid, onOpenChange }: ContactSheetProps) {
  const [showPhoneDial, setShowPhoneDial] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const currentUserContact = contacts?.find(contact => contact.contact_user.id === currentUserid)
  const userContacts = contacts?.filter(contact => contact.contact_user.id !== currentUserid)

  const handleDialPadClick = (value: string) => {
    setPhoneNumber((prev) => prev + value);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="left"
        hideClose
        onInteractOutside={(e) => e.preventDefault()}
        className="bg-primary min-w-[561px] p-0 border-r-0 ml-[66px] shadow-none rounded-none h-full"
      // Override overlay to be transparent and not block interaction with the first sidebar if possible,
      // essentially acting like a panel.
      // However, standard SheetOverlay blocks interaction.
      // For this specific UI, we probably want the modal effect but only covering the right side.
      // We can achieve "covering the second sidebar" by correct z-index and positioning.
      >
        <div className="flex flex-col h-full bg-primary text-secondary-foreground">
          {/* Header */}
          <div className="px-4 pt-3 flex items-center gap-2 bg-primary border-b-0">
            <Button
              onClick={() => {
                if (showPhoneDial) {
                  setShowPhoneDial(false);
                } else {
                  onOpenChange(false);
                }
              }}
              asChild
              variant="ghost"
              className="rounded-full hover:bg-background-secondary hover:text-foreground cursor-pointer"
            >
              <div className="w-10 h-10">
                <ArrowLeftIcon />
              </div>
            </Button>
            <div className="flex flex-col">
              <SheetTitle className="text-secondary-foreground">
                {showPhoneDial ? "Phone number" : "New chat"}
              </SheetTitle>
            </div>

            {!showPhoneDial && (
              <div className="ml-auto">
                <Button
                  onClick={() => setShowPhoneDial(true)}
                  variant="ghost"
                  asChild
                  className="rounded-full hover:bg-background-secondary hover:text-foreground cursor-pointer"
                >
                  <div className="w-10 h-10">
                    <PhoneDialIcon />
                  </div>
                </Button>
              </div>
            )}
          </div>

          {showPhoneDial ? (
            <div className="flex flex-col items-center h-full w-full bg-primary">
              <div className="w-full px-7 mb-10">
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-center text-xl rounded-none selection:bg-selection selection:text-primary-foreground border-t-0 border-x-0 border-b-2 focus-visible:ring-0 focus-visible:border-b-accent"
                />
              </div>
              <p className="text-muted-foreground text-sm mb-8">
                Enter a phone number to start a chat
              </p>

              <div className="grid grid-cols-3 gap-y-6 gap-x-12 w-full max-w-[400px]">
                {[
                  { val: "1", sub: "" },
                  { val: "2", sub: "ABC" },
                  { val: "3", sub: "DEF" },
                  { val: "4", sub: "GHI" },
                  { val: "5", sub: "JKL" },
                  { val: "6", sub: "MNO" },
                  { val: "7", sub: "PQRS" },
                  { val: "8", sub: "TUV" },
                  { val: "9", sub: "WXYZ" },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => handleDialPadClick(item.val)}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-background-secondary transition-colors w-30"
                  >
                    <span className="text-2xl font-normal">{item.val}</span>
                    {item.sub && (
                      <span className="text-muted-foreground font-normal tracking-wider">
                        {item.sub}
                      </span>
                    )}
                  </button>
                ))}

                <button
                  onClick={() => handleDialPadClick("+")}
                  className="flex items-center justify-center p-4 rounded-2xl hover:bg-background-secondary w-30"
                >
                  <span className="text-2xl">+</span>
                </button>

                <button
                  onClick={() => handleDialPadClick("0")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-background-secondary w-30"
                >
                  <span className="text-2xl">0</span>
                </button>

                <button
                  onClick={handleBackspace}
                  className="flex items-center justify-center p-4 rounded-2xl hover:bg-background-secondary w-30"
                >
                  <BackspaceIcon />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="px-6 py-2">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon
                      style={{
                        width: "20px",
                        height: "20px",
                      }}
                    />
                  </div>
                  <div className="absolute right-4 top-5.5 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-all duration-100">
                    <button>
                      <CancelIcon
                        style={{
                          width: "20px",
                          height: "20px",
                        }}
                      />
                    </button>
                  </div>
                  <Input
                    placeholder="Search name or number"
                    className="h-10 rounded-full pl-10 border-0 leading-0 hover:ring-muted hover:ring-1 focus-visible:ring-2 focus-visible:ring-accent placeholder:text-[15px] placeholder:text-muted-foreground bg-background-secondary focus:bg-white"
                  />
                </div>
              </div>

              {/* List */}
              <ScrollArea className="flex-1">
                <div className="py-2 px-2">
                  {/* Options */}
                  <div className="px-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-14 px-4 py-8 gap-4 hover:bg-background hover:text-foreground cursor-pointer"
                    >
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-primary">
                        <GroupAddIcon />
                      </div>
                      <span className="text-base font-normal">New group</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-14 px-4 py-8 my-2 gap-4 hover:bg-background hover:text-foreground cursor-pointer"
                    >
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-primary">
                        <ContactAddIcon />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-base font-normal">
                          New contact
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-14 px-4 py-8 gap-4 hover:bg-background hover:text-foreground cursor-pointer"
                    >
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-primary">
                        <CommunitiesIcon
                          style={{ width: "28px", height: "28px" }}
                          isactive={true}
                        />
                      </div>
                      <span className="text-base font-normal">
                        New community
                      </span>
                    </Button>
                  </div>

                  {/* My Contact */}
                  <div className="mt-4 px-4 text-sm text-muted-foreground font-medium mb-2">
                    Contacts on WhatsApp
                  </div>
                  {/* Current User Contact details */}
                  <Button
                    variant="ghost"
                    className="w-full items-start justify-start h-16 px-4 gap-4 hover:bg-background hover:text-foreground cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={currentUserContact?.contact_user.profile_pic ?? undefined} />
                      <AvatarFallback>{currentUserContact?.contact_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium text-base leading-4">
                          {currentUserContact?.contact_name} (You)
                        </span>
                      <span className="text-xs text-muted-foreground">
                        Message yourself
                      </span>
                    </div>
                  </Button>

                  {/* Contact Sections */}
                  {userContacts?.map((contact) => (
                    <div key={contact.id} className="mt-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-16 px-4 gap-4 hover:bg-muted/30 hover:text-foreground cursor-pointer"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.contact_user.profile_pic ?? undefined} />
                          <AvatarFallback>
                            {contact.contact_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium text-base leading-4">
                            {contact.contact_name}
                          </span>
                          {contact.contact_user.bio && (
                            <span className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {contact.contact_user.bio}
                            </span>
                          )}
                        </div>
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
