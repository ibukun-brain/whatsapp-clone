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
        () => db.directmessagechats.filter(message => message.direct_message_id === chatId).sortBy('timestamp'),
        [chatId]
    );
    const groupMessageChats = useLiveQuery(
        () => db.groupmessagechats.filter(message => message.groupchat_id === chatId).sortBy('timestamp'),
        [chatId]
    );

    const [isInfoOpen, setIsInfoOpen] = React.useState(false);
    const [groupMembers, setGroupMembers] = React.useState<GroupMember[]>([])
    const [groupInfo, setGroupInfo] = React.useState<GroupChatDetail>()
    const [dmGroupsInCommon, setDmGroupsInCommon] = React.useState<DMGroupsInCommon[]>([])
    const [hasText, setHasText] = React.useState(false);

    // ── Draft ─────────────────────────────────────────────────────────
    // Debounce ref: saves draft to IndexedDB 400 ms after the user stops typing.
    const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Mirror refs so the unmount cleanup can read the latest values synchronously.
    const currentInputValueRef = useRef("");
    const chatItemIdRef = useRef<string | undefined>(undefined);
    // Tracks which chatId has already had its draft restored — prevents
    // re-populating the input on every chatItem update (e.g. during typing saves).
    const draftRestoredForRef = useRef<string | null>(null);

    // ── Scroll management ─────────────────────────────────────────────
    // Anchor div at the very bottom of the message list
    const bottomAnchorRef = useRef<HTMLDivElement>(null);

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
        // console.log("[chat-ws]", lastChatMessage);

        const msg = lastChatMessage as {
            type?: string;
            action?: string;
            data?: DirectMessageChats | GroupMessageChats | Chat;
            [key: string]: any;
        };


        if (msg.type === "directmessage" && msg.action === "send" && msg.data) {
            db.directmessagechats.put(msg.data as DirectMessageChats);
            return;
        }

        if (msg.type === "groupchat" && msg.action === "send" && msg.data) {
            db.groupmessagechats.put(msg.data as GroupMessageChats);
            return;
        }
    }, [lastChatMessage]);

    // DMs: any entry in the array means the other person is typing
    const isTyping = directMessage ? typingUsers.length > 0 : false;

    // Determine chat type based on which chat is active
    const chatType = groupMessage ? "groupchat" : "directmessage";

    // Ref for the message input element
    const inputRef = useRef<HTMLInputElement>(null);

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

    const handleSendMessage = useCallback(() => {
        const text = inputRef.current?.value.trim();
        if (!text) return;

        sendChatMessage({
            type: chatType,
            data: {
                action: "send",
                message: { text },
            },
        });

        // Clear input, draft, and stop typing indicator
        if (inputRef.current) inputRef.current.value = "";
        setHasText(false);
        stopTyping();

        // Clear draft memory so it doesn't get saved back on unmount
        currentInputValueRef.current = "";

        // Clear draft from IndexedDB immediately on send
        const activeChatItem = directMessage ?? groupMessage;
        if (activeChatItem) db.chatlist.update(activeChatItem.id, { draft: null });
    }, [sendChatMessage, stopTyping, directMessage, groupMessage]);

    const handleTyping = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        // Send message on Enter
        if (e.key === "Enter") {
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
    // ─── Draft: input change handler (debounced save to DB) ───────────────────
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        currentInputValueRef.current = text;
        setHasText(text.length > 0);

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

    // ─── Scroll: always stay at the bottom ──────────────────────────────────
    const messages = directMessageChats ?? groupMessageChats;
    useEffect(() => {
        bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, chatId]);

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
                                image: groupMessage.group_chat?.image as string
                            } : null
                        }
                        groupMembers={groupMembers}
                        timezone={currentUser?.timezone}
                    />

                    {/* ── Messages Area ───────────────────────────────────── */}
                    <div
                        className="flex-1 overflow-y-auto py-4 chat-bg-doodle"
                    >
                        {/* direct message chats */}
                        {currentUser && directMessageChats && directMessageChats.length > 0 && (() => {
                            let lastDateLabel = "";
                            return directMessageChats?.map((msg, index) => {
                                const prevMsg = index > 0 ? directMessageChats[index - 1] : null;
                                const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                const showSeparator = dateLabel !== lastDateLabel;
                                if (showSeparator) lastDateLabel = dateLabel;
                                const isConsecutive = !showSeparator && prevMsg?.user === msg.user;
                                return (
                                    <React.Fragment key={msg.id}>
                                        {showSeparator && <DateSeparator label={dateLabel} />}
                                        <MessageBubble msg={msg} currentUser={currentUser} isDM={true} isConsecutive={isConsecutive} />
                                    </React.Fragment>
                                );
                            });
                        })()}

                        {/* group message chats */}
                        {currentUser && groupMessageChats && groupMessageChats.length > 0 && (() => {
                            let lastDateLabel = "";
                            return groupMessageChats?.map((msg, index) => {
                                const prevMsg = index > 0 ? groupMessageChats[index - 1] : null;
                                const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                const showSeparator = dateLabel !== lastDateLabel;
                                if (showSeparator) lastDateLabel = dateLabel;
                                const isConsecutive = !showSeparator && (prevMsg?.user as User)?.id === (msg.user as User)?.id;
                                return (
                                    <React.Fragment key={msg.id}>
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
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Type a message"
                                className="w-full rounded-lg border-none bg-white px-3 py-[9px] text-[15px] text-[#111b21] placeholder-[#8696a0] outline-none"
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