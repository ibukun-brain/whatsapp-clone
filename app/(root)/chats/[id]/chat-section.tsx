"use client";

import React, { useCallback, useRef } from "react";
import useWebSocket from "react-use-websocket";
import {
    MicrophoneIcon,
    EmojiIcon,
    AttachmentPlusIcon,

} from "@/components/icons/chats-icon";
import { SidebarInset } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";
import { getDateLabel } from "@/lib/utils";
import ChatHeader from "./chat-header";
import { DirectMessageName, GroupMember, GroupMemberResults, GroupChatDetail, DMGroupsInCommon, DMGroupsInCommonResults } from "@/types";
import MessageBubble from "./message-bubble";
import ContactInfo from "./contact-info";
import { axiosInstance } from "@/lib/axios";
import { useTypingStore, EMPTY_TYPING, userTypingType } from "@/lib/stores/typing-store";



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

    // ── WebSocket ────────────────────────────────────────────────────
    const WS_URL = "ws://localhost:8000/ws/chats/";
    const { sendJsonMessage, lastJsonMessage } = useWebSocket(WS_URL, {
        shouldReconnect: () => true,
    });

    const setUserTyping = useTypingStore((s) => s.setUserTyping);
    const setGroupTyping = useTypingStore((s) => s.setGroupTyping);
    // Array of users currently typing in this chat.
    // Falls back to the stable EMPTY_TYPING constant to avoid re-render loops.
    const typingUsers = useTypingStore((s) => s.typingChats[chatId] ?? EMPTY_TYPING_SET);

    // Handle incoming WebSocket typing events.
    // Backend contract:
    //   directmessage → userTypingId: string            (the typing user's ID)
    //   groupchat     → userTyping:   userTypingType[]   (authoritative list of {id, image?})
    React.useEffect(() => {
        if (!lastJsonMessage) return;
        console.log(lastJsonMessage);
        const msg = lastJsonMessage as {
            chatType?: string;
            chatId?: string;
            isTyping?: boolean;
            userTypingId?: string;          // directmessage
            userTyping?: userTypingType[];  // groupchat
        };
        if (!msg.chatId || typeof msg.isTyping !== "boolean") return;

        if (msg.chatType === "groupchat" && msg.userTyping != null) {
            // Replace entire list, filtering out ourselves
            const withoutSelf = msg.userTyping.filter(
                (u) => !(currentUser && u.id === currentUser.id)
            );
            setGroupTyping(msg.chatId, withoutSelf);
        } else if (msg.chatType === "directmessage" && msg.userTypingId != null) {
            if (currentUser && msg.userTypingId === currentUser.id) return; // skip own echo
            setUserTyping(msg.chatId, msg.userTypingId, msg.isTyping);
        }
    }, [lastJsonMessage, setUserTyping, setGroupTyping, currentUser]);

    // DMs: any entry in the array means the other person is typing
    const isTyping = directMessage ? typingUsers.length > 0 : false;

    // Determine chat type based on which chat is active
    const chatType = groupMessage ? "groupchat" : "directmessage";

    // Debounce ref: clears and resets a timer on every keystroke
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const handleTyping = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        // Only count actual alphabetical key presses
        if (!/^[a-zA-Z]$/.test(e.key)) return;
        if (!currentUser) return;

        // Send isTyping: true immediately (only once per typing session)
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            sendJsonMessage({
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
            sendJsonMessage({
                chatType,
                chatId,
                userTypingId: currentUser.id,
                isTyping: false,
            });
        }, 1500);
    }, [currentUser, chatType, chatId, sendJsonMessage]);

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
                                userId: directMessage.direct_message?.recent_user_id as string,
                                image: directMessage.direct_message?.image as string,
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
                    />

                    {/* ── Messages Area ───────────────────────────────────── */}
                    <div
                        className="flex-1 overflow-y-auto py-4 chat-bg-doodle"
                    >
                        {/* direct message chats */}
                        {currentUser && directMessageChats && directMessageChats.length > 0 && (() => {
                            let lastDateLabel = "";
                            return directMessageChats?.map((msg) => {
                                const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                const showSeparator = dateLabel !== lastDateLabel;
                                if (showSeparator) lastDateLabel = dateLabel;
                                return (
                                    <React.Fragment key={msg.id}>
                                        {showSeparator && <DateSeparator label={dateLabel} />}
                                        <MessageBubble msg={msg} currentUser={currentUser} isDM={true} />
                                    </React.Fragment>
                                );
                            });
                        })()}

                        {/* group message chats */}
                        {currentUser && groupMessageChats && groupMessageChats.length > 0 && (() => {
                            let lastDateLabel = "";
                            return groupMessageChats?.map((msg) => {
                                const dateLabel = getDateLabel(msg.timestamp, currentUser.timezone);
                                const showSeparator = dateLabel !== lastDateLabel;
                                if (showSeparator) lastDateLabel = dateLabel;
                                return (
                                    <React.Fragment key={msg.id}>
                                        {showSeparator && <DateSeparator label={dateLabel} />}
                                        <MessageBubble msg={msg} currentUser={currentUser} isDM={true} />
                                    </React.Fragment>
                                );
                            });
                        })()}
                        {/* Bottom spacer */}
                        <div className="h-2" />
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
                                type="text"
                                placeholder="Type a message"
                                className="w-full rounded-lg border-none bg-white px-3 py-[9px] text-[15px] text-[#111b21] placeholder-[#8696a0] outline-none"
                                onKeyDown={handleTyping}
                            />
                        </div>

                        {/* Mic */}
                        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] transition-colors shrink-0 cursor-pointer">
                            <MicrophoneIcon
                                style={{ width: "24px", height: "24px" }}
                                className="text-[#54656f]"
                            />
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