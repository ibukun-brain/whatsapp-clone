import React, { useCallback, useMemo } from "react";
import Image from "next/image";
import { CheckIcon1, CheckIcon2 } from "@/components/icons/chats-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDateTimeByTimezone, cn } from "@/lib/utils";
import { Attachment, DirectMessageChats, DirectMessageName, GroupMessageChats, User } from "@/types";
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
    Ban,
    Pen,
} from "lucide-react";
import { toast } from "sonner";

import { Clock, AlertCircle, Smile, Check, Image as ImageIcon, Mic, Play } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    renderContentWithMentions,
    renderEditorContent,
    getEditorText,
    getCursorOffset,
    setCursorOffset,
    reconcileMentions,
} from "@/lib/utils/mentions";
import type { ComposerMention } from "@/types/mentions";

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
    const allFilesUploaded = files && files.length > 0 && files.every(f => f.status === 'ready' || f.progress === 100);
    const isUploadingAnyFile = files?.some(f => f.status === 'uploading' || f.status === 'processing');
    const isUploading = (status === 'uploading' || status === 'processing') || isUploadingAnyFile;

    if (isUploading) {
        return <Clock className="h-3 w-3 text-[#8696a0]" />;
    }

    // 2. Check for failures
    const hasFailed = status === 'failed' || files?.some(f => f.status === 'failed') || receipt === 'failed' || (receipt as any) === 'failed';
    if (hasFailed) {
        return <AlertCircle className="h-3 w-3 text-red-500" />;
    }

    // 3. Fallback for initial pending state
    if (isOptimistic || status === 'pending') {
        return <Clock className="h-3 w-3 text-[#8696a0]" />;
    }

    // 4. Status-based logic (confirmed states)
    if (read_date || receipt === "read") {
        return <CheckIcon2 height={18} width={18} className="text-[#53bdeb]" />;
    }
    if ((delivered_date && !read_date) || receipt === "delivered") {
        return <CheckIcon2 height={18} width={18} className="text-[#8696a0]" />;
    }

    // If all files are uploaded (or no files), and we have a 'sent' status/receipt, show single checkmark.
    // Optimistic messages that have finished uploading should also show a single checkmark.
    const isSent = (receipt === "sent" || allFilesUploaded || !files?.length);

    if (isSent) {
        return <CheckIcon1 height={18} width={14} className="text-[#8696a0]" />;
    }

    return <CheckIcon1 height={18} width={14} className="text-[#8696a0]" />;
}

const MessageBubble = ({
    msg,
    currentUser,
    isDM,
    isConsecutive = false,
    onShowInfo,
    onRetryMessage,
    onPlayNext,
    allVisualMedia = [],
    isSelectionMode = false,
    selectedIds = new Set(),
    onToggleSelect,
    onEnterSelectionMode,
    onMediaViewerDeleteRequest,
    peerAvatar,
    peerName,
    onEditMessage,
    onReplyMessage,
    onScrollToMessage
}: {
    msg: DirectMessageChats | GroupMessageChats,
    currentUser: User,
    isDM: boolean,
    isConsecutive?: boolean,
    onShowInfo?: (msg: GroupMessageChats) => void,
    onRetryMessage?: (msg: DirectMessageChats | GroupMessageChats) => void,
    onPlayNext?: (msgId: string) => void,
    allVisualMedia?: MediaFile[],
    isSelectionMode?: boolean,
    selectedIds?: Set<string>,
    onToggleSelect?: (id: string) => void,
    onEnterSelectionMode?: (msgId: string) => void,
    onMediaViewerDeleteRequest?: (msgId: string, files: MediaFile[], type: 'for_me' | 'for_everyone') => void,
    peerAvatar?: string | null,
    peerName?: string | null,
    onEditMessage?: (msgId: string, content: string, mentions?: ComposerMention[]) => void,
    onReplyMessage?: (msg: DirectMessageChats | GroupMessageChats) => void,
    onScrollToMessage?: (msgId: string) => void,
}) => {
    const isMine = isDM ? msg.user.id === currentUser.id : (msg.user as User)?.id === currentUser.id;
    const senderAvatar = isMine ? currentUser.profile_pic : (isDM ? peerAvatar : (msg.user as User)?.profile_pic);
    const senderName = isMine ? currentUser.display_name : (isDM ? peerName : ((msg as GroupMessageChats).user?.contact_name || (msg as GroupMessageChats).user?.display_name || (msg as GroupMessageChats).user?.phone));

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


    const handleEnterSelectionMode = useCallback((id: string) => {
        onEnterSelectionMode?.(id);
    }, [onEnterSelectionMode]);

    const chatId = isDM ? (msg as DirectMessageChats).direct_message_id : (msg as GroupMessageChats).groupchat_id;
    const { cancelUpload, retryUpload } = useMediaUpload(chatId, { listen: false });
    const hasVisuals = msg.voice_message || msg.files?.some(f => f.type === 'image' || f.type === 'video' || f.type === 'audio' || f.type === 'voice_recording');

    // deleted text computation
    const isDeleted = msg.deleted && msg.deleted !== null;
    const isDeletedByMe = msg.deleted?.deleted_by && String(msg.deleted.deleted_by) === String(currentUser.id);
    const isDeletedForEveryone = msg.deleted?.delete_type === "for_everyone";

    // effectively deleted computation (if all files or message is deleted)
    const allFilesDeletedForEveryone = msg.files && msg.files.length > 0 && msg.files.every(f => f.deleted && f.deleted.delete_type === "for_everyone");
    const anyFileDeletedByMe = msg.files && msg.files.some(f => f.deleted && String(f.deleted.deleted_by) === String(currentUser.id));

    const effectivelyDeletedForEveryone = isDeletedForEveryone || allFilesDeletedForEveryone;
    const effectivelyDeletedByMe = isDeletedByMe || (!msg.content && anyFileDeletedByMe) || (isDeletedForEveryone && isDeletedByMe) || (allFilesDeletedForEveryone && anyFileDeletedByMe);
    const effectivelyDeleted = isDeleted

    const isEffectivelyDeletedForEveryone = effectivelyDeletedForEveryone;
    const isEffectivelyDeletedByMe = effectivelyDeletedByMe;
    const isEffectivelyDeleted = effectivelyDeleted;

    let deletedText: string | null = null;
    if (isEffectivelyDeleted) {
        if (isEffectivelyDeletedForEveryone) {
            deletedText = isEffectivelyDeletedByMe ? "You deleted this message" : "This message was deleted";
        } else if (isEffectivelyDeleted) {
            deletedText = isEffectivelyDeletedByMe ? "You deleted this message" : null;
        }
    }

    const DeletedFilesNotesComp = React.useMemo(() => {
        return (msg.files?.filter(f => f.deleted) || []).map(f => {
            if (isEffectivelyDeleted) return null;

            // Only show deletion notes for "for_everyone" deletions.
            // "for_me" deletions silently exclude the file from the grid — no placeholder.
            const forEveryone = f.deleted?.delete_type === "for_everyone";
            if (!forEveryone) return null;

            const byMe = f.deleted?.deleted_by && String(f.deleted.deleted_by) === String(currentUser.id);
            const text = byMe ? "You deleted this message" : "This message was deleted";
            if (!text) return null;

            // Individual bubble-like styling below the main message
            return {
                fileId: f.file_id,
                element: (
                    <MessageContextMenu
                        key={f.file_id}
                        minimal
                        rowId={`${msg.id}:${f.file_id}`}
                        msg={msg}
                        isMine={isMine}
                        timestamp={time}
                        isDM={isDM}
                        onShowInfo={onShowInfo}
                        onEnterSelectionMode={handleEnterSelectionMode}
                        handleCopy={handleCopy}
                        senderName={senderName}
                        onEdit={(content, mentions) => onEditMessage?.(msg.id, content, mentions)}
                        onReply={() => onReplyMessage?.(msg)}
                    >
                        <div className={cn(
                            "flex items-center gap-1.5 min-w-[200px] px-2 py-1.5 rounded-lg shadow-sm border border-black/5 mt-1 animate-in fade-in zoom-in-95 duration-200",
                            isMine ? "bg-[#d9fdd3]" : "bg-white",
                            isMine ? "self-end" : "self-start"
                        )}>
                            <Ban size={16} className="text-[#667781]" />
                            <span className="text-[13.5px] italic text-[#667781] flex-1 pr-6">{text}</span>
                            <span className="text-[10px] text-[#667781] mt-auto self-end whitespace-nowrap">{time}</span>
                        </div>
                    </MessageContextMenu>
                )
            };
        }).filter(Boolean) as { fileId: string; element: React.ReactNode }[];
    }, [msg.files, isEffectivelyDeleted, currentUser.id, isMine, time]);

    const deletedBubbleContent = deletedText ? (
        <div className="flex w-[250px]">
            <div className={`flex items-center gap-1.5 pt-1.5 pb-1 px-1.5 text-[14.5px] italic ${metaColor} leading-normal`}>
                <Ban size={18} className={metaColor} />
                <span className="pr-2">{deletedText}</span>
            </div>
            <div className="absolute bottom-0 right-0 flex items-center justify-end gap-1 pb-1.5 px-1.5">
                <span className={`text-[11px] ${metaColor} leading-none`}>{time}</span>
            </div>
        </div>
    ) : null;

    const messageStatusKey = `${msg.isOptimistic}-${msg.content ? 'hasContent' : 'noContent'}-${isDM
        ? (String((msg as DirectMessageChats).read_date || 'no-read') + '-' + String((msg as DirectMessageChats).delivered_date || 'no-del'))
        : (msg as GroupMessageChats).receipt
        }-${(msg as any).receipt || 'none'}`;

    const SelectionCheckbox = ({ checked }: { checked: boolean }) => (
        <div
            className="flex items-center justify-center shrink-0 w-[30px] cursor-pointer"
        >
            <div className={cn(
                "w-[20px] h-[20px] rounded-[3px] border-2 flex items-center justify-center transition-all duration-200",
                checked
                    ? "bg-[#00a884] border-[#00a884]"
                    : "border-[#8696a0] bg-transparent"
            )}>
                {checked && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
        </div>
    );

    const hasMainContent = !!(msg.content || (msg.files && msg.files.filter(f => {
        if (!f.deleted) return true;
        if (f.deleted.delete_type === "for_everyone") return false;
        if (f.deleted.delete_type === "for_me" && String(f.deleted.deleted_by) === String(currentUser.id)) return false;
        return true;
    }).length > 0) || msg.voice_message || (msg.attachments && (msg.attachments as Attachment[]).length > 0));

    const allRowsContent: { id: string; content: React.ReactNode }[] = [];
    if (deletedText || hasMainContent) {
        allRowsContent.push({
            id: msg.id,
            content: (
                <MessageContextMenu
                    minimal={!!deletedText}
                    rowId={msg.id}
                    msg={msg}
                    timestamp={time}
                    isMine={isMine}
                    isDM={isDM}
                    onShowInfo={onShowInfo}
                    onEnterSelectionMode={handleEnterSelectionMode}
                    handleCopy={handleCopy}
                    senderName={senderName}
                    onEdit={(content) => onEditMessage?.(msg.id, content)}
                    onReply={() => onReplyMessage?.(msg)}
                >
                    <div
                        id={`msg-${msg.id}`}
                        data-grouped-ids={(msg as any).groupedIds?.join(',')}
                        className={cn(
                            "relative max-w-[400px] shadow-sm cursor-default group",
                            bubbleClass,
                            msg.files && msg.files.length > 0 && !msg.content ? "px-1 py-1" : "px-1 py-1.5"
                        )}>
                        {deletedBubbleContent || (
                            <div className="flex flex-col">
                                {!isDM && !isMine && !isConsecutive && (
                                    <div className="flex justify-between gap-2 mb-0.5 px-1">
                                        {(msg as GroupMessageChats).user.contact_id ? (
                                            <span className={"text-xs capitalize"} style={{
                                                color: (msg as GroupMessageChats).user.color_code
                                            }}>
                                                {(msg as GroupMessageChats).user.contact_name}
                                            </span>
                                        ) : (
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={`text-xs capitalize`} style={{
                                                    color: (msg as GroupMessageChats).user.color_code
                                                }}>
                                                    {(msg as GroupMessageChats).user.display_name}
                                                </span>
                                            </div>
                                        )}
                                        {!(msg as GroupMessageChats).user.contact_id && (<span className={cn("text-[11px] text-muted-foreground", msg.voice_message && "absolute right-15")}>
                                            {(msg as GroupMessageChats).user.phone}
                                        </span>)}
                                    </div>
                                )}

                                {msg.reply && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onScrollToMessage?.((msg as any).reply.id);
                                        }}
                                        className="flex flex-row bg-black/5 rounded-lg pl-2.5 pr-1 py-1.5 relative overflow-hidden mb-1 border-l-4 mt-0.5 cursor-pointer items-center justify-between"
                                        style={{ borderColor: (msg as any).reply.user?.color_code ? `color-mix(in srgb, ${(msg as any).reply.user.color_code} 75%, black)` : '#043b9e' }}
                                    >
                                        <div className="flex flex-col flex-1 min-w-0 pr-1">
                                            <span
                                                className="text-xs font-medium truncate capitalize mb-0.5"
                                                style={{ color: (msg as any).reply.user?.color_code || '#0852dd' }}
                                            >
                                                {(msg as any).reply.user?.id === currentUser?.id ? "You" :
                                                    (isDM ? peerName : (
                                                        <>
                                                            {(msg as any).reply.user?.contact_id ? (msg as any).reply.user?.contact_name : (msg as any).reply.user?.display_name}
                                                            {!(msg as any).reply.user?.contact_id && (
                                                                <span className="text-muted-foreground ml-1">
                                                                    {(msg as any).reply.user?.contact_name}
                                                                </span>
                                                            )}
                                                        </>
                                                    ))
                                                }
                                            </span>
                                            <span className="text-[13px] text-[#667781] line-clamp-2 overflow-hidden text-ellipsis wrap-break-words [word-break:break-word]">
                                                {(msg.reply as any).content ? renderContentWithMentions((msg.reply as any).content, (msg.reply as any).mentions) : (
                                                    (msg.reply as any).files && (msg.reply as any).files.length > 0 ? (
                                                        <span className="flex items-center gap-1">
                                                            <ImageIcon size={14} />
                                                            {(msg.reply as any).highlightedFile
                                                                ? ((msg.reply as any).highlightedFile.caption || "photo")
                                                                : ((msg.reply as any).files.find((f: any) => f.caption)?.caption || ((msg.reply as any).files.length > 1 ? `${(msg.reply as any).files.length} photos` : "photo"))
                                                            }
                                                        </span>
                                                    ) : (msg.reply as any).voice_message ? (
                                                        <span className="flex items-center gap-1">
                                                            <Mic size={14} className="text-[#00a884]" />
                                                            Voice message ({(msg.reply as any).voice_message_duration})
                                                        </span>
                                                    ) : "Message"
                                                )}
                                            </span>
                                        </div>

                                        {(msg.reply as any).highlightedFile && ((msg.reply as any).highlightedFile.media_url || (msg.reply as any).highlightedFile.thumbnail_url || (msg.reply as any).highlightedFile.preview_url) && (
                                            <div className="w-[44px] h-[44px] shrink-0 rounded-md overflow-hidden bg-black/5 ml-1.5 relative">
                                                <Image
                                                    src={(msg.reply as any).highlightedFile.media_url || (msg.reply as any).highlightedFile.thumbnail_url || (msg.reply as any).highlightedFile.preview_url || ''}
                                                    alt=""
                                                    width={44}
                                                    height={44}
                                                    className="w-full h-full object-cover"
                                                    unoptimized={true}
                                                />
                                                {(msg.reply as any).highlightedFile.type === 'video' && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                        <Play size={10} className="text-white fill-white" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {msg.attachments && (msg.attachments as Attachment[]).length > 0 && (
                                    <div className="flex flex-col mb-1">
                                        {(msg.attachments as Attachment[]).map((att: Attachment) => <PdfAttachmentPreview key={att.id} attachment={att} />)}
                                    </div>
                                )}


                                {msg.files && msg.files.length > 0 && (
                                    <div className="mb-1">
                                        <MediaGrid
                                            files={msg.files as MediaFile[]}
                                            isMine={isMine}
                                            onRetry={(file) => retryUpload(file, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            onCancel={(file) => cancelUpload(file.file_id, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            userTimezone={currentUser.timezone}
                                            receipt={isMine ? (isDM ? <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} /> : <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} />) : undefined}
                                            messageStatus={messageStatusKey}
                                            allVisualMedia={allVisualMedia}
                                            currentUserId={currentUser.id}
                                            onViewerDeleteRequest={(files, type) => onMediaViewerDeleteRequest?.(msg.id, files, type)}
                                            isSelectionMode={isSelectionMode}
                                            selectedIds={selectedIds}
                                            onToggleSelect={onToggleSelect}
                                            msgId={msg.id}
                                            onReply={(file) => onReplyMessage?.({ ...msg, highlightedFile: file } as (DirectMessageChats | GroupMessageChats))}
                                        />
                                    </div>
                                )}

                                {msg.voice_message && (
                                    <div className={cn("mb-1 -ml-3", !isDM && "px-1")}>
                                        <VoiceMessage
                                            id={msg.id}
                                            voice_message={msg.voice_message}
                                            voice_message_duration={msg.voice_message_duration}
                                            status={msg.status}
                                            isMine={isMine}
                                            timestamp={time}
                                            onRetry={() => retryUpload(null, msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            onCancel={() => cancelUpload('', msg.id, isDM ? 'directmessage' : 'group_chat')}
                                            onPlayNext={() => onPlayNext?.(msg.id)}
                                            receipt={isMine ? (isDM ? <ReadReceipt status={msg.status} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} /> : <ReadReceipt status={msg.status} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} />) : undefined}
                                            senderName={senderName}
                                            senderAvatar={senderAvatar}
                                            read_date={isDM ? (msg as DirectMessageChats).read_date : undefined}
                                            delivered_date={isDM ? (msg as DirectMessageChats).delivered_date : undefined}
                                            receiptStatus={!isDM ? (msg as GroupMessageChats).receipt : undefined}
                                        />
                                    </div>
                                )}


                                {msg.content && (
                                    <div className={`text-[14.5px] ${textColor} leading-normal whitespace-pre-wrap wrap-break-words [word-break:break-word] relative`}>
                                        {renderContentWithMentions(msg.content, msg.mentions)}
                                        <span className={cn("inline-block h-1", msg.edited ? "w-[110px]" : "w-[72px]")} />
                                        <span className="absolute right-0 bottom-0 inline-flex items-center gap-1 h-4 translate-y-0.5">
                                            {(msg as any).receipt === 'failed' && (
                                                <button onClick={() => onRetryMessage?.(msg)} className="hover:scale-110 transition-transform">
                                                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                                </button>
                                            )}
                                            {msg.edited && <span className={cn("text-[11px]", metaColor, "leading-none mr-0")}>Edited</span>}
                                            <span className={cn("text-[11px]", metaColor, "leading-none")}>{time}</span>
                                            {isMine && (isDM ? <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} receipt={(msg as any).receipt} /> : <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} />)}
                                        </span>
                                    </div>
                                )}

                                {!msg.content && !hasVisuals && (
                                    <div className={"flex items-center justify-end gap-1 mt-auto"}>
                                        {(msg as any).receipt === 'failed' && (
                                            <button onClick={() => onRetryMessage?.(msg)} className="hover:scale-110 transition-transform"><AlertCircle className="h-4 w-4 text-red-500" /></button>
                                        )}
                                        <span className={cn("text-[11px]", metaColor, "leading-none pb-0.5")}>{time}</span>
                                        {isMine && (isDM ? <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} receipt={(msg as any).receipt} /> : <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} />)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </MessageContextMenu>
            )
        });
    }

    if (DeletedFilesNotesComp && DeletedFilesNotesComp.length > 0) {
        DeletedFilesNotesComp.forEach(note => {
            allRowsContent.push({
                id: `${msg.id}:${note.fileId}`,
                content: note.element
            });
        });
    }

    return (
        <div className="flex flex-col">
            {allRowsContent.map((row, idx) => {
                const isFirstRow = idx === 0;
                let rowIsSelected = selectedIds.has(row.id);

                if (isSelectionMode) {
                    return (
                        <div
                            key={row.id}
                            className={cn(
                                `flex items-center px-[20px] mb-1 cursor-pointer transition-colors duration-150`,
                                rowIsSelected ? "bg-[#00a884]/8" : "hover:bg-[#00a884]/4"
                            )}
                            onClick={() => onToggleSelect?.(row.id)}
                        >
                            <SelectionCheckbox checked={rowIsSelected} />
                            <div className={cn(
                                `flex ${alignClass} flex-1 px-[33px]`,
                                !isDM && !isMine ? "gap-3.5" : ""
                            )}>
                                {!isMine && !isDM && (
                                    <Avatar className={cn(
                                        "h-8 w-8 border shrink-0",
                                        (!isFirstRow || isConsecutive) ? "invisible" : ""
                                    )}>
                                        <AvatarImage src={(msg.user as User).profile_pic ?? undefined} />
                                        <AvatarFallback className="text-sm bg-[#dfe5e7]">{(msg.user as User)?.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("flex flex-col w-full", isMine ? "items-end" : "items-start")}>
                                    {row.content}
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div
                        key={row.id}
                        className={cn(
                            `flex ${alignClass} px-[63px] mb-1`,
                            !isDM && !isMine ? "px-[20px] gap-3.5" : ""
                        )}
                    >
                        {!isMine && !isDM && (
                            <Avatar className={cn(
                                "h-8 w-8 border shrink-0",
                                (!isFirstRow || isConsecutive) ? "invisible" : ""
                            )}>
                                <AvatarImage src={(msg.user as User).profile_pic ?? undefined} />
                                <AvatarFallback className="text-sm bg-[#dfe5e7]">{(msg.user as User)?.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn("flex flex-col w-full", isMine ? "items-end" : "items-start")}>
                            {row.content}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Standalone Context Menu to prevent flickering on re-render ---
const MessageContextMenu = ({
    children,
    minimal = false,
    rowId,
    msg,
    timestamp,
    isMine,
    isDM,
    onShowInfo,
    onEnterSelectionMode,
    handleCopy,
    senderName,
    onEdit,
    onReply
}: {
    children: React.ReactNode,
    minimal?: boolean,
    rowId: string,
    msg: DirectMessageChats | GroupMessageChats,
    timestamp: string,
    isMine: boolean,
    isDM: boolean,
    onShowInfo?: (msg: GroupMessageChats) => void,
    onEnterSelectionMode?: (id: string) => void,
    handleCopy: () => void,
    senderName: string | null | undefined,
    onEdit?: (content: string, mentions?: ComposerMention[]) => void,
    onReply?: () => void
}) => {
    const reactionItems = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [hasEditText, setHasEditText] = React.useState(!!msg.content);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const editorRef = React.useRef<HTMLDivElement | null>(null);
    const editMentionsRef = React.useRef<ComposerMention[]>([]);

    const msgDate = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
    const isEditable = isMine && msgDate > 0 && (Date.now() - msgDate <= 5 * 60 * 1000);

    // Callback ref: seed the editor the moment Radix mounts it, since a
    // useEffect on isEditDialogOpen can fire before the portal attaches.
    const initEditor = React.useCallback((el: HTMLDivElement | null) => {
        editorRef.current = el;
        if (!el) return;
        const content = msg.content || "";
        const seed: ComposerMention[] = (msg.mentions || []).map((m) => ({
            mention_type: m.mention_type,
            member: m.member ? { id: m.member.id, user_id: m.member.user_id } : null,
            name: m.name,
            offset: m.offset,
            length: m.length,
        }));
        editMentionsRef.current = seed;
        renderEditorContent(el, content, seed);
        setCursorOffset(el, content.length);
        setHasEditText(content.length > 0);
        el.focus();
    }, [msg.content, msg.mentions]);

    const handleEditInput = () => {
        const el = editorRef.current;
        if (!el) return;
        const text = getEditorText(el);
        const cursor = getCursorOffset(el);
        editMentionsRef.current = reconcileMentions(text, editMentionsRef.current);
        renderEditorContent(el, text, editMentionsRef.current);
        setCursorOffset(el, cursor);
        setHasEditText(text.length > 0);
    };

    const handleEditPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleEditInput();
    };

    const handleUpdate = () => {
        const el = editorRef.current;
        if (!el) return;
        const text = getEditorText(el).trim();
        if (text === "") return;
        // editMentionsRef already holds ComposerMention[] (with mention_type), pass through.
        onEdit?.(text, editMentionsRef.current.slice());
        setIsEditDialogOpen(false);
    };

    return (
        <>
            <ContextMenu onOpenChange={setIsMenuOpen}>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 animate-in fade-in zoom-in duration-200 z-50">
                    {!minimal && (
                        <>
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
                        </>
                    )}

                    <div className="space-y-0.5">
                        {!minimal && (
                            <>
                                {isMine && !isDM && (
                                    <ContextMenuItem
                                        onSelect={() => onShowInfo?.(msg as GroupMessageChats)}
                                        className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none"
                                    >
                                        <Info size={18} className="text-gray-400" />
                                        <span>Message info</span>
                                    </ContextMenuItem>
                                )}

                                <ContextMenuItem
                                    onSelect={onReply}
                                    className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none"
                                >
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
                                <ContextMenuSeparator className="bg-gray-100 my-1" />

                                <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                                    <Forward size={18} className="text-gray-400" />
                                    <span>Forward</span>
                                </ContextMenuItem>

                                {isEditable && (
                                    <ContextMenuItem
                                        onSelect={() => setIsEditDialogOpen(true)}
                                        className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none"
                                    >
                                        <Pen size={18} className="text-gray-400" />
                                        <span>Edit</span>
                                    </ContextMenuItem>
                                )}

                                <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                                    <Pin size={18} className="text-gray-400" />
                                    <span>Pin</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator className="bg-gray-100 my-1" />

                                <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                                    <Star size={18} className="text-gray-400" />
                                    <span>Star</span>
                                </ContextMenuItem>

                            </>
                        )}

                        <ContextMenuItem
                            onSelect={() => onEnterSelectionMode?.(rowId)}
                            className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none"
                        >
                            <CheckSquare size={18} className="text-gray-400" />
                            <span>Select</span>
                        </ContextMenuItem>

                        {!minimal && <ContextMenuSeparator className="bg-gray-100 my-1" />}

                        {!minimal && !isMine && (
                            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:bg-gray-50 outline-none">
                                <ThumbsDown size={18} className="text-gray-400" />
                                <span>Report</span>
                            </ContextMenuItem>
                        )}

                        <ContextMenuItem
                            onSelect={() => onEnterSelectionMode?.(rowId)}
                            className="flex items-center gap-3 px-3 py-2 text-[15px] text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors focus:bg-red-50 outline-none"
                        >
                            <Trash2 size={18} className="text-red-400" />
                            <span>Delete</span>
                        </ContextMenuItem>
                    </div>
                </ContextMenuContent>
            </ContextMenu>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-white max-w-[500px] py-0 px-5 overflow-hidden border-none rounded-[16px] gap-0">
                    <DialogHeader className="py-4 flex flex-row items-center gap-4">
                        <DialogTitle className="text-[19px] font-medium text-[#111b21]">Edit message</DialogTitle>
                    </DialogHeader>

                    <div className="relative h-[250px] rounded-lg w-full bg-[#efeae2] chat-bg-doodle flex items-center justify-center p-6 bg-repeat">
                        <div className={cn(
                            "relative shadow-sm px-1 py-1.5 rounded-lg max-w-[250px] bg-[#d9fdd3]"
                        )}>
                            <div className="text-[14.5px] text-[#111b21] leading-normal whitespace-pre-wrap wrap-break-words [word-break:break-word] relative">
                                {renderContentWithMentions(msg.content, msg.mentions)}
                                <span className={cn("inline-block h-1", msg.edited ? "w-[110px]" : "w-[72px]")} />
                                <span className="absolute right-0 bottom-0 inline-flex items-center gap-0.5 h-4 translate-y-0.5">
                                    <span className="text-[11px] text-[#667781] leading-none">{msg.edited && <span className="mr-1">Edited</span>}{timestamp}</span>
                                    {isMine && (isDM ? <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} read_date={(msg as DirectMessageChats)?.read_date} delivered_date={(msg as DirectMessageChats)?.delivered_date} receipt={(msg as any).receipt} /> : <ReadReceipt status={msg.status} files={msg.files as MediaFile[]} isOptimistic={msg.isOptimistic} receipt={(msg as GroupMessageChats).receipt} />)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white flex items-center gap-3">
                        <div className="flex-1 relative flex items-center">
                            <div className="flex-1 relative">
                                {!hasEditText && (
                                    <span className="absolute left-0 top-3 text-[16px] text-[#8696a0] pointer-events-none select-none">
                                        Edit message
                                    </span>
                                )}
                                <div
                                    ref={initEditor}
                                    contentEditable
                                    suppressContentEditableWarning
                                    role="textbox"
                                    aria-multiline="true"
                                    className="w-full min-h-[24px] max-h-[150px] overflow-y-auto whitespace-pre-wrap break-words border-none py-3 outline-none text-[16px] text-[#111b21] pl-0 pr-12 leading-normal scrollbar-hide selection:bg-[#00a884] selection:text-dark"
                                    onInput={handleEditInput}
                                    onPaste={handleEditPaste}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleUpdate();
                                        }
                                    }}
                                />
                            </div>
                            <div className="absolute right-12 flex items-center gap-2">
                                <button className="text-[#8696a0] hover:text-[#54656f] transition-colors">
                                    <Smile size={24} />
                                </button>
                            </div>
                            <div className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-[#00a884]" />
                            <button
                                onClick={handleUpdate}
                                className="w-9 h-9 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#06cf9c] transition-all transform active:scale-95 shrink-0"
                            >
                                <Check size={22} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default React.memo(MessageBubble);
