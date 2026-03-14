"use client";

import React, { useCallback, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import {
    MicrophoneIcon,
    EmojiIcon,
    AttachmentPlusIcon,
    SendIcon,
} from "@/components/icons/chats-icon";
import { SidebarInset } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";
import { getDateLabel } from "@/lib/utils";
import ChatHeader from "./chat-header";
import { DirectMessageName, GroupMember, GroupMemberResults, GroupChatDetail, DMGroupsInCommon, DMGroupsInCommonResults, DirectMessageChats, GroupMessageChats, User, Chat } from "@/types";
import MessageBubble from "./message-bubble";
import ContactInfo from "./contact-info";
import { axiosInstance } from "@/lib/axios";
import { useTypingStore, EMPTY_TYPING } from "@/lib/stores/typing-store";
import { useGlobalWsStore } from "@/lib/stores/global-ws-store";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useScrollManager } from "@/hooks/use-scroll-manager";


// ─── Sub-components ────────────────────────────────────────────────

const VoiceWaveform = ({ small }: { small?: boolean }) => {
    const barHeights = [3, 6, 4, 8, 5, 10, 3, 7, 4, 9, 6, 3, 8, 5, 10, 4, 7, 3, 6, 8, 5, 3, 9, 4, 7, 6, 3, 8, 10, 5, 4, 7, 3, 6, 9, 5, 8, 3, 7, 4];
    return (
        <div className="flex items-center gap-[1.5px]" style={{ height: small ? 16 : 20 }}>
            {barHeights.map((h, i) => (
                <div
                    key={i}
                    className="rounded-full bg-[#8696a0] opacity-70"
                    style={{
                        width: 2,
                        height: small ? h * 0.7 : h,
                        minHeight: 2,
                    }}
                />
            ))}
        </div>
    );
};

const DateSeparator = ({ label }: { label: string }) => (
    <div className="flex justify-center my-3">
        <span className="bg-white text-[#54656f] text-[12.5px] px-3 py-1.5 rounded-lg shadow-sm">
            {label}
        </span>
    </div>
);

const UnreadBanner = React.forwardRef<HTMLDivElement, { count: number }>(({ count }, ref) => (
    <div ref={ref} className="flex justify-center my-3 bg-background-secondary py-1.5">
        <span className="bg-background text-[12.5px] px-3 py-1.5 rounded-full shadow-sm">
            {count} unread {count === 1 ? 'message' : 'messages'}
        </span>
    </div>
));
UnreadBanner.displayName = "UnreadBanner";



// ─── Main Component ───────────────────────────────────────────────

// Stable empty array — re-exported from the store to avoid per-render allocation
const EMPTY_TYPING_SET = EMPTY_TYPING;

const ChatSection = ({ chatId }: { chatId: string }) => {
    const directMessage = useLiveQuery(async () => await db.chatlist.filter(chat => chat.direct_message?.id === chatId).first(), [chatId])
    const groupMessage = useLiveQuery(async () => await db.chatlist.filter(chat => chat.group_chat?.id === chatId).first(), [chatId])
    const currentUser = useLiveQuery(
        async () => await db.user.toCollection().first()
    );
    const directMessageChats = useLiveQuery(
        () => db.directmessagechats.where('direct_message_id').equals(chatId).sortBy('timestamp'),
        [chatId]
    );
    const groupMessageChats = useLiveQuery(
        () => db.groupmessagechats.where('groupchat_id').equals(chatId).sortBy('timestamp'),
        [chatId]
    );

    const [isInfoOpen, setIsInfoOpen] = React.useState(false);
    const [groupMembers, setGroupMembers] = React.useState<GroupMember[]>([])
    const [groupInfo, setGroupInfo] = React.useState<GroupChatDetail>()
    const [dmGroupsInCommon, setDmGroupsInCommon] = React.useState<DMGroupsInCommon[]>([])
    const [hasText, setHasText] = React.useState(false);
    const [localOptimisticMessages, setLocalOptimisticMessages] = React.useState<(DirectMessageChats | GroupMessageChats)[]>([]);

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
    const chatType = groupMessage ? "groupchat" : "directmessage";

    // ── Unread Messages Hook ─────────────────────────────────────────
    const {
        unreadState,
        scrollToFirstUnread,
        bannerRef: unreadBannerRef,
        isUnreadBannerVisible,
    } = useUnreadMessages({
        chatId,
        currentUserId: currentUser?.id,
        chatType: chatType as "directmessage" | "groupchat",
    });

    // ── Scroll Manager Hook ──────────────────────────────────────────
    const messages = chatType === "groupchat" ? groupMessageChats : directMessageChats;
    const messagesLength = (messages?.length ?? 0) + localOptimisticMessages.length;

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

    // ── WebSocket (per-chat) ──────────────────────────────────────────
    // Handles send / edit / delete / reply for THIS chat only.
    // Reconnects automatically when chatId changes.
    const CHAT_WS_URL = `ws://localhost:8000/ws/chats/${chatId}/`;
    const { sendJsonMessage: sendChatMessage, lastJsonMessage: lastChatMessage } = useWebSocket(CHAT_WS_URL, {
        shouldReconnect: () => true,
    });

    // ── Global WS send (typing indicators) ───────────────────────────
    // sendJsonMessage on the global ws/chats/ socket lives in GlobalWsProvider.
    // We grab the stable reference from the store.
    const globalSendMessage = useGlobalWsStore((s) => s.sendMessage);

    // Array of users currently typing in this chat.
    // Falls back to the stable EMPTY_TYPING constant to avoid re-render loops.
    const typingUsers = useTypingStore((s) => s.typingChats[chatId] ?? EMPTY_TYPING_SET);

    // Handle incoming per-chat WebSocket events (send / edit / delete / reply).
    React.useEffect(() => {
        if (!lastChatMessage) return;

        const msg = lastChatMessage as {
            type?: "directmessage" | "groupchat" | "group_online_users";
            action?: string;
            data?: DirectMessageChats | GroupMessageChats | Chat | {
                "group_id": string,
                online_users: number
            };
            [key: string]: any;
        };

        if (msg.type === "group_online_users" && msg.data && "online_users" in msg.data) {
            const count = msg.data.online_users;
            const groupId = msg.data.group_id;
            const updateGroupOnline = async () => {
                const chat = await db.chatlist.filter(c => c.group_chat?.id === groupId).first();
                if (chat?.group_chat) {
                    await db.chatlist.update(chat.id, {
                        group_chat: {
                            ...chat.group_chat,
                            online_users: count
                        }
                    });
                }
            };
            updateGroupOnline();
            return;
        }

        if (msg.type === "directmessage" && msg.action === "send" && msg.data) {
            const incomingMsg = msg.data as DirectMessageChats;
            // Clear local optimistic state if matches
            setLocalOptimisticMessages(prev => prev.filter(m => m.content !== incomingMsg.content));
            // Clean up any optimistic messages in DB that match the content and user
            db.directmessagechats
                .where('direct_message_id').equals(chatId)
                .and(m => m.user === currentUser?.id && m.isOptimistic === true && m.content === incomingMsg.content)
                .delete()
                .then(() => {
                    db.directmessagechats.put(incomingMsg);
                });
            return;
        }

        if (msg.type === "groupchat" && msg.action === "send" && msg.data) {
            const incomingMsg = msg.data as GroupMessageChats;
            // Clear local optimistic state if matches
            setLocalOptimisticMessages(prev => prev.filter(m => m.content !== incomingMsg.content));
            // Clean up any optimistic messages in DB that match the content and user
            db.groupmessagechats
                .where('groupchat_id').equals(chatId)
                .and(m => (m.user as User)?.id === currentUser?.id && m.isOptimistic === true && m.content === incomingMsg.content)
                .delete()
                .then(() => {
                    db.groupmessagechats.put(incomingMsg);
                });
            return;
        }
    }, [lastChatMessage, chatId, currentUser]);

    // Clear local optimistic messages when switching chats
    React.useEffect(() => {
        setLocalOptimisticMessages([]);
    }, [chatId]);

    // DMs: any entry in the array means the other person is typing
    const isTyping = directMessage ? typingUsers.length > 0 : false;

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
            chatType,
            chatId,
            userTypingId: currentUser.id,
            isTyping: false,
        });
    }, [currentUser, chatType, chatId, globalSendMessage]);

    const handleSendMessage = useCallback(async () => {
        const text = inputRef.current?.value.trim();
        if (!text || !currentUser) return;

        // Create optimistic message
        const timestamp = new Date();
        const tempId = `temp-${Date.now()}`;

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
                deleted: false,
            };
            // Add to local state IMMEDIATELY for zero latency
            setLocalOptimisticMessages(prev => [...prev, optimisticMsg]);
            // Still save to DB for background persistence
            db.directmessagechats.put(optimisticMsg as DirectMessageChats);
        } else {
            optimisticMsg = {
                id: tempId,
                groupchat_id: chatId,
                user: currentUser,
                type: "text",
                contact_name: currentUser.display_name,
                reply: null,
                content: text,
                files: [] as any,
                depth: null,
                forwarded: false,
                edited: false,
                deleted: false,
                timestamp: timestamp,
                receipt: "sent",
                isOptimistic: true,
            };
            // Add to local state IMMEDIATELY for zero latency
            setLocalOptimisticMessages(prev => [...prev, optimisticMsg]);
            // Still save to DB for background persistence
            db.groupmessagechats.put(optimisticMsg as GroupMessageChats);
        }

        sendChatMessage({
            type: chatType,
            data: {
                action: "send",
                message: { text },
            },
        });

        // Clear input, draft, and stop typing indicator
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.style.height = "auto";
        }
        setHasText(false);
        stopTyping();

        // Clear draft memory so it doesn't get saved back on unmount
        currentInputValueRef.current = "";

        // Clear draft from IndexedDB immediately on send
        const activeChatItem = directMessage ?? groupMessage;
        if (activeChatItem) await db.chatlist.update(activeChatItem.id, { draft: null });

        // Scroll to bottom after sending
        scrollToBottom();
    }, [sendChatMessage, stopTyping, directMessage, groupMessage, chatType, chatId, currentUser, scrollToBottom]);

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
                chatType,
                chatId,
                userTypingId: currentUser.id,
                isTyping: false,
            });
        }, 1500);
    }, [currentUser, chatType, chatId, globalSendMessage, handleSendMessage]);

    const chatItem = directMessage ?? groupMessage;

    // ─── Draft: restore when entering a chat ─────────────────────────────────
    // Depends on both chatId and chatItem so it retries once chatItem loads.
    useEffect(() => {
        if (!chatItem) return;

        const itemSubId = chatItem.direct_message?.id || chatItem.group_chat?.id;
        if (itemSubId !== chatId) return;

        if (draftRestoredForRef.current === chatId) return;
        draftRestoredForRef.current = chatId;

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
    useEffect(() => {
        const flushDraft = () => {
            if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
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
                let members = await db.groupmembers.where('groupchat_id').equals(chatId).toArray()
                if (members.length > 0) {
                    setGroupMembers(members.filter((member) => member.user?.id !== currentUser.id))
                    setGroupInfo(members[0].groupchat)
                } else {
                    try {
                        const groupMembersRes = await axiosInstance.get<GroupMemberResults>(`/groups/${chatId}/members`)

                        if (groupMembersRes.data && groupMembersRes.data.results.length > 0) {
                            await db.groupmembers.clear();
                            await db.groupmembers.bulkPut(groupMembersRes.data.results);
                            setGroupMembers(groupMembersRes.data.results.filter((member) => member.user?.id !== currentUser.id));
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
                let dmGroupsInCommon = await db.dmgroupincommon.where('direct_message_id').equals(chatId).toArray()
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
                <div className="flex flex-col flex-1 border-r border-[#d1d7db]">
                    {/* ── Header ─────────────────────────────────────────── */}
                    <ChatHeader
                        onOpenInfo={() => setIsInfoOpen(true)}
                        isTyping={isTyping}
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
                    />

                    {/* ── Messages Area ───────────────────────────────────── */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto py-4 chat-bg-doodle"
                    >
                        {/* direct message chats */}
                        {currentUser && (() => {
                            const dbMessages = directMessageChats || [];
                            const combined = [...dbMessages];

                            localOptimisticMessages.forEach(optMsg => {
                                if ('direct_message_id' in optMsg && optMsg.direct_message_id === chatId) {
                                    const exists = dbMessages.some(m => m.content === optMsg.content && m.user === optMsg.user);
                                    if (!exists) combined.push(optMsg as DirectMessageChats);
                                }
                            });

                            combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                            if (combined.length === 0) return null;

                            const firstUnreadId = unreadState.firstUnreadId;
                            const unreadCount = unreadState.unreadCount;

                            let lastDateLabel = "";

                            return combined.map((msg, index) => {
                                const prevMsg = index > 0 ? combined[index - 1] : null;
                                const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                const showSeparator = dateLabel !== lastDateLabel;
                                if (showSeparator) lastDateLabel = dateLabel;
                                const isConsecutive = !showSeparator && prevMsg?.user === msg.user;
                                return (
                                    <React.Fragment key={msg.id}>
                                        {msg.id === firstUnreadId && <UnreadBanner count={unreadCount} ref={unreadBannerRef} />}
                                        {showSeparator && <DateSeparator label={dateLabel} />}
                                        <MessageBubble msg={msg} currentUser={currentUser} isDM={true} isConsecutive={isConsecutive} />
                                    </React.Fragment>
                                );
                            });
                        })()}

                        {/* group message chats */}
                        {currentUser && (() => {
                            const dbMessages = groupMessageChats || [];
                            const combined = [...dbMessages];

                            localOptimisticMessages.forEach(optMsg => {
                                if ('groupchat_id' in optMsg && optMsg.groupchat_id === chatId) {
                                    const exists = dbMessages.some(m => m.content === optMsg.content && (m.user as User)?.id === (optMsg.user as User)?.id);
                                    if (!exists) combined.push(optMsg as GroupMessageChats);
                                }
                            });

                            combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                            if (combined.length === 0) return null;

                            const firstUnreadId = unreadState.firstUnreadId;
                            const unreadCount = unreadState.unreadCount;

                            let lastDateLabel = "";

                            return combined.map((msg, index) => {
                                const prevMsg = index > 0 ? combined[index - 1] : null;
                                const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                const showSeparator = dateLabel !== lastDateLabel;
                                if (showSeparator) lastDateLabel = dateLabel;
                                const isConsecutive = !showSeparator && (prevMsg?.user as User)?.id === (msg.user as User)?.id;
                                return (
                                    <React.Fragment key={msg.id}>
                                        {msg.id === firstUnreadId && <UnreadBanner count={unreadCount} ref={unreadBannerRef} />}
                                        {showSeparator && <DateSeparator label={dateLabel} />}
                                        <MessageBubble msg={msg} currentUser={currentUser} isDM={false} isConsecutive={isConsecutive} />
                                    </React.Fragment>
                                );
                            });
                        })()}
                        {/* Bottom anchor — used for scroll-to-bottom */}
                        <div ref={bottomAnchorRef} className="h-2" />
                    </div>

                    {/* ── Group Typing Indicator (bottom of chat, above footer) ── */}
                    {groupMessage && typingUsers.length > 0 && (
                        <div className="flex items-end gap-1 px-4 pb-2">
                            {/* Stacked mini avatars — up to 3 shown */}
                            <AvatarGroup>
                                {typingUsers.slice(0, 3).map((u) => (
                                    <Avatar key={u.id} className="h-8 w-8 border-2 border-[#efeae2]">
                                        <AvatarImage src={u.image || undefined} />
                                        <AvatarFallback className="text-[10px] bg-[#dfe5e7]">
                                            {(u.displayName ?? u.phone ?? "?").slice(0, 1).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                            </AvatarGroup>

                            {/* Typing bubble with three-dot bounce */}
                            <div className="flex items-center gap-1 bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
                                <span className="typing-dot typing-dot-1" />
                                <span className="typing-dot typing-dot-2" />
                                <span className="typing-dot typing-dot-3" />
                            </div>
                        </div>
                    )}

                    {/* ── Input Bar ───────────────────────────────────────── */}
                    <footer className="flex items-center gap-2 px-4 py-[5px] bg-[#f0f2f5] border-l border-[#e9edef]">
                        {/* Plus (attach) */}
                        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] transition-colors shrink-0 cursor-pointer">
                            <AttachmentPlusIcon
                                style={{ width: "24px", height: "24px" }}
                                className="text-[#54656f]"
                            />
                        </button>

                        {/* Emoji */}
                        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] transition-colors shrink-0 cursor-pointer">
                            <EmojiIcon
                                style={{ width: "24px", height: "24px" }}
                                className="text-[#54656f]"
                            />
                        </button>

                        {/* Text Input */}
                        <div className="flex-1">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                placeholder="Type a message"
                                className="w-full rounded-lg border-none bg-white px-3 py-[9px] text-[15px] text-[#111b21] placeholder-[#8696a0] outline-none resize-none"
                                style={{ maxHeight: 120, overflow: "hidden" }}
                                onChange={handleInputChange}
                                onKeyDown={handleTyping}
                            />
                        </div>

                        {/* Mic / Send */}
                        <button
                            onMouseDown={(e) => { if (hasText) e.preventDefault(); }}
                            onClick={hasText ? handleSendMessage : undefined}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] transition-all shrink-0 cursor-pointer"
                        >
                            <span
                                className="transition-all duration-150"
                                style={{
                                    display: "inline-flex",
                                    transform: hasText ? "scale(1.1) rotate(0deg)" : "scale(1) rotate(0deg)",
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
                                        className="text-[#54656f]"
                                    />
                                )}
                            </span>
                        </button>
                    </footer>
                </div>

                {/* ── Side Info Panel ───────────────────────────── */}
                {isInfoOpen && (
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
                )}
            </div>
        </SidebarInset>
    );
};

export default ChatSection;