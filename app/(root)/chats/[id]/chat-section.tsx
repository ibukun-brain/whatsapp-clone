"use client";

import React from "react";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    VideoCallIcon,
    SearchIcon,
    MenuIcon,
    CheckIcon2,
    MicrophoneIcon,
    EmojiIcon,
    AttachmentPlusIcon,
    PlayButtonIcon,
    ChevronIcon,
} from "@/components/icons/chats-icon";
import { SidebarInset } from "@/components/ui/sidebar";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";
import { getDateTimeByTimezone, getDateLabel } from "@/lib/utils";
import ChatHeader from "./chat-header";
import { DirectMessageChats, DirectMessageName, User } from "@/types";
import MessageBubble from "./message-bubble";



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

    console.log(groupMessageChats, chatId)

    if (!directMessage && !groupMessage) {
        return <div>Chat not found</div>
    }

    return (
        <SidebarInset>
            <div className="flex flex-col h-screen bg-[#efeae2]">
                {/* ── Header ─────────────────────────────────────────── */}
                <ChatHeader
                    directMessageUserInfo={
                        directMessage ? {
                            name: directMessage.name as DirectMessageName ?? null,
                            userId: directMessage.direct_message?.recent_user_id ?? null,
                            image: directMessage.direct_message?.image ?? null
                        } : null
                    }
                    groupMessageInfo={
                        groupMessage ? {
                            name: groupMessage.name as string ?? null,
                            image: groupMessage.group_chat?.image ?? null
                        } : null
                    } />

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
        </SidebarInset>
    );
};

export default ChatSection;