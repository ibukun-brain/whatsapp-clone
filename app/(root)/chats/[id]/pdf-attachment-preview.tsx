"use client";

import React from "react";
import { FileText, Download } from "lucide-react";

interface Attachment {
    id: string;
    file_url: string;
    thumbnail_url: string | null;
    file_name: string;
    file_size: number;
    file_type: string;
    page_count: number;
}

interface PdfAttachmentPreviewProps {
    attachment: Attachment;
}

/** Human-readable file size */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Truncate a file name sensibly */
function truncateFileName(name: string, maxLen = 28): string {
    if (name.length <= maxLen) return name;
    const ext = name.split(".").pop() || "";
    const base = name.slice(0, maxLen - ext.length - 4);
    return `${base}...${ext}`;
}

const PdfAttachmentPreview = React.memo(({ attachment }: PdfAttachmentPreviewProps) => {
    const hasThumbnail = !!attachment.thumbnail_url;

    return (
        <div className="relative rounded-lg overflow-hidden bg-[#e9edef] max-w-[280px] min-w-[220px] cursor-pointer group">
            {/* Download button */}
            <a
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download={attachment.file_name}
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
            >
                <Download size={16} className="text-white" />
            </a>

            {hasThumbnail ? (
                /* Thumbnail preview */
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={attachment.thumbnail_url!}
                        alt={attachment.file_name}
                        className="w-full object-cover"
                    />
                </div>
            ) : (
                /* Fallback: generic PDF icon */
                <div className="flex items-center justify-center py-10 px-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-lg bg-[#d5dadd] flex items-center justify-center">
                            <FileText size={28} className="text-[#8696a0]" />
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom info overlay */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#d5dadd]/80">
                <div className="w-8 h-8 rounded bg-[#e56962] flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-white leading-none">PDF</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#111b21] truncate font-normal leading-tight">
                        {truncateFileName(attachment.file_name)}
                    </div>
                    <div className="text-[11px] text-[#667781] leading-tight mt-0.5">
                        {attachment.page_count > 0 && (
                            <span>{attachment.page_count} {attachment.page_count === 1 ? "page" : "pages"} · </span>
                        )}
                        <span>{formatFileSize(attachment.file_size)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
PdfAttachmentPreview.displayName = "PdfAttachmentPreview";

export default PdfAttachmentPreview;
