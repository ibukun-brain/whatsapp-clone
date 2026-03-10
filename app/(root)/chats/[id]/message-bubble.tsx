import { CheckIcon1, CheckIcon2 } from "@/components/icons/chats-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDateTimeByTimezone } from "@/lib/utils";
import { DirectMessageChats, GroupMessageChats, User } from "@/types";

const ReadReceipt = ({ read_date, delivered_date, receipt, isOptimistic }: { read_date?: Date, delivered_date?: Date, receipt?: "sent" | "delivered" | "read", isOptimistic?: boolean }) => {
    if (isOptimistic) {
        return <CheckIcon1 height={18} width={14} className="text-[#8696a0]" />;
    }
    return (
        read_date || receipt === "read" ? <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" /> : delivered_date && !read_date || receipt === "delivered" ? <CheckIcon2 height={18} width={18} className="text-[#8696a0]" /> : <CheckIcon1 height={18} width={14} className="text-[#8696a0]" />
    )
}


// ─── Bubble Tails ─────────────────────────────────────────────────

const SentTail = () => (
    <div className="absolute -right-2 top-0">
        <svg width="8" height="13" viewBox="0 0 8 13">
            <path d="M1.533 3.568 8 0 0 0l1.533 3.568Z" fill="#d9fdd3" />
        </svg>
    </div>
);

const ReceivedTail = () => (
    <div className="absolute -left-2 top-0">
        <svg width="8" height="13" viewBox="0 0 8 13">
            <path d="M6.467 3.568 0 0l8 0-1.533 3.568Z" fill="#ffffff" />
        </svg>
    </div>
);


const MessageBubble = ({ msg, currentUser, isDM, isConsecutive = false }: { msg: DirectMessageChats | GroupMessageChats, currentUser: User, isDM: boolean, isConsecutive?: boolean }) => {
    const isMine = isDM ? msg.user === currentUser.id : (msg.user as User).id === currentUser.id;
    const { time } = getDateTimeByTimezone(msg.timestamp, currentUser.timezone);
    const bgColor = isMine ? "bg-[#d9fdd3]" : "bg-white";
    const alignClass = isMine ? "justify-end" : "justify-start";


    if (isDM) {
        // DM chats
        return (
            <div className={`flex ${alignClass} px-[63px] mb-1`}>
                <div className={`relative max-w-[65%] 0.5 ${bgColor} rounded-lg ${!isConsecutive ? (isMine ? 'rounded-tr-none' : 'rounded-tl-none') : ''} shadow-sm px-2 py-1`}>
                    {/* Bubble tail - show on first message or when direction changes */}
                    {!isConsecutive && (isMine ? <SentTail /> : <ReceivedTail />)}

                    {/* Sender name for specific messages */}
                    {/* {msg.senderName && msg.type !== "status-reply" && (
                    <p className="text-[12.5px] font-medium text-[#1daa61] mb-0.5">
                        {msg.senderName}
                    </p>
                )} */}

                    {/* Voice message */}
                    {/* {msg.type === "voice" && (
                    <div className="flex items-center gap-2 py-1 min-w-[240px]">
                        {!isMine && (
                            <Avatar className="h-[45px] w-[45px] border shrink-0">
                                <AvatarImage src="" />
                                <AvatarFallback className="text-sm bg-[#dfe5e7]">HN</AvatarFallback>
                            </Avatar>
                        )}
                        <button className="w-8 h-8 flex items-center justify-center shrink-0 text-[#8696a0]">
                            <PlayButtonIcon width={28} height={28} className="text-[#8696a0]" />
                        </button>
                        <div className="flex-1 flex flex-col gap-0.5">
                            <VoiceWaveform />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[#8696a0]">{msg.voiceDuration}</span>
                                <div className="flex items-center gap-1">
                                    {msg.text && (
                                        <span className="text-[13px] mr-1">{msg.text}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {isMine && (
                            <Avatar className="h-[45px] w-[45px] border shrink-0 -order-1">
                                <AvatarImage src="" />
                                <AvatarFallback className="text-sm bg-[#dfe5e7]">HN</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                )} */}

                    {/* Text with voice indicator */}
                    {/* {msg.type === "voice" && msg.text && (
                    <div className="mt-0.5">
                        <p className="text-[14.2px] text-[#111b21] leading-[19px]">{msg.text}</p>
                    </div>
                )} */}

                    {/* Plain text message */}
                    {(msg as DirectMessageChats).type === "text" && (
                        <p className="text-[14.2px] text-[#111b21] leading-[19px] pr-18 whitespace-pre-wrap">
                            {msg.content}
                        </p>
                    )}

                    {/* Emoji message */}
                    {/* {msg.type === "emoji" && (
                    <p className="text-[40px] leading-[48px] pr-16">{msg.emoji}</p>
                )} */}

                    {/* Status reply */}
                    {/* {msg.type === "status-reply" && msg.statusReply && (
                    <div className="min-w-[340px]">
                        <div className="bg-[#d1f4cc]/60 rounded-lg p-2 border-l-4 border-[#06cf9c] mb-1">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <p className="text-[12.5px] font-medium text-[#06cf9c]">
                                        {msg.statusReply.author}
                                    </p>
                                    <p className="text-[12px] text-[#667781] mt-0.5 line-clamp-2 flex items-start gap-1">
                                        <span className="inline-block mt-0.5">▶</span>
                                        <span>{msg.statusReply.text}</span>
                                    </p>
                                </div>
                                {msg.statusReply.image && (
                                    <div className="w-[52px] h-[52px] rounded bg-[#dfe5e7] overflow-hidden shrink-0">
                                        <div className="w-full h-full bg-[#c4b99a] flex items-center justify-center">
                                            <span className="text-[8px] text-white">📷</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-[14.2px] text-[#111b21] leading-[19px] pr-16">
                            {msg.statusReply.caption}
                        </p>
                    </div>
                )} */}

                    {/* Timestamp + read receipts */}
                    <div className="flex items-center justify-end gap-1 -mt-3 float-right ml-2">
                        <span className="text-[11px] text-[#667781]">{time}</span>
                        {isDM && isMine && <ReadReceipt isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} />}
                    </div>
                    <div className="clear-both" />
                </div>
            </div>
        );
    } else {
        // Group Chats
        return (
            <div className={`flex ${alignClass} gap-1 px-[63px] mb-1`}>
                {!isMine && (
                    <Avatar className={`h-8 w-8 border shrink-0 ${isConsecutive ? 'invisible' : ''}`}>
                        <AvatarImage src={(msg.user as User).profile_pic ?? undefined} />
                        <AvatarFallback className="text-sm bg-[#dfe5e7]">{(msg.user as User)?.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
                <div className={`relative max-w-[65%] mb-0.5 ${bgColor} rounded-lg ${!isConsecutive ? (isMine ? 'rounded-tr-none' : 'rounded-tl-none') : ''} shadow-sm px-2 py-1`}>
                    {/* Bubble tail - show on first message or when direction changes */}
                    {!isConsecutive && (isMine ? <SentTail /> : <ReceivedTail />)}

                    {/* Sender name for specific messages */}
                    {/* {msg.senderName && msg.type !== "status-reply" && (
                    <p className="text-[12.5px] font-medium text-[#1daa61] mb-0.5">
                        {msg.senderName}
                    </p>
                )} */}

                    {/* Voice message */}
                    {/* {msg.type === "voice" && (
                    <div className="flex items-center gap-2 py-1 min-w-[240px]">
                        {!isMine && (
                            <Avatar className="h-[45px] w-[45px] border shrink-0">
                                <AvatarImage src="" />
                                <AvatarFallback className="text-sm bg-[#dfe5e7]">HN</AvatarFallback>
                            </Avatar>
                        )}
                        <button className="w-8 h-8 flex items-center justify-center shrink-0 text-[#8696a0]">
                            <PlayButtonIcon width={28} height={28} className="text-[#8696a0]" />
                        </button>
                        <div className="flex-1 flex flex-col gap-0.5">
                            <VoiceWaveform />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[#8696a0]">{msg.voiceDuration}</span>
                                <div className="flex items-center gap-1">
                                    {msg.text && (
                                        <span className="text-[13px] mr-1">{msg.text}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {isMine && (
                            <Avatar className="h-[45px] w-[45px] border shrink-0 -order-1">
                                <AvatarImage src="" />
                                <AvatarFallback className="text-sm bg-[#dfe5e7]">HN</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                )} */}

                    {/* Text with voice indicator */}
                    {/* {msg.type === "voice" && msg.text && (
                    <div className="mt-0.5">
                        <p className="text-[14.2px] text-[#111b21] leading-[19px]">{msg.text}</p>
                    </div>
                )} */}

                    {/* Plain text message */}
                    {msg.type === "text" && (
                        <p className="text-[14.2px] text-[#111b21] leading-[19px] pr-18 whitespace-pre-wrap">
                            {msg.content}
                        </p>
                    )}

                    {/* Emoji message */}
                    {/* {msg.type === "emoji" && (
                    <p className="text-[40px] leading-[48px] pr-16">{msg.emoji}</p>
                )} */}

                    {/* Status reply */}
                    {/* {msg.type === "status-reply" && msg.statusReply && (
                    <div className="min-w-[340px]">
                        <div className="bg-[#d1f4cc]/60 rounded-lg p-2 border-l-4 border-[#06cf9c] mb-1">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <p className="text-[12.5px] font-medium text-[#06cf9c]">
                                        {msg.statusReply.author}
                                    </p>
                                    <p className="text-[12px] text-[#667781] mt-0.5 line-clamp-2 flex items-start gap-1">
                                        <span className="inline-block mt-0.5">▶</span>
                                        <span>{msg.statusReply.text}</span>
                                    </p>
                                </div>
                                {msg.statusReply.image && (
                                    <div className="w-[52px] h-[52px] rounded bg-[#dfe5e7] overflow-hidden shrink-0">
                                        <div className="w-full h-full bg-[#c4b99a] flex items-center justify-center">
                                            <span className="text-[8px] text-white">📷</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-[14.2px] text-[#111b21] leading-[19px] pr-16">
                            {msg.statusReply.caption}
                        </p>
                    </div>
                )} */}

                    {/* Timestamp + read receipts */}
                    <div className="flex items-center justify-end gap-1 -mt-3 float-right ml-2">
                        <span className="text-[11px] text-[#667781]">{time}</span>
                        {isMine && <ReadReceipt isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} />}
                    </div>
                    <div className="clear-both" />
                </div>
            </div>
        );
    }

};

export default MessageBubble
