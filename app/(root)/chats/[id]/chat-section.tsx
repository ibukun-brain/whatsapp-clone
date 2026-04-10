"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import {
    MicrophoneIcon,
    EmojiIcon,
    AttachmentPlusIcon,
    SendIcon,
} from "@/components/icons/chats-icon";
import { FileText, Image as ImageIcon, Camera, Headphones, User as UserIcon, BarChart2, Calendar, StickyNote, X, Trash2, Mic } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarInset } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";
import { formatDatetime, getDateLabel, getDateTimeByTimezone, formatDuration } from "@/lib/utils";
import ChatHeader from "./chat-header";
import { DirectMessageName, GroupMember, GroupMemberResults, GroupChatDetail, DMGroupsInCommon, DMGroupsInCommonResults, DirectMessageChats, GroupMessageChats, User, Chat, GroupMessageChatRecipients, WSData } from "@/types";
import { MediaFile } from "@/types/mediaTypes";
import MessageBubble from "./message-bubble";
import ContactInfo from "./contact-info";
import { axiosInstance } from "@/lib/axios";
import { useTypingStore, EMPTY_TYPING } from "@/lib/stores/typing-store";
import { useGlobalWsStore } from "@/lib/stores/global-ws-store";
import { useVoicePlaybackStore } from "@/lib/stores/voice-playback-store";
import { useScrollManager } from "@/hooks/use-scroll-manager";
import { CheckIcon2 as CheckIcon2_ } from "@/components/icons/chats-icon";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import FileUploadPreview from "./file-upload-preview";
import PhotoVideoUploadPreview from "./photo-video-upload-preview";
import AudioUploadPreview from "./audio-upload-preview";
import { VoiceRecorder } from "./voice-recorder";
import { ContactSelectModal } from "./contact-select-modal";
import { Contact } from "@/types";
import { toast } from "sonner";
import { useMediaUpload } from "@/hooks/use-media-upload";

import {
    AlertDialog,
    AlertDialogDescription,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { file } from "zod";


// ─── Sub-components ────────────────────────────────────────────────

const DateSeparator = React.memo(({ label }: { label: string }) => (
    <div className="flex justify-center my-3 text-center">
        <span className="bg-white text-[#54656f] text-[12.5px] px-3 py-1.5 rounded-lg shadow-sm">
            {label}
        </span>
    </div>
));
DateSeparator.displayName = "DateSeparator";

const UnreadBanner = React.memo(React.forwardRef<HTMLDivElement, { count: number }>(({ count }, ref) => (
    <div ref={ref} className="flex justify-center my-3 bg-background-secondary py-1.5">
        <span className="bg-background text-[12.5px] px-3 py-1.5 rounded-full shadow-sm">
            {count} unread {count === 1 ? 'message' : 'messages'}
        </span>
    </div>
)));
UnreadBanner.displayName = "UnreadBanner";



// ─── Main Component ───────────────────────────────────────────────

// Stable empty array — re-exported from the store to avoid per-render allocation
const EMPTY_TYPING_SET = EMPTY_TYPING;

/**
 * Groups consecutive media-only messages from the same user if sent within 5 minutes,
 * provided the resulting group has more than 2 visual media items.
 */
const groupMediaMessages = (messages: any[]) => {
    if (!messages.length) return [];

    const processed: any[] = [];
    let i = 0;

    while (i < messages.length) {
        const msg = messages[i];
        // Only consider for grouping if it's purely visual media (no text content)
        // Groups ONLY if messages are consecutive media-only. Any message with text breaks the chain.
        const isMediaOnly = (m: any) =>
            m.files &&
            m.files.length > 0 &&
            (!m.content || m.content.trim() === "") &&
            m.files.every((f: any) => f.type === 'image' || f.type === 'video');

        if (!isMediaOnly(msg)) {
            processed.push(msg);
            i++;
            continue;
        }

        const group: any[] = [msg];
        let j = i + 1;
        const msgUserId = (m: any) => typeof m.user === 'object' && m.user !== null ? (m.user as User).id : (m.user as unknown as string);
        const firstUserId = msgUserId(msg);

        while (j < messages.length) {
            const nextMsg = messages[j];
            const nextUserId = msgUserId(nextMsg);
            const timeDiff = new Date(nextMsg.timestamp).getTime() - new Date(messages[j - 1].timestamp).getTime();

            if (isMediaOnly(nextMsg) && nextUserId === firstUserId && timeDiff <= 5 * 60 * 1000) {
                group.push(nextMsg);
                j++;
            } else {
                break;
            }
        }

        const totalVisuals = group.reduce((acc, m) => acc + m.files.length, 0);

        if (group.length > 1 && totalVisuals > 2) {
            // Merge files into a single synthetic message bubble
            processed.push({
                ...group[0],
                files: group.flatMap(m => m.files),
                groupedIds: group.map(m => m.id), // Store original IDs for reference
            });
            i = j;
        } else {
            // Keep as separate messages
            processed.push(msg);
            i++;
        }
    }
    return processed;
};

const ChatSection = ({ chatId }: { chatId: string }) => {
    const directMessage = useLiveQuery(async () => await db.chatlist.filter(chat => chat.direct_message?.id === chatId).first(), [chatId])
    const groupMessage = useLiveQuery(async () => await db.chatlist.filter(chat => chat.group_chat?.id === chatId).first(), [chatId])
    const _currentUser = useLiveQuery(
        async () => await db.user.toCollection().first()
    );
    const currentUser = React.useMemo(() => _currentUser, [_currentUser?.id, _currentUser?.display_name, _currentUser?.phone]);
    const directMessageChats = useLiveQuery(
        () => db.directmessagechats.where('direct_message_id').equals(chatId).sortBy('timestamp'),
        [chatId]
    );
    const groupMessageChats = useLiveQuery(
        () => db.groupmessagechats.where('groupchat_id').equals(chatId).sortBy('timestamp'),
        [chatId]
    );

    const [isInfoOpen, setIsInfoOpen] = React.useState(false);
    const [messageInfoMsg, setMessageInfoMsg] = React.useState<GroupMessageChats | null>(null);
    const [groupMembers, setGroupMembers] = React.useState<GroupMember[]>([])
    const [groupInfo, setGroupInfo] = React.useState<GroupChatDetail>()
    const [dmGroupsInCommon, setDmGroupsInCommon] = React.useState<DMGroupsInCommon[]>([])
    const [hasText, setHasText] = React.useState(false);
    const [localOptimisticMessages, setLocalOptimisticMessages] = React.useState<(DirectMessageChats | GroupMessageChats)[]>([]);
    const { upload: uploadMediaFiles } = useMediaUpload(chatId);

    // ── Upload ────────────────────────────────────────────────────────
    const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

    // Media (Photos & Videos) state
    const [pendingMedia, setPendingMedia] = React.useState<File[]>([]);
    const [isMediaPreviewOpen, setIsMediaPreviewOpen] = React.useState(false);
    const [pendingAudio, setPendingAudio] = React.useState<File[]>([]);
    const [isAudioPreviewOpen, setIsAudioPreviewOpen] = React.useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);

    // ── Selection Mode ─────────────────────────────────────────────────
    const [isSelectionMode, setIsSelectionMode] = React.useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = React.useState<Set<string>>(new Set());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);


    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    // ── Voice Recording ──────────────────────────────────────────────
    const [isRecording, setIsRecording] = React.useState(false);
    const [voiceDraftBlob, setVoiceDraftBlob] = React.useState<Blob | undefined>(undefined);
    const [voiceDraftDuration, setVoiceDraftDuration] = React.useState<number>(0);
    const [voiceDraftMimeType, setVoiceDraftMimeType] = React.useState<string>('');


    // ── Draft ─────────────────────────────────────────────────────────
    // Debounce ref: saves draft to IndexedDB 400 ms after the user stops typing.
    const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Mirror refs so the unmount cleanup can read the latest values synchronously.
    const currentInputValueRef = useRef("");
    const chatItemIdRef = useRef<string | undefined>(undefined);
    // Tracks which chatId has already had its draft restored — prevents
    // re-populating the input on every chatItem update (e.g. during typing saves).
    const draftRestoredForRef = useRef<string | null>(null);

    // ── Determine chat type ──────────────────────────────────────────
    const chatType = groupMessage ? "groupchat" : directMessage ? "directmessage" : null;

    // ── WebSocket (per-chat) ──────────────────────────────────────────
    // Handles send / edit / delete / reply for THIS chat only.
    // Reconnects automatically when chatId changes.
    const CHAT_WS_URL = `ws://localhost:8000/ws/chats/${chatId}/`;
    const { sendJsonMessage: sendChatMessage, lastJsonMessage: lastChatMessage, readyState } = useWebSocket(CHAT_WS_URL, {
        shouldReconnect: () => true,
        share: true,
    });

    // ── Global WS send (typing indicators) ───────────────────────────
    // sendJsonMessage on the global ws/chats/ socket lives in GlobalWsProvider.
    // We grab the stable reference from the store.
    const globalSendMessage = useGlobalWsStore((s) => s.sendMessage);

    // Array of users currently typing in this chat.
    const typingUsers = useTypingStore((s) => s.typingChats[chatId] ?? EMPTY_TYPING_SET);
    // Array of users currently recording in this chat.
    const recordingUsers = useTypingStore((s) => s.recordingChats[chatId] ?? EMPTY_TYPING_SET);


    const messageDeliveredRecipients = useLiveQuery<GroupMessageChatRecipients[]>(
        () => {
            if (!messageInfoMsg) return [];
            return db.groupmessagechatrecipients
                .where("message_id")
                .equals(messageInfoMsg.id)
                .and(r => r.receipt === "delivered")
                .toArray();
        },
        [messageInfoMsg?.id]
    );

    const messageReadRecipients = useLiveQuery<GroupMessageChatRecipients[]>(
        () => {
            if (!messageInfoMsg) return [];
            return db.groupmessagechatrecipients
                .where("message_id")
                .equals(messageInfoMsg.id)
                .and(r => r.receipt === "read")
                .toArray();
        },
        [messageInfoMsg?.id]
    );

    // ── Unread Messages Hook ─────────────────────────────────────────
    const chatItem = directMessage ?? groupMessage;
    const externalUnreadCount = chatType === "groupchat"
        ? chatItem?.group_chat?.unread_messages
        : chatItem?.direct_message?.unread_messages;

    const {
        unreadState,
        scrollToFirstUnread,
        bannerRef: unreadBannerRef,
        isUnreadBannerVisible,
    } = useUnreadMessages({
        chatId,
        currentUserId: currentUser?.id,
        chatType: chatType as "directmessage" | "groupchat",
        externalUnreadCount,
    });

    // ── Memoized Message Processing ─────────────────────────────────
    const processedDirectMessages = useMemo(() => {
        if (chatType !== "directmessage") return [];
        const dbMessages = directMessageChats || [];
        const combined = [...dbMessages];

        localOptimisticMessages.forEach(optMsg => {
            if ('direct_message_id' in optMsg && optMsg.direct_message_id === chatId) {
                const exists = dbMessages.some(m => m.client_msg_id === optMsg.client_msg_id);
                if (!exists) combined.push(optMsg as DirectMessageChats);
            }
        });

        combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Deduplicate by client_msg_id to prevent key collisions
        const seenClientIds = new Set();
        const unique = combined.filter(m => {
            if (!m.client_msg_id) return true;
            if (seenClientIds.has(m.client_msg_id)) return false;
            seenClientIds.add(m.client_msg_id);
            return true;
        });

        const filtered = unique.filter(m => {
            if (m.deleted && m.deleted.delete_type === "for_me" && String(m.deleted.deleted_by) === String(currentUser?.id)) return false;

            // If all files are deleted 'for me' and there's no text content, hide the message entirely
            if (m.files && m.files.length > 0 && !m.content) {
                const allDoneForMe = m.files.every(f => f.deleted && f.deleted.delete_type === "for_me" && String(f.deleted.deleted_by) === String(currentUser?.id));
                if (allDoneForMe) return false;
            }

            return true;
        });

        return groupMediaMessages(filtered);
    }, [directMessageChats, localOptimisticMessages, chatId, chatType, currentUser?.id]);

    const processedGroupMessages = useMemo(() => {
        if (chatType !== "groupchat") return [];
        const dbMessages = groupMessageChats || [];
        const combined = [...dbMessages];

        localOptimisticMessages.forEach(optMsg => {
            if ('groupchat_id' in optMsg && optMsg.groupchat_id === chatId) {
                const exists = dbMessages.some(m => m.client_msg_id === optMsg.client_msg_id);
                if (!exists) combined.push(optMsg as GroupMessageChats);
            }
        });

        combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Deduplicate by client_msg_id to prevent key collisions
        const seenClientIds = new Set();
        const unique = combined.filter(m => {
            if (!m.client_msg_id) return true;
            if (seenClientIds.has(m.client_msg_id)) return false;
            seenClientIds.add(m.client_msg_id);
            return true;
        });

        const filtered = unique.filter(m => {
            if (m.deleted && m.deleted.delete_type === "for_me" && String(m.deleted.deleted_by) === String(currentUser?.id)) return false;

            // If all files are deleted 'for me' and there's no text content, hide the message entirely
            if (m.files && m.files.length > 0 && !m.content) {
                const allDoneForMe = m.files.every(f => f.deleted && f.deleted.delete_type === "for_me" && String(f.deleted.deleted_by) === String(currentUser?.id));
                if (allDoneForMe) return false;
            }

            return true;
        });

        return groupMediaMessages(filtered);
    }, [groupMessageChats, localOptimisticMessages, chatId, chatType, currentUser?.id]);

    // -- Stable allVisualMedia computation --
    const allVisualMediaRaw = useMemo(() => {
        const messages = chatType === "groupchat" ? processedGroupMessages : processedDirectMessages;
        if (!currentUser) return [];

        return messages
            .filter(m => {
                if (!m.deleted) return true;
                if (m.deleted.delete_type === "for_everyone") return false;
                if (m.deleted.delete_type === "for_me" && m.deleted.deleted_by === currentUser.id) return false;
                return true;
            })
            .flatMap(m => m.files || [])
            .filter(f => f.type === 'image' || f.type === 'video' || f.type === 'audio' || f.type === 'voice_recording')
            .filter(f => {
                if (!f.deleted) return true;
                if (f.deleted.delete_type === "for_everyone") return false;
                if (f.deleted.delete_type === "for_me" && String(f.deleted.deleted_by) === String(currentUser.id)) return false;
                return true;
            });
    }, [processedDirectMessages, processedGroupMessages, chatType, currentUser]);

    // use a ref to maintain stability of the allVisualMedia identity if the content hasn't changed
    const allVisualMediaRef = useRef(allVisualMediaRaw);
    const allVisualMedia = useMemo(() => {
        const isSame = allVisualMediaRef.current.length === allVisualMediaRaw.length &&
            allVisualMediaRef.current.every((f, i) => f.file_id === allVisualMediaRaw[i].file_id && f.status === allVisualMediaRaw[i].status && JSON.stringify(f.deleted) === JSON.stringify(allVisualMediaRaw[i].deleted));

        if (!isSame) {
            allVisualMediaRef.current = allVisualMediaRaw;
        }
        return allVisualMediaRef.current;
    }, [allVisualMediaRaw]);

    const setActiveAudioId = useVoicePlaybackStore((s) => s.setActiveAudioId);

    // use a ref for messages to keep handlePlayNext stable
    const messagesForPlayNextRef = useRef<any[]>([]);
    useEffect(() => {
        messagesForPlayNextRef.current = chatType === 'groupchat' ? processedGroupMessages : processedDirectMessages;
    }, [processedGroupMessages, processedDirectMessages, chatType]);

    const handlePlayNext = useCallback((currentMsgId: string) => {
        const messages = messagesForPlayNextRef.current;
        const currentIndex = messages.findIndex(m => m.id === currentMsgId);
        if (currentIndex === -1) return;

        // Find the next voice message
        const nextVoiceMsg = messages.slice(currentIndex + 1).find(m => m.voice_message);
        if (nextVoiceMsg) {
            setActiveAudioId(nextVoiceMsg.id);
        }
    }, [setActiveAudioId]);

    // ── Selection Mode Handlers ───────────────────────────────────────
    const handleEnterSelectionMode = useCallback((msgId: string) => {
        setIsSelectionMode(true);
        setSelectedMessageIds(new Set([msgId]));
    }, []);

    const handleToggleSelect = useCallback((msgId: string) => {
        const idsToToggle = [msgId];

        setSelectedMessageIds(prev => {
            const next = new Set(prev);
            const allSelected = idsToToggle.every(i => next.has(i));

            if (allSelected) {
                idsToToggle.forEach(i => next.delete(i));
            } else {
                idsToToggle.forEach(i => next.add(i));
            }

            if (next.size === 0) {
                setIsSelectionMode(false);
            }
            return next;
        });
    }, []);

    const handleExitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
    }, []);

    const handleDeleteSelected = useCallback(() => {
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmDeleteForMe = useCallback((idsOverride?: Set<string>) => {
        if (!currentUser) return;

        const ids = idsOverride || selectedMessageIds;
        const selectedArr = Array.from(ids);
        const messageIds = selectedArr.filter(id => !id.includes(":"));
        const fileSelections = selectedArr
            .filter(id => id.includes(":"))
            .map(id => {
                const [mId, fId] = id.split(":");
                return { message_id: mId, file_id: fId };
            });


        // ── Optimistic DB updates ──────────────────────────────────────
        const isDM = chatType === "directmessage";
        const table = isDM ? db.directmessagechats : db.groupmessagechats;
        const chatItem = isDM ? directMessage : groupMessage;
        const chatObj = isDM ? chatItem?.direct_message : chatItem?.group_chat;
        const recentContentId = chatObj?.recent_content_id;

        // 1. Mark full messages as deleted in message table
        for (const mId of messageIds) {
            table.update(mId, {
                deleted: { message_id: mId, delete_type: "for_me", deleted_by: currentUser.id }
            });
        }

        // 2. Mark individual files as deleted in message table
        for (const { message_id, file_id } of fileSelections) {
            table.get(message_id).then(msg => {
                if (msg?.files) {
                    const updatedFiles = msg.files.map(f =>
                        f.file_id === file_id
                            ? { ...f, deleted: { file_id, delete_type: "for_me", deleted_by: currentUser.id } }
                            : f
                    );
                    table.update(message_id, { files: updatedFiles });
                }
            });
        }

        // 3. Update chatlist recent_deleted if targeting the most recent message
        if (chatItem && recentContentId) {
            if (messageIds.includes(recentContentId)) {
                const deletedInfo = { message_id: recentContentId, delete_type: "for_me" as const, deleted_by: currentUser.id };
                if (isDM && chatItem.direct_message) {
                    db.chatlist.update(chatItem.id, { direct_message: { ...chatItem.direct_message, recent_deleted: deletedInfo } });
                } else if (!isDM && chatItem.group_chat) {
                    db.chatlist.update(chatItem.id, { group_chat: { ...chatItem.group_chat, recent_deleted: deletedInfo } });
                }
            }

            const recentFileSelection = fileSelections.find(fs => fs.message_id === recentContentId);
            if (recentFileSelection) {
                const deletedInfo = { file_id: recentFileSelection.file_id, delete_type: "for_me" as const, deleted_by: currentUser.id };
                if (isDM && chatItem.direct_message) {
                    const updatedRecentFiles = chatItem.direct_message.recent_files?.map(f =>
                        f.file_id === recentFileSelection.file_id ? { ...f, deleted: deletedInfo } : f
                    );
                    db.chatlist.update(chatItem.id, {
                        direct_message: {
                            ...chatItem.direct_message,
                            recent_deleted: deletedInfo,
                            recent_files: updatedRecentFiles
                        }
                    });
                } else if (!isDM && chatItem.group_chat) {
                    const updatedRecentFiles = chatItem.group_chat.recent_files?.map(f =>
                        f.file_id === recentFileSelection.file_id ? { ...f, deleted: deletedInfo } : f
                    );
                    db.chatlist.update(chatItem.id, {
                        group_chat: {
                            ...chatItem.group_chat,
                            recent_deleted: deletedInfo,
                            recent_files: updatedRecentFiles
                        }
                    });
                }
            }
        }

        sendChatMessage({
            type: chatType,
            data: {
                action: "delete",
                chat_type: chatType,
                delete_type: "for_me" as const,
                deleted_by: currentUser.id,
                message_ids: messageIds,
                file_selections: fileSelections.map((fileSelection) => fileSelection.file_id)
            }
        });

        handleExitSelectionMode();
        setIsDeleteDialogOpen(false);
    }, [selectedMessageIds, handleExitSelectionMode, currentUser, chatType, sendChatMessage, directMessage, groupMessage]);

    const confirmDeleteForEveryone = useCallback((idsOverride?: Set<string>) => {
        if (!currentUser) return;

        const ids = idsOverride || selectedMessageIds;
        const selectedArr = Array.from(ids);

        const messageIds = selectedArr.filter(id => !id.includes(":"));

        const fileSelections = selectedArr
            .filter(id => id.includes(":"))
            .map(id => {
                const [mId, fId] = id.split(":");
                return { message_id: mId, file_id: fId };
            });

        // ── Optimistic DB updates ──────────────────────────────────────
        const isDM = chatType === "directmessage";
        const table = isDM ? db.directmessagechats : db.groupmessagechats;
        const chatItem = isDM ? directMessage : groupMessage;
        const chatObj = isDM ? chatItem?.direct_message : chatItem?.group_chat;
        const recentContentId = chatObj?.recent_content_id;

        // 1. Mark full messages as deleted in message table
        for (const mId of messageIds) {
            table.update(mId, {
                deleted: { message_id: mId, delete_type: "for_everyone", deleted_by: currentUser.id }
            });
        }

        // 2. Mark individual files as deleted in message table
        for (const { message_id, file_id } of fileSelections) {
            table.get(message_id).then(msg => {
                if (msg?.files) {
                    const updatedFiles = msg.files.map(f =>
                        f.file_id === file_id
                            ? { ...f, deleted: { file_id, delete_type: "for_everyone", deleted_by: currentUser.id } }
                            : f
                    );
                    table.update(message_id, { files: updatedFiles });
                }
            });
        }

        // 3. Update chatlist recent_deleted if targeting the most recent message
        if (chatItem && recentContentId) {
            if (messageIds.includes(recentContentId)) {
                const deletedInfo = { message_id: recentContentId, delete_type: "for_everyone" as const, deleted_by: currentUser.id };
                if (isDM && chatItem.direct_message) {
                    db.chatlist.update(chatItem.id, { direct_message: { ...chatItem.direct_message, recent_deleted: deletedInfo } });
                } else if (!isDM && chatItem.group_chat) {
                    db.chatlist.update(chatItem.id, { group_chat: { ...chatItem.group_chat, recent_deleted: deletedInfo } });
                }
            }

            const recentFileSelection = fileSelections.find(fs => fs.message_id === recentContentId);
            if (recentFileSelection) {
                const deletedInfo = { file_id: recentFileSelection.file_id, delete_type: "for_everyone" as const, deleted_by: currentUser.id };
                if (isDM && chatItem.direct_message) {
                    const updatedRecentFiles = chatItem.direct_message.recent_files?.map(f =>
                        f.file_id === recentFileSelection.file_id ? { ...f, deleted: deletedInfo } : f
                    );
                    db.chatlist.update(chatItem.id, {
                        direct_message: {
                            ...chatItem.direct_message,
                            recent_deleted: deletedInfo,
                            recent_files: updatedRecentFiles
                        }
                    });
                } else if (!isDM && chatItem.group_chat) {
                    const updatedRecentFiles = chatItem.group_chat.recent_files?.map(f =>
                        f.file_id === recentFileSelection.file_id ? { ...f, deleted: deletedInfo } : f
                    );
                    db.chatlist.update(chatItem.id, {
                        group_chat: {
                            ...chatItem.group_chat,
                            recent_deleted: deletedInfo,
                            recent_files: updatedRecentFiles
                        }
                    });
                }
            }
        }


        sendChatMessage({
            type: chatType,
            data: {
                action: "delete",
                delete_type: "for_everyone" as const,
                deleted_by: currentUser.id,
                message_ids: messageIds,
                file_selections: fileSelections.map((fileSelection) => fileSelection.file_id)
            }
        });

        handleExitSelectionMode();
        setIsDeleteDialogOpen(false);
    }, [selectedMessageIds, handleExitSelectionMode, currentUser, chatType, directMessage, groupMessage, groupMembers, sendChatMessage]);


    // Check if "Delete for everyone" should be available
    // (Only if ALL selected messages are from the current user AND < 2 days old)
    const canDeleteForEveryone = useMemo(() => {
        if (selectedMessageIds.size === 0) return false;
        const messages = chatType === 'groupchat' ? processedGroupMessages : processedDirectMessages;
        const userTz = currentUser?.timezone || "UTC";

        // Current timestamp adjusted to user's timezone
        const nowStr = new Date().toLocaleString("en-US", { timeZone: userTz });
        const currentTimestampTz = new Date(nowStr).getTime();
        
        const twoDaysInMillis = 2 * 24 * 60 * 60 * 1000;

        return Array.from(selectedMessageIds).every(id => {
            const msgId = id.includes(":") ? id.split(":")[0] : id;
            const msg = messages.find(m => m.id === msgId);
            if (!msg) return false;
            const msgUserId = typeof msg.user === 'object' && msg.user !== null ? (msg.user as User).id : (msg.user as unknown as string);
            
            if (msgUserId !== currentUser?.id) return false;

            // Message timestamp adjusted to user's timezone
            const msgStr = new Date(msg.timestamp as string | Date).toLocaleString("en-US", { timeZone: userTz });
            const msgTimestampTz = new Date(msgStr).getTime();

            if (currentTimestampTz - msgTimestampTz >= twoDaysInMillis) {
                return false;
            }

            return true;
        });
    }, [selectedMessageIds, processedGroupMessages, processedDirectMessages, currentUser?.id, currentUser?.timezone, chatType]);

    const handleMediaViewerDeleteRequest = useCallback((msgId: string, files: MediaFile[], type: 'for_me' | 'for_everyone') => {
        const newSelection = new Set<string>();
        files.forEach(f => newSelection.add(`${msgId}:${f.file_id}`));

        if (type === 'for_everyone') {
            confirmDeleteForEveryone(newSelection);
        } else {
            confirmDeleteForMe(newSelection);
        }
    }, [confirmDeleteForMe, confirmDeleteForEveryone]);

    // Reset selection mode when switching chats
    React.useEffect(() => {
        handleExitSelectionMode();
    }, [chatId, handleExitSelectionMode]);

    // ── Scroll Manager Hook ──────────────────────────────────────────
    const messagesLength = chatType === "groupchat"
        ? processedGroupMessages.length
        : processedDirectMessages.length;

    const {
        scrollContainerRef,
        bottomAnchorRef,
        handleScroll,
        scrollToBottom,
    } = useScrollManager({
        chatId,
        messagesLength,
        scrollToFirstUnread,
        hasUnreadBanner: isUnreadBannerVisible,
    });
    // Handle incoming per-chat WebSocket events (send / edit / delete / reply).
    React.useEffect(() => {
        if (!lastChatMessage) return;

        const msg = lastChatMessage as any;

        // 1. Chat online users update
        if (msg.type === "group_online_users" && msg.data?.group_id) {
            const count = msg.data.online_users;
            const groupId = msg.data.group_id;
            (async () => {
                const chat = await db.chatlist.filter(c => c.group_chat?.id === groupId).first();
                if (chat?.group_chat) {
                    await db.chatlist.update(chat.id, {
                        group_chat: { ...chat.group_chat, online_users: count }
                    });
                }
            })();
            return;
        }

        // 2. Direct message send
        if (msg.type === "directmessage" && msg.action === "send" && msg.data) {
            const incomingMsg = msg.data as DirectMessageChats;
            setLocalOptimisticMessages(prev => prev.filter(m =>
                m.client_msg_id ? m.client_msg_id !== incomingMsg.client_msg_id : m.content !== incomingMsg.content
            ));
            db.directmessagechats
                .where('direct_message_id').equals(chatId)
                .and(m => (m.client_msg_id && m.client_msg_id === incomingMsg.client_msg_id) || (m.user === currentUser?.id && m.isOptimistic === true && m.content === incomingMsg.content))
                .delete()
                .then(() => {
                    db.directmessagechats.put(incomingMsg);
                });
            return;
        }

        // 3. Group chat message send
        if (msg.type === "groupchat" && msg.action === "send" && msg.data) {
            const incomingMsg = (msg.data as WSData).groupchat_messages;
            const recipients = (msg.data as WSData).groupchat_message_recipients;
            setLocalOptimisticMessages(prev => prev.filter(m => m.content !== incomingMsg.content));
            db.groupmessagechats
                .where('groupchat_id').equals(chatId)
                .and(m => {
                    const mUserId = typeof m.user === 'object' && m.user !== null ? (m.user as User).id : (m.user as unknown as string);
                    return (m.client_msg_id && m.client_msg_id === incomingMsg.client_msg_id) ||
                        (mUserId === currentUser?.id && m.isOptimistic === true && m.content === incomingMsg.content);
                })
                .delete()
                .then(() => {
                    db.groupmessagechats.put(incomingMsg);
                });
            if (currentUser?.id === incomingMsg.user.id) {
                // instead of creating recipient for the sender of a message, create recipient for all other users in the group
                // const recipients = recipients.filter(r => r.user_id !== currentUser?.id);
                db.groupmessagechatrecipients.bulkPut(recipients.map(r => ({
                    ...r,
                    delivered_date: new Date(r.delivered_date),
                    read_date: r.read_date ? new Date(r.read_date) : null
                })));
            }
            return;
        }

        // 4. Message/File deletion
        if ((msg.type === "directmessage" || msg.type === "groupchat") && msg.action === "delete" && msg.data) {
            const deleteData = msg.data as {
                chat_id: string,
                deleted: {
                    delete_type: "for_me" | "for_everyone";
                    deleted_by: string;
                    message_id?: string;
                    file_id?: string | null;
                }[]
            };
            if (deleteData.chat_id !== chatId || !Array.isArray(deleteData.deleted)) return;
            (async () => {
                for (const item of deleteData.deleted) {
                    const { delete_type, deleted_by, message_id, file_id } = item;
                    // if (!message_id) continue;
                    const freshChat = await db.chatlist.filter(chat => chat.group_chat?.id === chatId || chat.direct_message?.id === chatId).first();
                    if (!freshChat) continue;
                    const isDM = freshChat.chat_type === "directmessage";
                    const table = isDM ? db.directmessagechats : db.groupmessagechats;
                    const chatObj = isDM ? freshChat.direct_message : freshChat.group_chat;
                    const recentContentId = chatObj?.recent_content_id;

                    if (file_id) {
                        // 1. Handle specific file deletion within a message
                        const existingMsg = await table.filter(m => m.files?.some(f => f.file_id === file_id) ?? false).first();
                        console.log(existingMsg)
                        if (existingMsg && existingMsg.files) {
                            const updatedFiles = existingMsg.files.map(f => {
                                if (f.file_id === file_id) {
                                    if (f.deleted) return f; // Skip if already deleted
                                    return {
                                        ...f,
                                        deleted: { file_id, delete_type, deleted_by }
                                    };
                                }
                                return f;
                            });
                            const hasChanged = JSON.stringify(updatedFiles) !== JSON.stringify(existingMsg.files);
                            console.log(hasChanged)
                            if (hasChanged) {
                                await table.update(existingMsg.id, { files: updatedFiles });
                            }
                        }

                        // Update chatlist recent_deleted if needed
                        if (recentContentId === message_id && chatObj && !chatObj.recent_deleted) {
                            const deletedInfo = { file_id, delete_type, deleted_by };
                            if (isDM && freshChat.direct_message) {
                                const updatedRecentFiles = freshChat.direct_message.recent_files?.map(f =>
                                    f.file_id === file_id ? { ...f, deleted: deletedInfo } : f
                                );
                                await db.chatlist.update(freshChat.id, {
                                    direct_message: { ...freshChat.direct_message, recent_deleted: deletedInfo, recent_files: updatedRecentFiles }
                                });
                            } else if (!isDM && freshChat.group_chat) {
                                const updatedRecentFiles = freshChat.group_chat.recent_files?.map(f =>
                                    f.file_id === file_id ? { ...f, deleted: deletedInfo } : f
                                );
                                await db.chatlist.update(freshChat.id, {
                                    group_chat: { ...freshChat.group_chat, recent_deleted: deletedInfo, recent_files: updatedRecentFiles }
                                });
                            }
                        }
                    } else if (message_id) {
                        // 2. Handle full message deletion
                        const existing = await table.get(message_id);
                        if (existing && !existing.deleted) {
                            await table.update(message_id, {
                                deleted: { message_id, delete_type, deleted_by }
                            });
                        }

                        // Update chatlist recent_deleted if needed
                        if (recentContentId === message_id && chatObj && !chatObj.recent_deleted) {
                            const deletedInfo = { message_id, delete_type, deleted_by };
                            if (isDM && freshChat.direct_message) {
                                await db.chatlist.update(freshChat.id, {
                                    direct_message: { ...freshChat.direct_message, recent_deleted: deletedInfo }
                                });
                            } else if (!isDM && freshChat.group_chat) {
                                await db.chatlist.update(freshChat.id, {
                                    group_chat: { ...freshChat.group_chat, recent_deleted: deletedInfo }
                                });
                            }
                        }
                    }
                }
            })();
            return;
        }
    }, [lastChatMessage, chatId, currentUser]);


    // Clear local optimistic messages when switching chats
    React.useEffect(() => {
        setLocalOptimisticMessages([]);
    }, [chatId]);

    // Ref for the message input element
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Debounce ref: clears and resets a timer on every keystroke
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    // Stops the typing indicator immediately (used after sending a message)
    const stopTyping = useCallback(() => {
        if (!currentUser || !isTypingRef.current) return;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        isTypingRef.current = false;
        globalSendMessage?.({
            type: "typing",
            chatType,
            chatId,
            userTypingId: currentUser.id,
            isTyping: false,
        });
    }, [currentUser, chatType, chatId, globalSendMessage]);

    const handleSendMessage = useCallback(async () => {
        const text = inputRef.current?.value.trim();
        if (!text || !currentUser) return;

        // Create optimi message
        const timestamp = new Date();
        const tempId = `temp-${Date.now()}`;
        const clientMsgId = `cmsg-${Date.now()}`;
        let optimisticMsg: DirectMessageChats | GroupMessageChats;

        if (chatType === "directmessage") {
            optimisticMsg = {
                id: tempId,
                direct_message_id: chatId,
                user: currentUser.id,
                reply: null,
                content: text,
                files: [],
                type: "text",
                depth: null,
                timestamp: timestamp,
                isOptimistic: true,
                forwarded: false,
                edited: false,
                deleted: undefined,
                client_msg_id: clientMsgId
            } as DirectMessageChats;
            // Add to local state IMMEDIATELY for zero latency
            setLocalOptimisticMessages(prev => [...prev, optimisticMsg]);
            // Still save to DB for background persistence
            db.directmessagechats.put(optimisticMsg as DirectMessageChats);
        } else {
            optimisticMsg = {
                id: tempId,
                groupchat_id: chatId,
                user: {
                    ...currentUser,
                },
                type: "text",
                reply: null,
                content: text,
                depth: null,
                forwarded: false,
                edited: false,
                deleted: undefined,
                timestamp: timestamp,
                receipt: "sent",
                isOptimistic: true,
                client_msg_id: clientMsgId
            } as GroupMessageChats;
            // Add to local state IMMEDIATELY for zero latency
            setLocalOptimisticMessages(prev => [...prev, optimisticMsg]);
            // Still save to DB for background persistence
            db.groupmessagechats.put(optimisticMsg as GroupMessageChats);
        }

        sendChatMessage({
            type: chatType,
            data: {
                action: "send",
                message: { text, client_msg_id: (optimisticMsg as any)?.client_msg_id },
            },
        });


        // Clear input, draft, and stop typing indicator
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.style.height = "auto";
        }
        currentInputValueRef.current = "";
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
        setHasText(false);
        stopTyping();

        // Clear draft memory so it doesn't get saved back on unmount
        if (chatItemIdRef.current) {
            db.chatlist.update(chatItemIdRef.current, { draft: null });
        }
    }, [currentUser, chatType, chatId, sendChatMessage, stopTyping]);

    const handleRetryMessage = useCallback(async (msg: DirectMessageChats | GroupMessageChats) => {
        // 1. Ensure client_msg_id exists
        let clientMsgId = msg.client_msg_id;
        if (!clientMsgId) {
            clientMsgId = `cmsg-${Date.now()}`;
            const table = chatType === 'directmessage' ? db.directmessagechats : db.groupmessagechats;
            await table.update(msg.id, { client_msg_id: clientMsgId });
        }

        const isConnected = readyState === ReadyState.OPEN;

        if (msg.type === 'text') {
            if (isConnected) {
                // Reset status locally
                if (chatType === 'directmessage') {
                    await db.directmessagechats.update(msg.id, { isOptimistic: true, status: undefined });
                } else {
                    await db.groupmessagechats.update(msg.id, { receipt: 'sent' });
                }

                sendChatMessage({
                    type: chatType,
                    data: {
                        action: "send",
                        message: { text: msg.content, client_msg_id: clientMsgId },
                    },
                });
            } else {
                toast.error("Still offline. Message not sent.");
                // Ensure it stays/is 'failed'
                if (chatType === 'directmessage') {
                    await db.directmessagechats.update(msg.id, { status: "failed" });
                } else {
                    await db.groupmessagechats.update(msg.id, { receipt: "failed" });
                }
            }
        }
        // Media retry is handled by its own component but we could also add a general case here
    }, [chatType, sendChatMessage, readyState]);

    const handleTyping = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends, Shift+Enter inserts a new line
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
            return;
        }

        // Only count actual character key presses for the typing indicator
        if (e.key.length !== 1) return;
        if (!currentUser) return;

        // Send isTyping: true immediately (only once per typing session)
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            globalSendMessage?.({
                type: "typing",
                chatType,
                chatId,
                userTypingId: currentUser.id,
                isTyping: true,
            });
        }

        // Reset the debounce timer — when it fires the user has stopped typing
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            isTypingRef.current = false;
            globalSendMessage?.({
                type: "typing",
                chatType,
                chatId,
                userTypingId: currentUser.id,
                isTyping: false,
            });
        }, 1500);
    }, [currentUser, chatType, chatId, globalSendMessage, handleSendMessage]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setPendingFiles(prev => [...prev, ...selectedFiles]);
            setIsPreviewOpen(true);
        }
        e.target.value = "";
    };

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setPendingMedia(prev => [...prev, ...selectedFiles]);
            setIsMediaPreviewOpen(true);
        }
        e.target.value = "";
    };

    const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setPendingAudio(prev => [...prev, ...selectedFiles]);
            setIsAudioPreviewOpen(true);
        }
        e.target.value = "";
    };

    const handleSendFiles = useCallback((files: File[], captions: Record<number, string>, isDocument?: boolean) => {
        if (!currentUser) return;

        // Clear UI immediately for instant feedback
        setPendingFiles([]);
        setPendingMedia([]);
        setPendingAudio([]);
        setIsPreviewOpen(false);
        setIsMediaPreviewOpen(false);
        setIsAudioPreviewOpen(false);

        // Run upload in background
        uploadMediaFiles(files, {
            chat_type: chatType === "directmessage" ? "directmessage" : "group_chat",
            context_id: chatId,
            forceDocument: isDocument
        }, captions).then(() => {
            scrollToBottom();
        }).catch((error) => {
            console.error("Failed to upload files:", error);
            toast.error("Failed to upload some files.");
        });
    }, [currentUser, chatType, chatId, uploadMediaFiles, scrollToBottom]);

    const startRecording = useCallback(() => {
        setIsRecording(true);
        globalSendMessage?.({
            type: "recording",
            chatType,
            chatId,
            userRecordingId: currentUser?.id,
            isRecording: true,
        });
    }, [chatType, chatId, currentUser, globalSendMessage]);

    const handleVoiceRecordingPause = useCallback(() => {
        globalSendMessage?.({
            type: "recording",
            chatType,
            chatId,
            userRecordingId: currentUser?.id,
            isRecording: false,
        });
    }, [chatType, chatId, currentUser, globalSendMessage]);

    const handleVoiceRecordingResume = useCallback(() => {
        globalSendMessage?.({
            type: "recording",
            chatType,
            chatId,
            userRecordingId: currentUser?.id,
            isRecording: true,
        });
    }, [chatType, chatId, currentUser, globalSendMessage]);


    const handleVoiceRecordingStop = useCallback((file: File, duration: number) => {
        setIsRecording(false);
        globalSendMessage?.({
            type: "recording",
            chatType,
            chatId,
            userRecordingId: currentUser?.id,
            isRecording: false,
        });
        setVoiceDraftBlob(undefined);
        setVoiceDraftDuration(0);
        setVoiceDraftMimeType('');

        if (!currentUser) return;

        // Upload with voice_recording type and duration
        uploadMediaFiles([file], {
            chat_type: chatType === "directmessage" ? "directmessage" : "group_chat",
            context_id: chatId,
            mediaTypeOverride: 'voice_recording',
            duration: formatDuration(duration),
        }, {}).then(() => {
            scrollToBottom();
            // Clear voice draft from DB after successful upload
            if (chatItemIdRef.current) {
                db.chatlist.update(chatItemIdRef.current, { draft: null });
            }
        }).catch((error) => {
            console.error("Failed to upload voice recording:", error);
            toast.error("Failed to send voice message.");
            if (chatItemIdRef.current) {
                db.chatlist.update(chatItemIdRef.current, { draft: null });
            }
        });
    }, [currentUser, chatType, chatId, uploadMediaFiles, scrollToBottom, globalSendMessage]);

    const handleVoiceDraft = useCallback((blob: Blob, duration: number, mimeType: string) => {
        // Update local state to keep in sync with draft
        setVoiceDraftBlob(blob);
        setVoiceDraftDuration(duration);
        setVoiceDraftMimeType(mimeType);

        // Save voice recording as a draft in IndexedDB
        if (chatItemIdRef.current) {
            db.chatlist.update(chatItemIdRef.current, {
                draft: {
                    text: `🎙 ${formatDuration(duration)}`,
                    timestamp: new Date(),
                    voiceBlob: blob,
                    voiceDuration: duration,
                    voiceMimeType: mimeType,
                },
            });
        }
    }, []);

    const handleVoiceRecordingCancel = useCallback(() => {
        setIsRecording(false);
        globalSendMessage?.({
            type: "recording",
            chatType,
            chatId,
            userRecordingId: currentUser?.id,
            isRecording: false,
        });
        setVoiceDraftBlob(undefined);
        setVoiceDraftDuration(0);
        setVoiceDraftMimeType('');
        // Clear voice draft from DB
        if (chatItemIdRef.current) {
            db.chatlist.update(chatItemIdRef.current, { draft: null });
        }
    }, [chatType, chatId, currentUser, globalSendMessage]);

    const handleRemoveFile = (index: number) => {
        setPendingFiles(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (next.length === 0) {
                setIsPreviewOpen(false);
            }
            return next;
        });
    };

    const handleRemoveMediaFile = (index: number) => {
        setPendingMedia(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (next.length === 0) {
                setIsMediaPreviewOpen(false);
            }
            return next;
        });
    };

    const handleRemoveAudioFile = (index: number) => {
        setPendingAudio(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (next.length === 0) {
                setIsAudioPreviewOpen(false);
            }
            return next;
        });
    };

    const handleSendContacts = async (selectedContacts: Contact[]) => {
        if (!selectedContacts.length || !currentUser) return;

        // Exclude current user from the shared contacts list
        const filteredContacts = selectedContacts.filter(c => c.contact_user?.id !== currentUser.id);
        if (filteredContacts.length === 0) return;

        try {
            // Construct a message showing the shared contacts
            const contactNames = filteredContacts.map(c => c.contact_name).join(", ");
            const text = `Shared ${filteredContacts.length > 1 ? "contacts" : "contact"}: ${contactNames}`;

            sendChatMessage({
                type: chatType,
                data: {
                    action: "send",
                    message: { text },
                },
            });

            scrollToBottom();
        } catch (error) {
            console.error("Failed to send contacts:", error);
        }
    };



    // ─── Draft: restore when entering a chat ─────────────────────────────────
    // Depends on both chatId and chatItem so it retries once chatItem loads.
    useEffect(() => {
        if (!chatItem) return;

        const itemSubId = chatItem.direct_message?.id || chatItem.group_chat?.id;
        if (itemSubId !== chatId) return;

        if (draftRestoredForRef.current === chatId) return;
        draftRestoredForRef.current = chatId;

        // Check for voice draft first
        if (chatItem.draft?.voiceBlob) {
            setVoiceDraftBlob(chatItem.draft.voiceBlob);
            setVoiceDraftDuration(chatItem.draft.voiceDuration || 0);
            setVoiceDraftMimeType(chatItem.draft.voiceMimeType || 'audio/ogg');
            setIsRecording(true);
            return;
        }

        const savedDraft = chatItem.draft?.text ?? "";

        if (inputRef.current) {
            inputRef.current.value = savedDraft;
            setHasText(savedDraft.length > 0);
            currentInputValueRef.current = savedDraft;
        }
    }, [chatId, chatItem]);

    // Keep mirror refs in sync with the latest chatItem metadata.
    chatItemIdRef.current = chatItem?.id;

    // ─── Draft: input change handler (debounced save to DB) ───────────────────
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        currentInputValueRef.current = text;
        setHasText(text.length > 0);

        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";

        // Mark as sourced/dirty so the flush logic knows we have a value worth saving.
        draftRestoredForRef.current = chatId;

        if (!chatItem) return;
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
        draftTimerRef.current = setTimeout(() => {
            db.chatlist.update(chatItem.id, {
                draft: text ? { text, timestamp: new Date() } : null,
            });
        }, 500); // 500ms debounce
    }, [chatItem, chatId]);

    // ─── Draft: flush when leaving a chat (chatId change OR full unmount OR refresh) ────
    // Use a ref so the cleanup closure always reads the latest value.
    const isRecordingRef = useRef(isRecording);
    isRecordingRef.current = isRecording;

    useEffect(() => {
        const flushDraft = () => {
            if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

            // If a voice recording is active, the VoiceRecorder's onDraft handles saving.
            // Don't overwrite the voice draft with empty text.
            if (isRecordingRef.current) return;

            const idToSave = chatItemIdRef.current;
            const textToSave = currentInputValueRef.current;

            if (idToSave && draftRestoredForRef.current === chatId) {
                db.chatlist.update(idToSave, {
                    draft: textToSave ? { text: textToSave, timestamp: new Date() } : null,
                });
            }
        };

        window.addEventListener("beforeunload", flushDraft);

        return () => {
            window.removeEventListener("beforeunload", flushDraft);
            flushDraft();
            currentInputValueRef.current = "";
            draftRestoredForRef.current = null;
        };
    }, [chatId]);

    React.useEffect(() => {
        if (groupMessage && currentUser) {
            const fetchGroupMembers = async () => {
                const members = await db.groupmembers.where('groupchat_id').equals(chatId).toArray()
                if (members.length > 0) {
                    setGroupMembers(members)
                    setGroupInfo(members[0].groupchat)
                } else {
                    try {
                        const groupMembersRes = await axiosInstance.get<GroupMemberResults>(`/groups/${chatId}/members`)

                        if (groupMembersRes.data && groupMembersRes.data.results.length > 0) {
                            await db.groupmembers.clear();
                            await db.groupmembers.bulkPut(groupMembersRes.data.results);
                            setGroupMembers(groupMembersRes.data.results);
                            setGroupInfo(groupMembersRes.data.results[0].groupchat)
                        }

                    } catch (error) {
                        console.log("unable to fetch data")
                    }

                }
            }
            fetchGroupMembers()
        }
    }, [groupMessage, chatId, currentUser])

    React.useEffect(() => {
        if (directMessage && currentUser) {
            const fetchDMGroupsInCommon = async () => {
                const dmGroupsInCommon = await db.dmgroupincommon.where('direct_message_id').equals(chatId).toArray()
                if (dmGroupsInCommon.length > 0) {
                    setDmGroupsInCommon(dmGroupsInCommon)
                } else {
                    try {
                        const dmGroupsInCommonRes = await axiosInstance.get<DMGroupsInCommonResults>(`/directmessages/${chatId}/groups-in-common/`)

                        if (dmGroupsInCommonRes.data && dmGroupsInCommonRes.data.results.length > 0) {
                            const groupsWithId = dmGroupsInCommonRes.data.results.map((group) => ({
                                ...group,
                                direct_message_id: chatId
                            }))
                            await db.dmgroupincommon.where('direct_message_id').equals(chatId).delete();
                            await db.dmgroupincommon.bulkPut(groupsWithId);
                            setDmGroupsInCommon(groupsWithId);
                        }

                    } catch (error) {
                        console.log("unable to fetch data")
                    }

                }
            }
            fetchDMGroupsInCommon()
        }
    }, [directMessage, chatId, currentUser])


    return (
        <SidebarInset>
            <div className="flex bg-[#efeae2] h-screen overflow-hidden">
                {/* ── Main Chat Section ───────────────────────────── */}
                <div className="flex flex-col flex-1 border-l border-r border-[#d1d7db]">
                    {/* ── Header ─────────────────────────────────────────── */}
                    <ChatHeader
                        onOpenInfo={() => setIsInfoOpen(true)}
                        directMessageUserInfo={
                            directMessage ? {
                                name: directMessage.name as DirectMessageName,
                                userId: directMessage.direct_message?.dm_user_id as string,
                                image: directMessage.direct_message?.image as string,
                                lastSeen: directMessage.direct_message?.last_seen ?? null,
                                isOnline: !!directMessage.direct_message?.is_online,
                            } : null
                        }
                        groupMessageInfo={
                            groupMessage ? {
                                groupId: chatId,
                                name: groupMessage.name as string,
                                image: groupMessage.group_chat?.image as string,
                                onlineUsersCount: groupMessage.group_chat?.online_users
                            } : null
                        }
                        groupMembers={groupMembers}
                        timezone={currentUser?.timezone}
                        currentUserId={currentUser?.id}
                    />

                    {/* ── Messages + Footer + Upload Preview wrapper ── */}
                    <div className="flex-1 flex flex-col relative overflow-hidden chat-bg-doodle">

                        {/* ── Messages Area ───────────────────────────────────── */}
                        <div
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto py-4"
                        >
                            {/* direct message chats */}
                            {currentUser && processedDirectMessages.length > 0 && (() => {
                                const unreadCount = unreadState.unreadCount;
                                const firstUnreadId = unreadState.firstUnreadId;
                                let lastDateLabel = "";

                                return processedDirectMessages.map((msg, index) => {
                                    const prevMsg = index > 0 ? processedDirectMessages[index - 1] : null;
                                    const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                    const showSeparator = dateLabel !== lastDateLabel;
                                    if (showSeparator) lastDateLabel = dateLabel;
                                    const isConsecutive = !showSeparator && prevMsg?.user === msg.user;
                                    return (
                                        <React.Fragment key={msg.id}>
                                            {msg.id === firstUnreadId && <UnreadBanner count={unreadCount} ref={unreadBannerRef} />}
                                            {showSeparator && <DateSeparator label={dateLabel} />}
                                            <MessageBubble
                                                msg={msg}
                                                currentUser={currentUser}
                                                isDM={true}
                                                isConsecutive={isConsecutive}
                                                onShowInfo={setMessageInfoMsg}
                                                onPlayNext={handlePlayNext}
                                                allVisualMedia={allVisualMedia}
                                                isSelectionMode={isSelectionMode}
                                                selectedIds={selectedMessageIds}
                                                onToggleSelect={handleToggleSelect}
                                                onEnterSelectionMode={handleEnterSelectionMode}
                                                onMediaViewerDeleteRequest={handleMediaViewerDeleteRequest}
                                                peerAvatar={directMessage?.direct_message?.image}
                                                peerName={!directMessage?.direct_message?.name?.contact_name.startsWith("+")
                                                    ? directMessage?.direct_message?.name?.contact_name
                                                    : directMessage?.direct_message?.name?.display_name}
                                            />
                                        </React.Fragment>
                                    );
                                });
                            })()}

                            {/* group message chats */}
                            {currentUser && processedGroupMessages.length > 0 && (() => {
                                const unreadCount = unreadState.unreadCount;
                                const firstUnreadId = unreadState.firstUnreadId;
                                let lastDateLabel = "";

                                return processedGroupMessages.map((msg, index) => {
                                    const prevMsg = index > 0 ? processedGroupMessages[index - 1] : null;
                                    const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                    const showSeparator = dateLabel !== lastDateLabel;
                                    if (showSeparator) lastDateLabel = dateLabel;
                                    const prevMsgUserId = prevMsg ? (typeof prevMsg.user === 'object' && prevMsg.user !== null ? (prevMsg.user as User).id : (prevMsg.user as unknown as string)) : null;
                                    const msgUserId = typeof msg.user === 'object' && msg.user !== null ? (msg.user as User).id : (msg.user as unknown as string);
                                    const isConsecutive = !showSeparator && prevMsgUserId === msgUserId;
                                    return (
                                        <React.Fragment key={msg.id}>
                                            {msg.id === firstUnreadId && <UnreadBanner count={unreadCount} ref={unreadBannerRef} />}
                                            {showSeparator && <DateSeparator label={dateLabel} />}
                                            <MessageBubble
                                                msg={msg}
                                                currentUser={currentUser}
                                                isDM={false}
                                                isConsecutive={isConsecutive}
                                                onShowInfo={setMessageInfoMsg}
                                                onPlayNext={handlePlayNext}
                                                allVisualMedia={allVisualMedia}
                                                isSelectionMode={isSelectionMode}
                                                selectedIds={selectedMessageIds}
                                                onToggleSelect={handleToggleSelect}
                                                onEnterSelectionMode={handleEnterSelectionMode}
                                                onMediaViewerDeleteRequest={handleMediaViewerDeleteRequest}
                                            />
                                        </React.Fragment>
                                    );
                                });
                            })()}
                            {/* Bottom anchor — used for scroll-to-bottom */}
                            <div ref={bottomAnchorRef} className="h-2" />
                        </div>

                        {/* ── Typing/Recording Indicator (bottom of chat, above footer) ── */}
                        {(typingUsers.length > 0 || recordingUsers.length > 0) && (
                            <div className="flex items-end gap-4 px-4 pb-3">
                                {/* Stacked mini avatars — up to 3 shown */}
                                <AvatarGroup>
                                    {(recordingUsers.length > 0 ? recordingUsers : typingUsers).slice(0, 3).map((u) => {
                                        let displayImage = u.image;
                                        let displayName = u.displayName ?? u.phone ?? "?";

                                        if (chatType === "directmessage" && directMessage) {
                                            displayImage = directMessage.direct_message?.image ?? undefined;
                                            displayName = (directMessage.name as DirectMessageName)?.contact_name ?? displayName;
                                        } else if (chatType === "groupchat") {
                                            const member = groupMembers.find(m => m.user?.id === u.id);
                                            if (member) {
                                                displayImage = member.user?.profile_pic ?? undefined;
                                                displayName = member.name || member.user?.display_name || displayName;
                                            }
                                        }

                                        return (
                                            <Avatar key={u.id} className="h-8 w-8 border-2 border-[#efeae2]">
                                                <AvatarImage src={displayImage || undefined} />
                                                <AvatarFallback className="text-[10px] bg-[#dfe5e7]">
                                                    {displayName.slice(0, 1).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        );
                                    })}
                                </AvatarGroup>

                                {/* Bubble */}
                                <div className="flex items-center gap-1 bubble-received px-3 py-3 shadow-sm">
                                    {recordingUsers.length > 0 ? (
                                        <span className="text-[#54656f] text-[13px] flex items-center gap-1">
                                            <Mic size={14} className="text-[#00a884]" />
                                        </span>
                                    ) : (
                                        <>
                                            <span className="typing-dot typing-dot-1" />
                                            <span className="typing-dot typing-dot-2" />
                                            <span className="typing-dot typing-dot-3" />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Input Bar / Selection Bar ─────────────────────── */}
                        {isSelectionMode ? (
                            <footer className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] border-t border-[#d1d7db] animate-in slide-in-from-bottom duration-200">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleExitSelectionMode}
                                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#d9dbde] transition-colors cursor-pointer"
                                    >
                                        <X size={22} className="text-[#54656f]" />
                                    </button>
                                    <span className="text-[15px] text-[#111b21] font-normal">
                                        {selectedMessageIds.size} selected
                                    </span>
                                </div>
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={selectedMessageIds.size === 0}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#d9dbde] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={20} className="text-[#54656f]" />
                                </button>
                            </footer>
                        ) : (
                            <footer className="flex items-center px-2 py-2 bg-transparent border-none">
                                <div className="flex items-center flex-1 bg-white rounded-[24px] px-1.5 py-1 gap-1 shadow-sm min-h-[46px]">
                                    {isRecording ? (
                                        <VoiceRecorder
                                            onStop={handleVoiceRecordingStop}
                                            onCancel={handleVoiceRecordingCancel}
                                            onDraft={handleVoiceDraft}
                                            onPause={handleVoiceRecordingPause}
                                            onResume={handleVoiceRecordingResume}
                                            draftBlob={voiceDraftBlob}
                                            draftDuration={voiceDraftDuration}
                                            draftMimeType={voiceDraftMimeType}
                                        />
                                    ) : (
                                        <>
                                            {/* Plus (attach) */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#f0f2f5] transition-colors shrink-0 cursor-pointer outline-none">
                                                        <AttachmentPlusIcon
                                                            style={{ width: "24px", height: "24px" }}
                                                            className="text-[#54656f]"
                                                        />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    side="top"
                                                    align="start"
                                                    className="mb-4 w-48 border-none rounded-2xl p-1 shadow-xl overflow-hidden"
                                                >
                                                    <DropdownMenuItem
                                                        className="flex items-center gap-3 px-3 cursor-pointer rounded-none"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <FileText size={20} className="text-[#7f66ff]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">Document</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        className="flex items-center gap-3 px-3 cursor-pointer rounded-none"
                                                        onClick={() => mediaInputRef.current?.click()}
                                                    >
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <ImageIcon size={20} className="text-[#007bfc]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">Photos & videos</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem className="flex items-center gap-3 px-3 cursor-pointer rounded-none">
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <Camera size={20} className="text-[#ff2e74]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">Camera</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={() => audioInputRef.current?.click()}
                                                        className="flex items-center gap-3 px-3 cursor-pointer rounded-none"
                                                    >
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <Headphones size={20} className="text-[#ff7f35]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">Audio</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={() => setIsContactModalOpen(true)}
                                                        className="flex items-center gap-3 px-3 cursor-pointer rounded-none"
                                                    >
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <UserIcon size={20} className="text-[#0695cc]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">Contact</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem className="flex items-center gap-3 px-3 cursor-pointer rounded-none">
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <BarChart2 size={20} className="text-[#ffbc38]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">Poll</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem className="flex items-center gap-3 px-3 cursor-pointer rounded-none">
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <Calendar size={20} className="text-[#ff2e74]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">Event</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem className="flex items-center gap-3 px-3 cursor-pointer rounded-none">
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            <StickyNote size={20} className="text-[#00a884]" />
                                                        </div>
                                                        <span className="text-[14.5px] font-normal">New sticker</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Emoji */}
                                            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#f0f2f5] transition-colors shrink-0 cursor-pointer">
                                                <EmojiIcon
                                                    style={{ width: "24px", height: "24px" }}
                                                    className="text-[#54656f]"
                                                />
                                            </button>

                                            {/* Text Input */}
                                            <div className="flex-1 px-1">
                                                <textarea
                                                    ref={inputRef}
                                                    rows={1}
                                                    placeholder="Type a message"
                                                    className="w-full border-none bg-transparent py-[9px] text-[15.5px] text-[#111b21] placeholder-[#8696a0] outline-none resize-none"
                                                    style={{ maxHeight: 120, overflow: "hidden" }}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleTyping}
                                                />
                                            </div>

                                            {/* Mic / Send */}
                                            <button
                                                onMouseDown={(e) => { if (hasText) e.preventDefault(); }}
                                                onClick={hasText ? handleSendMessage : startRecording}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer group ${hasText ? "hover:bg-[#f0f2f5]" : "hover:bg-[#00a884]"
                                                    }`}
                                            >
                                                <span
                                                    className="transition-all duration-150"
                                                    style={{
                                                        display: "inline-flex",
                                                        transform: hasText ? "scale(1.05) rotate(0deg)" : "scale(1) rotate(0deg)",
                                                    }}
                                                >
                                                    {hasText ? (
                                                        <SendIcon
                                                            style={{ width: "24px", height: "24px" }}
                                                            className="text-[#54656f]"
                                                        />
                                                    ) : (
                                                        <MicrophoneIcon
                                                            style={{ width: "24px", height: "24px" }}
                                                            className="text-[#54656f] group-hover:text-white"
                                                        />
                                                    )}
                                                </span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </footer>
                        )}

                        {/* Hidden Inputs */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={handleFileSelect}
                        />
                        <input
                            type="file"
                            ref={mediaInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaSelect}
                        />
                        <input
                            type="file"
                            ref={audioInputRef}
                            className="hidden"
                            accept="audio/*"
                            multiple
                            onChange={handleAudioSelect}
                        />

                        {/* File Upload Preview Overlay (covers messages + footer only) */}
                        {isPreviewOpen && (
                            <FileUploadPreview
                                files={pendingFiles}
                                onClose={() => {
                                    setIsPreviewOpen(false);
                                    setPendingFiles([]);
                                }}
                                onSend={handleSendFiles}
                                onAddMore={() => {
                                    fileInputRef.current?.click();
                                }}
                                onRemoveFile={handleRemoveFile}
                            />
                        )}

                        {/* Photo/Video Editor Preview */}
                        {isMediaPreviewOpen && (
                            <PhotoVideoUploadPreview
                                files={pendingMedia}
                                onClose={() => {
                                    setIsMediaPreviewOpen(false);
                                    setPendingMedia([]);
                                }}
                                onSend={handleSendFiles} // Reuse same send logic
                                onAddMore={() => {
                                    mediaInputRef.current?.click();
                                }}
                                onRemoveFile={handleRemoveMediaFile}
                            />
                        )}

                        {/* Audio Editor Preview */}
                        {isAudioPreviewOpen && (
                            <AudioUploadPreview
                                files={pendingAudio}
                                onClose={() => {
                                    setIsAudioPreviewOpen(false);
                                    setPendingAudio([]);
                                }}
                                onSend={handleSendFiles}
                                onAddMore={() => {
                                    audioInputRef.current?.click();
                                }}
                                onRemoveFile={handleRemoveAudioFile}
                            />
                        )}

                        {/* Contact Select Modal */}
                        {isContactModalOpen && (
                            <ContactSelectModal
                                isOpen={isContactModalOpen}
                                onClose={() => setIsContactModalOpen(false)}
                                onSend={handleSendContacts}
                            />
                        )}

                    </div>{/* end relative wrapper */}
                </div>


                {/* ── Side Info Panel (Contact/Message Info) ───────────────────────────── */}
                {messageInfoMsg ? (
                    <div className="w-[400px] lg:w-[450px] border-l border-[#d1d7db] bg-white flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex items-center gap-6 px-4 py-3 bg-white h-[60px] border-b border-[#f0f2f5]">
                            <button onClick={() => setMessageInfoMsg(null)} className="text-[#54656f] hover:text-[#111b21] transition-colors">
                                <X size={24} />
                            </button>
                            <h2 className="text-[17px] font-medium text-[#111b21]">Message info</h2>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto bg-[#efeae2] info-sheet-scrollbar">
                            {/* Bubble Preview Area with Doodle Background */}
                            <div className="relative pt-6 pb-4 px-6 doodle-bg flex justify-center items-start chat-bg-doodle min-h-[140px]">
                                {/* <div className="absolute inset-0 opacity-10 pointer-events-none" ></div> */}
                                <div className={`relative max-w-[85%] ${((typeof messageInfoMsg.user === 'object' ? messageInfoMsg.user.id : messageInfoMsg.user) === currentUser?.id) ? 'bubble-sent' : 'bubble-received'} shadow-sm px-2.5 py-1 z-10`}>
                                    <div className="flex flex-col min-w-[120px]">
                                        <p className="text-[14.5px] text-[#111b21] leading-normal whitespace-pre-wrap pr-1">{messageInfoMsg.content}</p>
                                        <div className="flex items-center justify-end gap-1 h-4">
                                            <span className="text-[11px] text-[#667781] leading-none">
                                                {getDateTimeByTimezone(messageInfoMsg.timestamp, currentUser?.timezone || "utc").time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Sections */}
                            <div className="bg-white flex flex-col">
                                <div className="px-6 py-4 flex items-center gap-2">
                                    <CheckIcon2_ height={18} width={18} className="text-[#53bdeb]" />
                                    <span className="text-[14px] text-[#008069] font-medium tracking-wide">Read by</span>
                                </div>
                                <div className="space-y-0.5 border-t border-[#f0f2f5]">
                                    {messageReadRecipients && messageReadRecipients.length > 0 && (
                                        messageReadRecipients.map((recipient) => (
                                            <div key={recipient.id} className="px-6 py-3 flex items-center gap-4 hover:bg-[#f5f6f6] cursor-pointer transition-colors group">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={recipient.user.profile_pic} />
                                                    <AvatarFallback className="text-sm bg-[#dfe5e7]">
                                                        {recipient.contact_name?.slice(0, 1).toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 py-2">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                            <span className="text-[16px] text-[#111b21]">{recipient.contact_name}</span>
                                                            <span className="text-[12px] text-[#667781]">
                                                                {recipient.read_date && formatDatetime(recipient.read_date, currentUser?.timezone || "utc")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {
                                    messageDeliveredRecipients && messageDeliveredRecipients.length > 0 && (
                                        <>
                                            <div className="px-6 py-4 flex items-center gap-4 mt-2 border-t border-[#f0f2f5]">
                                                <CheckIcon2_ height={18} width={18} className="text-[#8696a0]" />
                                                <span className="text-[14px] text-[#667781] font-medium tracking-wide">Delivered</span>
                                            </div>
                                            <div className="space-y-0.5 border-t">
                                                {messageDeliveredRecipients.map((recipient) => (
                                                    <div key={recipient.id} className="px-6 py-3 flex items-center gap-4 hover:bg-[#f5f6f6] cursor-pointer transition-colors group">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={recipient.user.profile_pic} />
                                                            <AvatarFallback className="text-sm bg-[#dfe5e7]">
                                                                {recipient.contact_name?.slice(0, 1).toUpperCase() || 'M'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 border-b border-[#f0f2f5] py-2">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[16px] text-[#111b21]">{recipient.contact_name}</span>
                                                                    <span className="text-[12px] text-[#667781]">
                                                                        {recipient.delivered_date && formatDatetime(recipient.delivered_date, currentUser?.timezone || "utc")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                                }
                                            </div>
                                        </>
                                    )
                                }

                            </div>
                        </div>
                    </div>
                ) : isInfoOpen ? (
                    <ContactInfo
                        onClose={() => setIsInfoOpen(false)}
                        directMessageUserInfo={
                            directMessage && {
                                name: directMessage.name as DirectMessageName,
                                userId: directMessage.direct_message?.recent_user_id as string,
                                image: directMessage.direct_message?.image as string,
                                bio: directMessage.direct_message?.bio,
                                phone: directMessage.direct_message?.phone,
                                groupsInCommon: dmGroupsInCommon,
                            }
                        }
                        groupMessageInfo={
                            groupMessage && {
                                groupId: chatId,
                                groupchat: groupInfo,
                                currentUser: currentUser,
                                name: groupMessage.name as string,
                                image: groupMessage.group_chat?.image as string
                            }
                        }
                        groupMembers={groupMembers}
                    />
                ) : null}
            </div>

            {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="w-[450px] rounded-[16px] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in duration-200">
                    <AlertDialogHeader className="px-6 pt-6 pb-2">
                        <AlertDialogTitle className="text-[19px] font-medium text-[#111b21] tracking-tight">
                            Delete message{selectedMessageIds.size > 1 ? 's' : ''}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {/* This action cannot be undone. This will permanently delete your account
                            from our servers. */}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="flex flex-col items-end gap-2.5 px-6 pb-6 pt-2 w-full">
                        {canDeleteForEveryone && (
                            <button
                                onClick={() => confirmDeleteForEveryone()}
                                className="w-auto min-w-[140px] px-6 py-2.5 bg-white hover:bg-[#eaf7f2] text-[#008069] text-[15px] font-medium rounded-full border border-[#008069]/10 transition-colors cursor-pointer"
                            >
                                Delete for everyone
                            </button>
                        )}
                        <button
                            onClick={() => confirmDeleteForMe()}
                            className="w-auto min-w-[140px] px-6 py-2.5 bg-white hover:bg-[#eaf7f2] text-[#008069] text-[15px] font-medium rounded-full border border-[#d1d7db] transition-colors cursor-pointer"
                        >
                            Delete for me
                        </button>
                        <button
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="w-auto min-w-[140px] px-6 py-2.5 bg-white hover:bg-[#eaf7f2] text-[#008069] text-[15px] font-medium rounded-full border border-[#d1d7db] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

        </SidebarInset>
    );
};

export default ChatSection;