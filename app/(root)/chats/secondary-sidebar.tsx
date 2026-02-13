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

export const SecondarySidebar = () => {
  const [contactSheetOpen, setContactSheetOpen] = React.useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const hasFetched = React.useRef(false);

  const chatlist = useLiveQuery(
    () => db.chatlist.orderBy("timestamp").reverse().limit(page * pageSize).toArray(),
    [page]
  );
  const currentUser = useLiveQuery(
    async () => await db.user.toCollection().first()
  );
  const contacts = useLiveQuery(
    async () => await db.contact.toArray()
  );
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
          axiosInstance.get<GroupMessageChatsResults>("/groups/all-chats/"),
        ]);

        // Store and Update User
        // We force ID 1 for singleton settings
        if (User.data) {
          await db.user.put({
            ...User.data,
          });
        }

        // Store DirectMessages Chats
        // Clear existing data and use bulkPut to ensure fresh data
        if (DirectMessagesChatRes.data.results.length > 0 && Array.isArray(DirectMessagesChatRes.data.results)) {
          await db.directmessagechats.clear();
          await db.directmessagechats.bulkPut(DirectMessagesChatRes.data.results);
        }

        // Store GroupMessages Chats
        // Clear existing data and use bulkPut to ensure fresh data
        if (GroupMessagesChatRes.data.results.length > 0 && Array.isArray(GroupMessagesChatRes.data.results)) {
          await db.groupmessagechats.clear();
          await db.groupmessagechats.bulkPut(GroupMessagesChatRes.data.results);
        }



        // Store Chat List
        // Clear existing data and use bulkPut to ensure fresh data
        if (chatsRes.data.results.length > 0 && Array.isArray(chatsRes.data.results)) {
          await db.chatlist.clear();
          await db.chatlist.bulkPut(chatsRes.data.results);
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
            {chatlist?.map((chat) => (
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
                        {chat.direct_message && chat.group_chat === null && (currentUser?.id === chat.direct_message.recent_user_id ? (
                          <span className="inline-flex space-x-1">
                            <span>
                              {chat.direct_message.read_date ? <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" /> : chat.direct_message.delivered_date && !chat.direct_message.read_date ? <CheckIcon2 height={18} width={18} /> : <CheckIcon1 height={18} width={14} />}
                            </span>
                            <span>{chat.direct_message?.recent_content}</span>
                          </span>
                        )
                          : (<span>{chat.direct_message?.recent_content}</span>)
                        )}
                        {chat.group_chat && chat.direct_message === null && (
                          <>
                            {chat.group_chat.recent_content && (
                              <>
                                {currentUser?.id === chat.group_chat.recent_user_id ? <span>You:{" "}</span> : (<span>{chat.group_chat.recent_user_display_name}:{" "}</span>)}
                                <span>{chat.group_chat.recent_content}</span>
                              </>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto text-xs">
                    <p>{humanizeDate(chat.timestamp)}</p>
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
                            {chat.group_chat?.unread_messages > 0 && <Badge className="bg-accent-primary -mr-2">{chat.group_chat.unread_messages}</Badge>}
                          </span>
                        )}
                      <div className="hidden group-hover:block">
                        <ChevronIcon className="opacity-0 transition-opacity ease-in-out duration-200 group-hover:opacity-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar >
  );
};
