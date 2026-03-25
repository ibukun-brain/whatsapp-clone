"use client";
import React from "react";

import {
  ApplockIcon,
  CancelIcon,
  ChatsIcon,
  CheckBoxIcon,
  CheckIcon1,
  CheckIcon2,
  ChevronIcon,
  CreateGroupIcon,
  LogoutIcon,
  MenuIcon,
  NewChatIcon,
  PinIcon,
  SearchIcon,
  StarIcon,
  WhatsappSVG,
} from "@/components/icons/chats-icon";
import { ContactSheet } from "@/components/contact-sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, humanizeDate } from "@/lib/utils";
import { Button } from "../../../components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
// This is sample data
import { chatCategories } from "@/lib/utils";

import { db } from "@/lib/indexdb";
import { axiosInstance } from "@/lib/axios";
import { useAuthStore } from "@/lib/providers/auth-store-provider";
import { ChatResults, ContactResults, UserSettings, User, DirectMessageChatsResults, GroupMessageChatsResults } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "@/components/ui/badge";
import { useTypingStore } from "@/lib/stores/typing-store";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Image as ImageIcon, Video, Mic, Headphones } from "lucide-react";

export const SecondarySidebar = () => {
  const hasFetched = React.useRef(false);
  const [contactSheetOpen, setContactSheetOpen] = React.useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  // Derive active chat id from the URL so we can suppress the Draft
  // label while the user is still inside that chat.
  const pathname = usePathname();
  const activeChatId = pathname?.split("/chats/")[1] ?? null;

  // Determine if the active chat was a draft when we entered it and its recency.
  // This ensures the sorting stays "sticky" while you are working.
  const [activeChatLatchedDraft, setActiveChatLatchedDraft] = React.useState(false);
  const [activeChatLatchedDraftTime, setActiveChatLatchedDraftTime] = React.useState<number>(0);

  React.useEffect(() => {
    if (activeChatId) {
      db.chatlist.filter(c => (c.direct_message?.id === activeChatId || c.group_chat?.id === activeChatId))
        .first()
        .then(chat => {
          if (chat) {
            setActiveChatLatchedDraft(!!chat.draft?.text);
            const draftTime = chat.draft?.timestamp ? new Date(chat.draft.timestamp).getTime() : 0;
            setActiveChatLatchedDraftTime(draftTime);
          }
        });
    } else {
      setActiveChatLatchedDraft(false);
      setActiveChatLatchedDraftTime(0);
    }
  }, [activeChatId]);

  const chatlist = useLiveQuery(
    async () => {
      // 1. Fetch all chats that have a draft (ensures they jump to top even if old)
      const draftChats = await db.chatlist.filter(c => !!c.draft?.text).toArray();
      const draftIds = new Set(draftChats.map(c => c.id));

      // 2. Fetch the recent chats (limit-based)
      const recentChats = await db.chatlist
        .orderBy("timestamp")
        .reverse()
        .limit(page * pageSize)
        .toArray();

      // 3. Merge and deduplicate
      const combined = [...draftChats];
      for (const chat of recentChats) {
        if (!draftIds.has(chat.id)) {
          combined.push(chat);
        }
      }

      // 4. Multi-level sort: Pinned > Drafts > Recency
      const result = combined.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

        const idA = a.direct_message?.id || a.group_chat?.id;
        const idB = b.direct_message?.id || b.group_chat?.id;

        // Recency Logic (Locked ONLY for draft time while active)
        const msgTimeA = new Date(a.timestamp).getTime();
        const rawDraftTimeA = a.draft?.timestamp ? new Date(a.draft.timestamp).getTime() : 0;
        const draftTimeA = (idA === activeChatId) ? activeChatLatchedDraftTime : rawDraftTimeA;
        const timeA = Math.max(msgTimeA, draftTimeA);

        const msgTimeB = new Date(b.timestamp).getTime();
        const rawDraftTimeB = b.draft?.timestamp ? new Date(b.draft.timestamp).getTime() : 0;
        const draftTimeB = (idB === activeChatId) ? activeChatLatchedDraftTime : rawDraftTimeB;
        const timeB = Math.max(msgTimeB, draftTimeB);

        return timeB - timeA;
      });

      // 5. Enhance with latest message info (join with message tables)
      for (const chat of result) {
        const lastMsgId = chat.direct_message?.recent_content_id || chat.group_chat?.recent_content_id;
        if (lastMsgId) {
          const lastMsg = chat.group_chat
            ? await db.groupmessagechats.get(lastMsgId)
            : await db.directmessagechats.get(lastMsgId);

          if (lastMsg) {
            if (chat.direct_message) {
              chat.direct_message.recent_files = lastMsg.files;
              chat.direct_message.recent_message_type = lastMsg.type;
            } else if (chat.group_chat) {
              chat.group_chat.recent_files = lastMsg.files;
              chat.group_chat.recent_message_type = lastMsg.type;
            }
          }
        }
      }

      return result;
    },
    [page, activeChatId, activeChatLatchedDraft, activeChatLatchedDraftTime]
  );
  const currentUser = useLiveQuery(
    async () => await db.user.toCollection().first()
  );
  const contacts = useLiveQuery(
    async () => await db.contact.toArray()
  );
  const typingChats = useTypingStore((s) => s.typingChats);
  React.useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;

      // Prevent duplicate fetches
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        // remember to refactor and use transaction 
        const [chatsRes, User, contactsRes, settingsRes, DirectMessagesChatRes, GroupMessagesChatRes] = await Promise.all([
          axiosInstance.get<ChatResults>("/chats/"),
          axiosInstance.get<User>("/users/me"),
          axiosInstance.get<ContactResults>("/contacts/"),
          axiosInstance.get<Omit<UserSettings, "id">>("/users/usersettings/"),
          axiosInstance.get<DirectMessageChatsResults>("/directmessages/"),
          axiosInstance.get<GroupMessageChatsResults>("/groups/all-messages/"),
        ]);

        // Store and Update User
        // We force ID 1 for singleton settings
        if (User.data) {
          await db.user.put({
            ...User.data,
          });
        }

        // Store DirectMessages Chats
        if (DirectMessagesChatRes.data.results.length > 0 && Array.isArray(DirectMessagesChatRes.data.results)) {
          await db.directmessagechats.bulkPut(DirectMessagesChatRes.data.results);
        }

        // Store GroupMessages Chats
        if (GroupMessagesChatRes.data.results.length > 0 && Array.isArray(GroupMessagesChatRes.data.results)) {
          await db.groupmessagechats.bulkPut(GroupMessagesChatRes.data.results);
        }



        // Store Chat List - Non-destructive merge to preserve local metadata (drafts, pins)
        if (chatsRes.data.results.length > 0 && Array.isArray(chatsRes.data.results)) {
          const existingChats = await db.chatlist.toArray();
          const mergedChats = chatsRes.data.results.map((remoteChat: any) => {
            const localChat = existingChats.find((c) => c.id === remoteChat.id);
            return {
              ...localChat,
              ...remoteChat,
              // Preserve local fields if they exist
              draft: localChat?.draft || null,
              isPinned: localChat?.isPinned || false,
            };
          });
          await db.chatlist.bulkPut(mergedChats);
        }


        // Store User Settings
        // We force ID 1 for singleton settings
        if (settingsRes.data) {
          await db.usersettings.put({
            id: 1,
            ...settingsRes.data,
          });
        }

        // Store Contact List
        // Clear existing data and use bulkPut to ensure fresh data
        if (contactsRes.data.results.length > 0 && Array.isArray(contactsRes.data.results)) {
          await db.contact.clear();
          await db.contact.bulkPut(contactsRes.data.results);
        }

      } catch (error) {
        console.error("Failed to fetch initial data", error);
        hasFetched.current = false; // Allow retry on error
      }
    };

    fetchData();
  }, [isAuthenticated]);


  return (
    <Sidebar
      collapsible="none"
      className="bg-sidebar-primary hidden flex-1 md:flex "
    >
      <SidebarHeader className="gap-3 px-5 pt-3 pb-0">
        <div className="flex w-full items-center justify-between">
          <div className="text-accent-primary">
            <WhatsappSVG className="h-7 w-26" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-10 h-10 rounded-full hover:bg-muted/30  hover:cursor-pointer"
                    onClick={() => setContactSheetOpen(true)}
                  >
                    <div>
                      <NewChatIcon
                        style={{
                          width: "24px",
                          height: "24px",
                          color: "#000",
                        }}
                      />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-white border-none">
                  <p>
                    New chat
                    <span className="text-gray-400"> Ctrl+Alt+N</span>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ContactSheet
              open={contactSheetOpen}
              contacts={contacts}
              currentUserid={currentUser?.id}
              onOpenChange={setContactSheetOpen}
            />
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-10 h-10 rounded-full hover:bg-muted/30 hover:cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0"
                      >
                        <div>
                          <MenuIcon
                            style={{
                              width: "24px",
                              height: "24px",
                              color: "#000",
                            }}
                          />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Menu</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                align="start"
                className="text-secondary-foreground cursor-pointer w-[180px]"
              >
                <DropdownMenuItem className="px-3 rounded-xl]">
                  <CreateGroupIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>New group</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-3 rounded-xl">
                  <StarIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Starred messages</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-3 rounded-xl">
                  <CheckBoxIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Select chats</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-3 rounded-xl">
                  <ChatsIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Mark all as read</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="px-3 rounded-xl">
                  <ApplockIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>App lock</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="px-3 rounded-xl"
                >
                  <LogoutIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
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
          <SidebarInput
            placeholder="Ask Meta AI or Search"
            className="h-10 rounded-full border-0 pl-10 hover:ring-2 hover:ring-muted focus-visible:ring-2 focus-visible:ring-accent-primary placeholder:text-[15px] placeholder:text-muted-foreground bg-background-secondary focus:bg-white"
          />
        </div>
        <div className="chat-category flex flex-row space-x-2">
          {chatCategories.map((category) => (
            <div
              className={cn(
                "rounded-full border py-1 px-3 text-sm font-semibold text-muted-foreground hover:bg-background-secondary cursor-pointer",
                category.isActive &&
                "text-accent-foreground bg-accent-secondary hover:bg-accent-secondary/80",
              )}
              key={category.title}
            >
              {category.title}
            </div>
          ))}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <AnimatePresence mode="popLayout">
              {chatlist?.map((chat) => (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { duration: 0.4, type: "spring", bounce: 0.2 },
                    opacity: { duration: 0.2 }
                  }}
                >
                  <Link
                    href={`/chats/${chat.direct_message?.id || chat.group_chat?.id}`}
                    key={chat.id}
                    className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 p-3 text-sm leading-tight whitespace-nowrap last:border-b-0"
                  >
                    <div className="flex w-full gap-3">
                      <div>
                        <Avatar className="h-[49px] w-[49px] border">
                          <AvatarImage src={chat.group_chat?.image ?? chat.direct_message?.image ?? undefined} />
                          {/* TODO: use a better icon for fallback */}
                          <AvatarFallback>MA</AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <p className="text-secondary-foreground text-base">
                          {typeof chat.name === "string" ? chat.name : (chat.name?.contact_name || chat.name?.display_name)}
                        </p>
                        <div className="max-w-[370px]">
                          <p className="truncate whitespace-nowrap">
                            {(() => {
                              const chatItemId = chat.direct_message?.id || chat.group_chat?.id;
                              const typingList = chatItemId ? (typingChats[chatItemId] ?? []) : [];

                              // ── Typing indicator (highest priority) ──────────────────
                              if (typingList.length > 0) {
                                const latestTyper = typingList[typingList.length - 1];
                                const user = contacts?.find((contact) => contact.contact_user.id === latestTyper.id);
                                return (
                                  <>
                                    {chat.group_chat ? <span className="text-[#00a884] font-normal">{typingList.length > 1 ? `${typingList.length} people typing...` : user?.contact_name || latestTyper.phone} is typing...</span> : <span className="text-[#00a884] font-normal">typing...</span>}

                                  </>);
                              }

                              // ── Draft indicator (second priority) ────────────────────
                              if (chat.draft?.text && chatItemId !== activeChatId) {
                                return (
                                  <span className="inline-flex gap-1 items-baseline">
                                    <span className="text-[#1daa61] font-medium shrink-0">Draft:</span>
                                    <span className="truncate text-muted-foreground">{chat.draft.text}</span>
                                  </span>
                                );
                              }

                              // ── Normal recent content ─────────────────────────────────
                              return (
                                <>
                                  {(() => {
                                    const obj = chat.direct_message || chat.group_chat;
                                    if (!obj) return null;

                                    const content = obj.recent_content;
                                    const files = obj.recent_files;
                                    const type = obj.recent_message_type;
                                    const isMine = currentUser?.id === obj.recent_user_id;

                                    // Receipt logic
                                    const renderReceipt = () => {
                                      if (!isMine) return null;
                                      if (chat.direct_message) {
                                        return (
                                          <span className="shrink-0 -mt-0.5">
                                            {chat.direct_message.read_date ? <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" /> : chat.direct_message.delivered_date ? <CheckIcon2 height={18} width={18} /> : <CheckIcon1 height={18} width={14} />}
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="shrink-0 relative -mt-0.5 flex items-center">
                                          {chat.group_chat?.receipt === "read" ? <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" /> : chat.group_chat?.receipt === "delivered" ? <CheckIcon2 height={18} width={18} /> : <CheckIcon1 height={18} width={14} />}
                                        </span>
                                      );
                                    };

                                    const senderPrefix = !isMine && chat.group_chat?.recent_user_display_name ? <span>{chat.group_chat.recent_user_display_name}:{" "}</span> : isMine && chat.group_chat ? <span>You:{" "}</span> : null;

                                    if (files && files.length > 0) {
                                      const lastFile = files[files.length - 1];
                                      const fileType = lastFile.type;
                                      let IconComp: any = ImageIcon;
                                      let label = "Photo";

                                      if (fileType === 'video') {
                                        IconComp = Video;
                                        label = "Video";
                                      } else if (fileType === 'audio') {
                                        IconComp = type === 'voice' ? Mic : Headphones;
                                        label = type === 'voice' ? "Voice message" : "Audio";
                                      } else if (fileType !== 'image') {
                                        IconComp = FileText;
                                        label = "Document";
                                      }

                                      const fileCount = files.length;
                                      const caption = lastFile.caption || label;

                                      return (
                                        <span className="flex items-center gap-1 w-full truncate">
                                          {renderReceipt()}
                                          {senderPrefix}
                                          <span className="flex items-center gap-1 truncate">
                                            <IconComp size={16} className={cn("shrink-0")} />
                                            <span className="truncate">{caption}</span>
                                            {fileCount > 1 && <span className="font-medium ml-0.5">{fileCount}</span>}
                                          </span>
                                        </span>
                                      );
                                    }

                                    return (
                                      <span className="flex items-center gap-1 w-full truncate">
                                        {renderReceipt()}
                                        {senderPrefix}
                                        <span className="truncate">{content}</span>
                                      </span>
                                    );
                                  })()}
                                </>
                              );
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="ml-auto text-xs">
                        <p>{humanizeDate(chat.timestamp, currentUser?.timezone!)}</p>
                        <div className="flex justify-end mt-2 space-x-3">
                          {chat?.isPinned && <PinIcon />}
                          {chat?.direct_message && (
                            <span>
                              {chat.direct_message.unread_messages > 0 && <Badge className="bg-accent-primary -mr-2">{chat.direct_message.unread_messages}</Badge>}
                            </span>

                          )}
                          {
                            chat?.group_chat && (
                              <span>
                                {(chat.group_chat?.unread_messages ?? 0) > 0 && <Badge className="bg-accent-primary -mr-2">{chat.group_chat?.unread_messages}</Badge>}
                              </span>
                            )}
                          <div className="hidden group-hover:flex">
                            <ChevronIcon className="opacity-0 transition-opacity ease-in-out duration-200 group-hover:opacity-100" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
