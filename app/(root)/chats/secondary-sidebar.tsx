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
import { cn, humanizeDate, formatDuration } from "@/lib/utils";
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
import { ChatResults, ContactResults, UserSettings, User, DirectMessageChatsResults, GroupMessageChatsResults, DirectMessageChats, GroupMessageChats, DirectMessageName } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "@/components/ui/badge";
import { useTypingStore, type userTypingType } from "@/lib/stores/typing-store";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Image as ImageIcon, Video, Mic, Headphones, Ban } from "lucide-react";

import type { Chat, Contact } from "@/types";
import type { Mention } from "@/types/mentions";

// Render a recent_content preview with mention ranges styled. Mentions whose
// offset/length fall outside the (possibly-truncated) text are skipped.
const renderPreviewWithMentions = (
  text: string,
  mentions?: Mention[]
): React.ReactNode => {
  if (!mentions || mentions.length === 0) return text;
  const valid = mentions
    .filter((m) => m.offset >= 0 && m.length > 0 && m.offset + m.length <= text.length)
    .slice()
    .sort((a, b) => a.offset - b.offset);
  if (valid.length === 0) return text;

  const out: React.ReactNode[] = [];
  let cursor = 0;
  valid.forEach((m, i) => {
    if (m.offset < cursor) return;
    if (m.offset > cursor) out.push(text.slice(cursor, m.offset));
    out.push(
      <span key={`mention-${i}-${m.offset}`} className="font-bold text-accent-primary">
        {text.slice(m.offset, m.offset + m.length)}
      </span>
    );
    cursor = m.offset + m.length;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
};

// ─── Memoized: Recent content preview (files / text / deletion / voice) ────
type ChatRecentContentProps = {
  chat: Chat;
  currentUserId: string | undefined;
};

const ChatRecentContent = React.memo(function ChatRecentContent({
  chat,
  currentUserId,
}: ChatRecentContentProps) {
  const obj = chat.direct_message || chat.group_chat;
  if (!obj) return null;

  const content = obj.recent_content;
  const files = obj.recent_files;
  const type = obj.recent_message_type;
  const mentions = obj.recent_mentions;
  const isMine = currentUserId === obj.recent_user_id;
  const deleted = obj.recent_deleted;

  const visibleFiles =
    files?.filter((f) => {
      if (!f.deleted) return true;
      if (f.deleted.delete_type === "for_everyone") return false;
      if (f.deleted.delete_type === "for_me" && String(f.deleted.deleted_by) === String(currentUserId)) return false;
      return true;
    }) || [];

  const isDeletedForEveryone =
    deleted?.delete_type === "for_everyone" ||
    (!content && files && files.length > 0 && files.every((f) => f.deleted?.delete_type === "for_everyone"));


  const latestFileId = files && files.length > 0 ? files[files.length - 1].file_id : null;
  const isLatestFileDeleted = !!(deleted?.file_id && deleted.file_id === latestFileId);

  // Show deletion placeholder if:
  // 1. The deletion is for the whole message (no file_id on deleted object)
  // 2. OR the deletion specifically targets the latest file
  // 3. OR the message has no text content and all its files are effectively gone
  const showDeletedPlaceholder =
    (deleted && (!deleted.file_id || isLatestFileDeleted)) ||
    (!content && files && files.length > 0 && visibleFiles.length === 0);

  // Deletion logic for recent content
  // if delete_type is 'for_me', we don't show the placeholder here, 
  // as the sidebar should show the previous message instead.
  if (showDeletedPlaceholder && isDeletedForEveryone) {
    const deletedByMe =
      String(deleted?.deleted_by) === String(currentUserId) ||
      (files && files.some((f) => String(f.deleted?.deleted_by) === String(currentUserId)));
    return (
      <span className="flex items-center gap-1 w-full truncate italic text-muted-foreground">
        <Ban size={14} className="shrink-0" />
        <span className="truncate">
          {deletedByMe ? "You deleted this message" : "This message was deleted"}
        </span>
      </span>
    );
  }

  const voiceMessage = chat.direct_message?.recent_voice_message || chat.group_chat?.recent_voice_message;
  const voiceDuration = chat.direct_message?.recent_voice_message_duration || chat.group_chat?.recent_voice_message_duration;

  const isMessageDeleted = showDeletedPlaceholder;

  // Receipt logic
  const renderReceipt = () => {
    if (!isMine || isMessageDeleted) return null;
    if (chat.direct_message) {
      return (
        <span className="shrink-0 -mt-0.5">
          {chat.direct_message.read_date ? (
            <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" />
          ) : chat.direct_message.delivered_date ? (
            <CheckIcon2 height={18} width={18} />
          ) : (
            <CheckIcon1 height={18} width={14} />
          )}
        </span>
      );
    }
    return (
      <span className="shrink-0 relative -mt-0.5 flex items-center">
        {chat.group_chat?.receipt === "read" ? (
          <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" />
        ) : chat.group_chat?.receipt === "delivered" ? (
          <CheckIcon2 height={18} width={18} />
        ) : (
          <CheckIcon1 height={18} width={14} />
        )}
      </span>
    );
  };

  const senderPrefix = isMessageDeleted
    ? null
    : !isMine && chat.group_chat?.recent_user_display_name ? (
      <span>{chat.group_chat.recent_user_display_name}:{" "}</span>
    ) : null;

  if (voiceMessage) {
    return (
      <span className="flex items-center gap-0.5 w-full truncate">
        {renderReceipt()}
        {senderPrefix}
        <span className="flex items-center gap-0.5 truncate text-muted-foreground">
          <Mic size={16} className={cn("shrink-0")} />
          <span className="flex items-center gap-0.5">
            <span className="truncate">Voice message</span>
            {voiceDuration && <span className="shrink-0">({formatDuration(voiceDuration)})</span>}
          </span>
        </span>
      </span>
    );
  }

  if (visibleFiles.length > 0) {
    const lastFile = visibleFiles[visibleFiles.length - 1];
    const fileType = lastFile?.type || "image";
    let IconComp: any = ImageIcon;
    let label = "Photo";

    if (fileType === "video") {
      IconComp = Video;
      label = "Video";
    } else if (fileType === "voice_recording") {
      IconComp = Mic;
      label = "Voice message";
    } else if (fileType === "audio") {
      IconComp = type === "voice" ? Mic : Headphones;
      label = type === "voice" ? "Voice message" : "Audio";
    } else if (fileType !== "image") {
      IconComp = FileText;
      label = "Document";
    }

    const fileCount = visibleFiles.length;
    const isMultiple = fileCount > 1;
    const caption = isMultiple ? "" : lastFile?.caption || label;

    return (
      <span className="flex items-center gap-1 w-full truncate">
        {renderReceipt()}
        {senderPrefix}
        <span className="flex items-center gap-1 truncate text-muted-foreground">
          <IconComp size={16} className={cn("shrink-0")} />
          {isMultiple ? (
            <span className="font-medium">
              {label} {fileCount}
            </span>
          ) : (
            <span className="truncate">{caption}</span>
          )}
        </span>
      </span>
    );
  }

  const previewText: string = !content
    ? ""
    : content.length > 30
      ? `${content.slice(0, 30)}...`
      : content;

  return (
    <span className="flex items-center gap-1 w-full truncate">
      {renderReceipt()}
      {senderPrefix}
      <span className="truncate">
        {renderPreviewWithMentions(previewText, mentions)}
      </span>
    </span>
  );
});

// ─── Memoized: Full chat-item preview (typing / recording / draft / content) ──
type ChatItemPreviewProps = {
  chat: Chat;
  typingList: userTypingType[];
  recordingList: userTypingType[];
  contacts: Contact[] | undefined;
  currentUserId: string | undefined;
  activeChatId: string | null;
};

const ChatItemPreview = React.memo(function ChatItemPreview({
  chat,
  typingList,
  recordingList,
  contacts,
  currentUserId,
  activeChatId,
}: ChatItemPreviewProps) {
  const chatItemId = chat.direct_message?.id || chat.group_chat?.id;

  // ── Recording indicator (highest priority) ──────────────────
  if (recordingList.length > 0) {
    const latestRecorder = recordingList[recordingList.length - 1];
    const user = contacts?.find((contact) => contact.contact_user.id === latestRecorder.id);
    return (
      <>
        {chat.group_chat ? (
          <span className="text-[#00a884] font-normal">
            {recordingList.length > 1
              ? `${recordingList.length} people recording audio...`
              : `${user?.contact_name || latestRecorder.phone} is recording audio...`}
          </span>
        ) : (
          <span className="text-[#00a884] font-normal flex items-center gap-1">
            <Mic size={14} /> is recording audio...
          </span>
        )}
      </>
    );
  }

  // ── Typing indicator (second priority) ──────────────────
  if (typingList.length > 0) {
    const latestTyper = typingList[typingList.length - 1];
    const user = contacts?.find((contact) => contact.contact_user.id === latestTyper.id);
    return (
      <>
        {chat.group_chat ? (
          <span className="text-[#00a884] font-normal">
            {typingList.length > 1
              ? `${typingList.length} people typing...`
              : `${user?.contact_name || latestTyper.phone} is typing...`}
          </span>
        ) : (
          <span className="text-[#00a884] font-normal">is typing...</span>
        )}
      </>
    );
  }

  // ── Draft indicator ────────────────────
  if (chat.draft?.text && chatItemId !== activeChatId) {
    const isVoiceDraft = !!chat.draft.voiceBlob;
    return (
      <span className="inline-flex gap-1 items-center">
        <span className="text-[#1daa61] font-medium shrink-0">Draft:</span>
        {isVoiceDraft ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Mic size={14} className="shrink-0" />
            <span>
              {chat.draft.text.replace("🎙 ", "").length > 20
                ? `${chat.draft.text.replace("🎙 ", "").slice(0, 30)}...`
                : chat.draft.text.replace("🎙 ", "")}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            {chat.draft.text.length > 20 ? `${chat.draft.text.slice(0, 30)}...` : chat.draft.text}
          </span>
        )}
      </span>
    );
  }

  // ── Normal recent content ─────────────────────────────────
  return <ChatRecentContent chat={chat} currentUserId={currentUserId} />;
});

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
      const currentUser = await db.user.toCollection().first();
      const currentUserId = currentUser?.id;

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
      // We search for the most recent message that is NOT deleted for the current user.
      for (const chat of result) {
        const directMessageId = chat.direct_message?.id;
        const groupChatId = chat.group_chat?.id;

        const messages = groupChatId
          ? await db.groupmessagechats
            .where("groupchat_id")
            .equals(groupChatId)
            .sortBy("timestamp")
          : directMessageId
            ? await db.directmessagechats
              .where("direct_message_id")
              .equals(directMessageId)
              .sortBy("timestamp")
            : [];

        const latestMsg = messages.reverse().find((m) => {
          if (m.deleted?.delete_type === "for_me" && String(m.deleted.deleted_by) === String(currentUserId)) return false;
          // If all files are deleted for me and there's no text content
          if (!m.content && m.files && m.files.length > 0) {
            const visible = m.files.filter(f => !f.deleted || (f.deleted.delete_type !== "for_me" || String(f.deleted.deleted_by) !== String(currentUserId)));
            if (visible.length === 0) return false;
          }
          return true;
        });

        if (latestMsg) {
          if (chat.direct_message) {
            const dm = latestMsg as DirectMessageChats;
            chat.direct_message.recent_content = dm.content;
            chat.direct_message.recent_files = dm.files;
            chat.direct_message.recent_message_type = dm.type;
            chat.direct_message.recent_mentions = dm.mentions;
            chat.direct_message.recent_deleted = dm.deleted;
            chat.direct_message.recent_user_id = dm.user.id as string;
            chat.direct_message.delivered_date = dm.delivered_date || null;
            chat.direct_message.read_date = dm.read_date || null;
            chat.direct_message.recent_voice_message = dm.voice_message;
            chat.direct_message.recent_voice_message_duration = dm.voice_message_duration;
          } else if (chat.group_chat) {
            const gm = latestMsg as GroupMessageChats;
            chat.group_chat.recent_content = gm.content;
            chat.group_chat.recent_files = gm.files;
            chat.group_chat.recent_message_type = gm.type;
            chat.group_chat.recent_mentions = gm.mentions;
            chat.group_chat.recent_deleted = gm.deleted;
            chat.group_chat.recent_user_id = gm.user.id;
            chat.group_chat.recent_user_display_name = gm.user.contact_name as string,
              chat.group_chat.receipt = gm.receipt;
            chat.group_chat.recent_voice_message = gm.voice_message;
            chat.group_chat.recent_voice_message_duration = gm.voice_message_duration;
          }
        } else {
          // If no visible messages remain, clear the preview
          if (chat.direct_message) {
            chat.direct_message.recent_content = "";
            chat.direct_message.recent_files = [];
            chat.direct_message.recent_message_type = undefined;
            chat.direct_message.recent_mentions = undefined;
            // chat.direct_message.recent_deleted = undefined;
            chat.direct_message.recent_voice_message = undefined;
          } else if (chat.group_chat) {
            chat.group_chat.recent_content = "";
            chat.group_chat.recent_files = [];
            chat.group_chat.recent_message_type = undefined;
            chat.group_chat.recent_mentions = undefined;
            // chat.group_chat.recent_deleted = undefined;
            chat.group_chat.recent_voice_message = undefined;
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
  // Set of `${message_id}::${offset}` keys for mentions the user has already
  // scrolled past in any chat. Drives @-badge suppression below.
  const seenMentionKeys = useLiveQuery(async () => {
    const rows = await db.seenmentions.toArray();
    return new Set(rows.map((r) => `${r.message_id}::${r.offset}`));
  }, []) ?? new Set<string>();
  const typingChats = useTypingStore((s) => s.typingChats);
  const recordingChats = useTypingStore((s) => s.recordingChats);
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
      className="bg-sidebar-primary hidden flex-1 md:flex"
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
                  <div className="w-fit h-fit inline-flex">
                    <Button
                      variant="ghost"
                      className="w-10 h-10 rounded-full hover:bg-muted/30 hover:cursor-pointer"
                      onClick={() => setContactSheetOpen(true)}
                      suppressHydrationWarning
                    >
                      <NewChatIcon
                        style={{
                          width: "24px",
                          height: "24px",
                          color: "#000",
                        }}
                      />
                    </Button>
                  </div>
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
                    <div className="w-fit h-fit inline-flex">
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-10 h-10 rounded-full hover:bg-muted/30 hover:cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0"
                          suppressHydrationWarning
                        >
                          <MenuIcon
                            style={{
                              width: "24px",
                              height: "24px",
                              color: "#000",
                            }}
                          />
                        </Button>
                      </DropdownMenuTrigger>
                    </div>
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
                <DropdownMenuItem className="px-3 rounded-xl">
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
                    className="group flex flex-col items-start gap-2 p-3 mx-1 my-0.5 rounded-lg text-sm leading-tight whitespace-nowrap hover:bg-background-secondary hover:text-sidebar-accent-foreground"
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
                          {typeof chat.name === "string" ? chat.name : (
                            <>
                              {(chat.name as DirectMessageName).contact_name || (chat.name as DirectMessageName).display_name}
                              {(chat.name as DirectMessageName).contact_user_id && (chat.name as DirectMessageName).contact_user_id === currentUser?.id && " (You)"}
                            </>
                          )}
                        </p>
                        <div className="max-w-[370px]">
                          <p className="truncate whitespace-nowrap">
                            <ChatItemPreview
                              chat={chat}
                              typingList={(chat.direct_message?.id || chat.group_chat?.id) ? (typingChats[(chat.direct_message?.id || chat.group_chat?.id)!] ?? []) : []}
                              recordingList={(chat.direct_message?.id || chat.group_chat?.id) ? (recordingChats[(chat.direct_message?.id || chat.group_chat?.id)!] ?? []) : []}
                              contacts={contacts}
                              currentUserId={currentUser?.id}
                              activeChatId={activeChatId}
                            />
                          </p>
                        </div>
                      </div>
                      <div className="ml-auto text-xs">
                        <p>{humanizeDate(chat.timestamp, currentUser?.timezone!)}</p>
                        <div className="flex justify-end mt-2 space-x-3">
                          {chat?.isPinned && <PinIcon />}
                          {chat?.direct_message && (
                            <span className="flex items-center gap-1">
                              {chat.direct_message.unread_messages > 0 && <Badge className="w-5 h-5 bg-accent-primary">{chat.direct_message.unread_messages}</Badge>}
                            </span>

                          )}
                          {
                            chat?.group_chat && (
                              <span className="flex items-center gap-1">
                                {(chat.group_chat?.unread_messages ?? 0) > 0 && <Badge className="bg-accent-primary w-5 h-5">{chat.group_chat?.unread_messages}</Badge>}
                                {(chat.group_chat?.unread_messages ?? 0) > 0 && chat.group_chat?.recent_mentions?.some(m =>
                                  ((m.mention_type === 'user' && m.member?.user_id === currentUser?.id) || m.mention_type === "all") &&
                                  !seenMentionKeys.has(`${chat.group_chat?.recent_content_id}::${m.offset}`)
                                ) && (
                                  <Badge className="bg-accent-primary w-5 h-5">@</Badge>
                                )}
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
