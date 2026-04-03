import React from "react";
import { CheckIcon1, CheckIcon2 } from "@/components/icons/chats-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDateTimeByTimezone, cn } from "@/lib/utils";
import { Attachment, DirectMessageChats, GroupMessageChats, User } from "@/types";
import PdfAttachmentPreview from "./pdf-attachment-preview";
import MediaGrid from "@/components/chat/MediaGrid";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { MediaFile } from "@/types/mediaTypes";
import VoiceMessage from "@/components/chat/VoiceMessage";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger
} from "@/components/ui/context-menu";
import {
    Copy,
    Reply,
    Forward,
    Pin,
    Star,
    Info,
    Trash2,
    CheckSquare,
    Plus,
    ThumbsDown,
    MessageCircle,
    MessageSquareQuote,
} from "lucide-react";
import { toast } from "sonner";

import { Clock, AlertCircle } from "lucide-react";

const ReadReceipt = ({
    read_date,
    delivered_date,
    receipt,
    status,
    isOptimistic,
    files
}: {
    read_date?: Date,
    delivered_date?: Date,
    receipt?: "sent" | "delivered" | "read" | "failed",
    status?: 'pending' | 'sent' | 'failed' | 'processing' | 'uploading',
    isOptimistic?: boolean,
    files?: MediaFile[]
}) => {
    // 1. Check for active uploads/processing
    const isUploading = status === 'pending' || status === 'processing' || status === 'uploading' || files?.some(f => f.status === 'uploading' || f.status === 'processing');
    if (isUploading) {
        return <Clock className="h-3 w-3 text-[#8696a0]" />;
    }

    // 2. Check for failures
    const hasFailed = status === 'failed' || files?.some(f => f.status === 'failed') || receipt === 'failed' || (receipt as any) === 'failed';
    if (hasFailed) {
        return <AlertCircle className="h-3 w-3 text-red-500" />;
    }

    // 3. Normal receipt logic
    if (isOptimistic) {
        return <Clock className="h-3 w-3 text-[#8696a0]" />;
    }

    return (
        read_date || receipt === "read"
            ? <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" />
            : (delivered_date && !read_date) || receipt === "delivered"
                ? <CheckIcon2 height={18} width={18} className="text-[#8696a0]" />
                : <CheckIcon1 height={18} width={14} className="text-[#8696a0]" />
    )
}

const MessageBubble = ({
    msg,
    currentUser,
    isDM,
    isConsecutive = false,
    onShowInfo,
    onRetryMessage,
    allVisualMedia = []
}: {
    msg: DirectMessageChats | GroupMessageChats,
    currentUser: User,
    isDM: boolean,
    isConsecutive?: boolean,
    onShowInfo?: (msg: GroupMessageChats) => void,
    onRetryMessage?: (msg: DirectMessageChats | GroupMessageChats) => void,
    allVisualMedia?: MediaFile[]
}) => {
    const isMine = isDM ? msg.user === currentUser.id : (msg.user as User)?.id === currentUser.id;
    const displayTimestamp = (msg.files && msg.files.length > 0) ? msg.files[0].timestamp : msg.timestamp;
    const { time } = getDateTimeByTimezone(displayTimestamp, currentUser.timezone);
    const alignClass = isMine ? "justify-end" : "justify-start";

    // Tail styling
    const bubbleClass = !isConsecutive ? (isMine ? "bubble-sent" : "bubble-received") : (isMine ? "bg-[#d9fdd3] rounded-lg" : "bg-[#ffffff] rounded-lg");
    const textColor = "text-[#111b21]";
    const metaColor = "text-[#667781]";

    const handleCopy = () => {
        if (msg.type === "text") {
            navigator.clipboard.writeText(msg.content);
            toast.success("Text copied to clipboard");
        }
    };

    const reactionItems = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    const MessageContextMenu = ({ children }: { children: React.ReactNode }) => {
        const senderName = !isMine ? (isDM ? "Contact" : (msg.user as User)?.display_name || "Unknown") : null;

        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 animate-in fade-in zoom-in duration-200 z-50">
                    {/* Reactions Section */}
                    <div className="flex items-center justify-between px-2 py-2 mb-1">
                        {reactionItems.map((emoji) => (
                            <button key={emoji} className="text-2xl hover:scale-125 transition-transform duration-200 px-1">
                                {emoji}
                            </button>
                        ))}
                        <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 border border-gray-100 transition-colors">
                            <Plus size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <ContextMenuSeparator className="bg-gray-100 mb-1" />

                    <div className="space-y-0.5">
                        {isMine && !isDM && (
                            <ContextMenuItem
                                onSelect={() => onShowInfo?.(msg as GroupMessageChats)}
                                className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none"
                            >
                                <Info size={18} className="text-gray-400" />
                                <span>Message info</span>
                            </ContextMenuItem>
                        )}

                        <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                            <Reply size={18} className="text-gray-400" />
                            <span>Reply</span>
                        </ContextMenuItem>

                        {!isMine && (
                            <>
                                <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                                    <MessageSquareQuote size={18} className="text-gray-400" />
                                    <span>Reply privately</span>
                                </ContextMenuItem>

                                <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                                    <MessageCircle size={18} className="text-gray-400" />
                                    <span>Message {senderName}</span>
                                </ContextMenuItem>
                            </>
                        )}

                        <ContextMenuItem
                            onSelect={handleCopy}
                            className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none"
                        >
                            <Copy size={18} className="text-gray-400" />
                            <span>Copy</span>
                        </ContextMenuItem>

                        <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                            <Forward size={18} className="text-gray-400" />
                            <span>Forward</span>
                        </ContextMenuItem>

                        <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                            <Pin size={18} className="text-gray-400" />
                            <span>Pin</span>
                        </ContextMenuItem>

                        <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                            <Star size={18} className="text-gray-400" />
                            <span>Star</span>
                        </ContextMenuItem>

                        <ContextMenuSeparator className="bg-gray-100 my-1" />

                        <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                            <CheckSquare size={18} className="text-gray-400" />
                            <span>Select</span>
                        </ContextMenuItem>

                        <ContextMenuSeparator className="bg-gray-100 my-1" />

                        {!isMine && (
                            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                                <ThumbsDown size={18} className="text-gray-400" />
                                <span>Report</span>
                            </ContextMenuItem>
                        )}

                        <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors focus:bg-red-50 outline-none">
                            <Trash2 size={18} className="text-red-400" />
                            <span>Delete</span>
                        </ContextMenuItem>
                    </div>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    const chatId = isDM ? (msg as DirectMessageChats).direct_message_id : (msg as GroupMessageChats).groupchat_id;
    const { cancelUpload, retryUpload } = useMediaUpload(chatId, { listen: false });
    const hasVisuals = msg.voice_message || msg.files?.some(f => f.type === 'image' || f.type === 'video' || f.type === 'audio' || f.type === 'voice_recording');

    const messageStatusKey = `${msg.isOptimistic}-${msg.content ? 'hasContent' : 'noContent'}-${isDM
        ? (String((msg as DirectMessageChats).read_date || 'no-read') + '-' + String((msg as DirectMessageChats).delivered_date || 'no-del'))
        : (msg as GroupMessageChats).receipt
        }-${(msg as any).receipt || 'none'}`;

    return (
        <>
            {isDM ? (
                <div className={`flex ${alignClass} px-[63px] mb-1`}>
                    <MessageContextMenu>
                        <div className={cn(
                            "relative max-w-[72%] min-w-[200px] shadow-sm cursor-default group",
                            bubbleClass,
                            msg.files && msg.files.length > 0 && !msg.content ? "px-1 py-1 pb-0" : "px-1 py-1"
                        )}>
                            <div className="flex flex-col">
                                {/* New Media Grid */}
                                {msg.files && msg.files.length > 0 && (
                                    <div className="mb-1">
                                        <MediaGrid
                                            files={msg.files as MediaFile[]}
                                            isMine={isMine}
                                            onRetry={(file) => retryUpload(file, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            onCancel={(file) => cancelUpload(file.file_id, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            userTimezone={currentUser.timezone}
                                            receipt={isMine ? <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} /> : undefined}
                                            messageStatus={messageStatusKey}
                                            allVisualMedia={allVisualMedia}
                                        />
                                    </div>
                                )}

                                {msg.voice_message && (
                                    <div className="mb-1">
                                        <VoiceMessage 
                                            voice_message={msg.voice_message}
                                            voice_message_duration={msg.voice_message_duration}
                                            status={msg.status}
                                            isMine={isMine}
                                            timestamp={time}
                                            onRetry={() => retryUpload(null, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            onCancel={() => cancelUpload('', msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            receipt={isMine ? <ReadReceipt status={msg.status} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} /> : undefined}
                                            chatId={chatId}
                                            isDM={isDM}
                                        />
                                    </div>
                                )}

                                {msg.content && (
                                    <p className={`text-[14.5px] ${textColor} leading-px whitespace-pre-wrap pt-1.5`}>
                                        {msg.content}
                                    </p>
                                )}

                                {(!hasVisuals || msg.content) && (
                                    <div className="flex items-center justify-end gap-1">
                                        {(msg as any).receipt === 'failed' && (
                                            <button
                                                onClick={() => onRetryMessage?.(msg)}
                                                className="hover:scale-110 transition-transform"
                                                title="Retry sending"
                                            >
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            </button>
                                        )}
                                        <span className={`text-[11px] ${metaColor} leading-none`}>{time}</span>
                                        {isMine && <ReadReceipt files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} receipt={(msg as any).receipt} />}
                                    </div>
                                )}

                            </div>
                        </div>
                    </MessageContextMenu>
                </div>
            ) : (
                <div className={`flex ${alignClass} gap-3.5 px-[63px] mb-1`}>
                    {!isMine && (
                        <Avatar className={`h-8 w-8 border shrink-0 ${isConsecutive ? 'invisible' : ''}`}>
                            <AvatarImage src={(msg.user as User).profile_pic ?? undefined} />
                            <AvatarFallback className="text-sm bg-[#dfe5e7]">{(msg.user as User)?.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    )}
                    <MessageContextMenu>
                        <div className={cn(
                            "relative max-w-[72%] min-w-[200px] shadow-sm cursor-default group",
                            bubbleClass,
                            msg.files && msg.files.length > 0 && !msg.content ? "px-1 py-1 pb-0" : "px-2.5 py-0.5"
                        )}>
                            <div className="flex flex-col">
                                {/* Standard Attachments (PDFs) */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-col gap-1 mb-1">
                                        {(msg.attachments as Attachment[]).map((att: Attachment) => (
                                            <PdfAttachmentPreview key={att.id} attachment={att} />
                                        ))}
                                    </div>
                                )}

                                {/* New Media Grid */}
                                {msg.files && msg.files.length > 0 && (
                                    <div className="mb-1">
                                        <MediaGrid
                                            files={msg.files as MediaFile[]}
                                            isMine={isMine}
                                            onRetry={(file) => retryUpload(file, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            onCancel={(file) => cancelUpload(file.file_id, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            userTimezone={currentUser.timezone}
                                            receipt={isMine ? <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} /> : undefined}
                                            messageStatus={messageStatusKey}
                                            allVisualMedia={allVisualMedia}
                                        />


                                    </div>
                                )}

                                {msg.voice_message && (
                                    <div className="mb-1 px-1">
                                        <VoiceMessage 
                                            voice_message={msg.voice_message}
                                            voice_message_duration={msg.voice_message_duration}
                                            status={msg.status}
                                            isMine={isMine}
                                            timestamp={time}
                                            receipt={isMine ? <ReadReceipt status={msg.status} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} /> : undefined}
                                            senderName={isMine ? currentUser.display_name : (msg.user as User)?.display_name}
                                            senderAvatar={isMine ? currentUser.profile_pic : (msg.user as User)?.profile_pic}
                                            chatId={chatId}
                                            isDM={isDM}
                                        />
                                    </div>
                                )}

                                {msg.content && (
                                    <p className={`text-[14.5px] ${textColor} leading-normal whitespace-pre-wrap pr-1`}>
                                        {msg.content}
                                    </p>
                                )}

                                {(!hasVisuals || msg.content) && (
                                    <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 pb-1.5">
                                        {(msg as any).receipt === 'failed' && (
                                            <button
                                                onClick={() => onRetryMessage?.(msg)}
                                                className="hover:scale-110 transition-transform"
                                                title="Retry sending"
                                            >
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            </button>
                                        )}
                                        <span className={`text-[11px] ${metaColor} leading-none`}>{time}</span>
                                        {isMine && <ReadReceipt files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} />}
                                    </div>
                                )}

                            </div>
                        </div>
                    </MessageContextMenu>
                </div>
            )}
        </>
    );
};

export default React.memo(MessageBubble);
