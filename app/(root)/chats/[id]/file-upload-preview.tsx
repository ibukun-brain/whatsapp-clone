"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Send, FileText } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { EmojiIcon } from "@/components/icons/chats-icon";

interface FileUploadPreviewProps {
    files: File[];
    onClose: () => void;
    onSend: (files: File[], captions: Record<number, string>) => void;
    onAddMore: () => void;
    onRemoveFile: (index: number) => void;
}

/** Return e.g. "DOCX", "PDF", "TXT" from a file name */
function getExtension(name: string): string {
    const parts = name.split(".");
    if (parts.length < 2) return "FILE";
    return parts[parts.length - 1].toUpperCase();
}

/** Human-readable file size */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Renders the first page of a PDF onto a canvas and returns a data URL */
async function renderPdfFirstPage(url: string): Promise<string | null> {
    try {
        // Dynamically import pdfjs-dist
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        return canvas.toDataURL("image/png");
    } catch {
        return null;
    }
}

const FileUploadPreview = ({
    files,
    onClose,
    onSend,
    onAddMore,
    onRemoveFile,
}: FileUploadPreviewProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [captions, setCaptions] = useState<Record<number, string>>({});
    const [previews, setPreviews] = useState<
        {
            url: string;
            type: string;
            name: string;
            size: number;
            ext: string;
            pdfThumb: string | null;
        }[]
    >([]);

    // Generate object URLs and PDF thumbnails
    useEffect(() => {
        let cancelled = false;

        const generate = async () => {
            const results = await Promise.all(
                files.map(async (file) => {
                    const url = URL.createObjectURL(file);
                    const ext = getExtension(file.name);
                    let pdfThumb: string | null = null;

                    if (ext === "PDF") {
                        pdfThumb = await renderPdfFirstPage(url);
                    }

                    return {
                        url,
                        type: file.type,
                        name: file.name,
                        size: file.size,
                        ext,
                        pdfThumb,
                    };
                })
            );

            if (!cancelled) setPreviews(results);
        };

        generate();

        return () => {
            cancelled = true;
            // Revoke old URLs
            previews.forEach((p) => URL.revokeObjectURL(p.url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    // Keep index in bounds and auto-select new files
    const prevFilesLengthRef = useRef(files.length);
    useEffect(() => {
        if (files.length === 0) {
            onClose();
        } else if (files.length > prevFilesLengthRef.current) {
            // A new file was added, jump to it
            setCurrentIndex(files.length - 1);
        } else if (currentIndex >= files.length) {
            // A file was removed and the index is now out of bounds
            setCurrentIndex(files.length - 1);
        }
        prevFilesLengthRef.current = files.length;
    }, [files.length, currentIndex, onClose]);

    const currentFile = previews[currentIndex];

    const handleSend = () => {
        onSend(files, captions);
    };

    const handleCaptionChange = (value: string) => {
        setCaptions((prev) => ({ ...prev, [currentIndex]: value }));
    };

    const handleRemove = (idx: number) => {
        // Also remove the caption for that index and re-index
        setCaptions((prev) => {
            const next: Record<number, string> = {};
            Object.entries(prev).forEach(([k, v]) => {
                const key = Number(k);
                if (key < idx) next[key] = v;
                else if (key > idx) next[key - 1] = v;
                // skip the removed index
            });
            return next;
        });
        onRemoveFile(idx);
    };

    if (!currentFile) {
        return (
            <div className="absolute inset-0 z-40 bg-white flex flex-col items-center justify-center animate-in fade-in duration-200">
                <div className="animate-spin rounded-full px-2 py-2">
                    <svg className="w-10 h-10 text-[#00a884]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <div className="text-[#667781] text-[15px] font-medium mt-4">
                    Preparing preview...
                </div>
            </div>
        );
    }

    const isImage = currentFile.type.startsWith("image/");
    const isVideo = currentFile.type.startsWith("video/");
    const isPdf = currentFile.ext === "PDF";

    return (
        <div className="absolute inset-0 z-40 bg-white flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#e9edef]">
                <button
                    onClick={onClose}
                    className="text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer"
                >
                    <X size={22} />
                </button>
                <div className="text-[13px] text-[#667781] font-normal truncate max-w-[300px]">
                    {currentFile.name}
                </div>
                <div className="w-6" />
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-white">
                {isImage ? (
                    <div className="relative w-full h-full max-w-3xl">
                        <Image
                            src={currentFile.url}
                            alt={currentFile.name}
                            fill
                            className="object-contain"
                        />
                    </div>
                ) : isVideo ? (
                    <video
                        src={currentFile.url}
                        controls
                        className="max-w-full max-h-full rounded-lg"
                    />
                ) : isPdf && currentFile.pdfThumb ? (
                    <div className="w-full h-full max-w-2xl flex items-center justify-center">
                        <div className="rounded-lg shadow-lg overflow-hidden bg-white max-h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentFile.pdfThumb}
                                alt={currentFile.name}
                                className="max-h-[calc(100vh-280px)] w-auto object-contain"
                            />
                        </div>
                    </div>
                ) : (
                    /* Non-PDF document — "No preview available" card */
                    <div className="bg-[#e9edef] w-[320px] rounded-xl flex flex-col items-center justify-center p-10 text-center gap-3">
                        {/* White page with folded corner */}
                        <svg width="90" height="110" viewBox="0 0 90 110" fill="none">
                            <path d="M0 4C0 1.79 1.79 0 4 0H65L90 25V106C90 108.21 88.21 110 86 110H4C1.79 110 0 108.21 0 106V4Z" fill="white" />
                            <path d="M65 0L90 25H69C66.79 25 65 23.21 65 21V0Z" fill="#d5dadd" />
                        </svg>
                        <div className="text-[#667781] text-[16px] font-normal mt-2">
                            No preview available
                        </div>
                        <div className="text-[#8696a0] text-[13px]">
                            {formatFileSize(currentFile.size)} - {currentFile.ext}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white px-6 py-3 flex flex-col gap-3">
                {/* Caption Input + Send */}
                <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
                    <div className="bg-white rounded-lg px-3 py-2 flex-1 flex items-center gap-2 shadow-sm">
                        <input
                            type="text"
                            placeholder="Type a message"
                            className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#111b21] placeholder-[#8696a0]"
                            value={captions[currentIndex] || ""}
                            onChange={(e) => handleCaptionChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <EmojiIcon className="w-6 h-6 text-[#8696a0] cursor-pointer hover:text-[#54656f] transition-colors" />
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        className="w-11 h-11 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#008f72] transition-colors shrink-0 cursor-pointer relative"
                    >
                        <Send size={18} className="ml-0.5" />
                        {files.length > 1 && (
                            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-[#00a884] border-2 border-[#f0f2f5] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {files.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Thumbnails Tray */}
                <div className="flex items-center justify-center gap-2 py-1">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {previews.map((preview, idx) => {
                            const isImg = preview.type.startsWith("image/");
                            const isPreviewPdf = preview.ext === "PDF";

                            return (
                                <div key={idx} className="relative group shrink-0">
                                    {/* Remove button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(idx);
                                        }}
                                        className="absolute -top-[px] right-0.5 z-10 w-4 h-4 bg-[#667781] hover:bg-[#54656f] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        <X size={12} className="text-white" />
                                    </button>

                                    <button
                                        onClick={() => setCurrentIndex(idx)}
                                        className={cn(
                                            "relative w-14 h-14 rounded-md overflow-hidden border-2 transition-all",
                                            currentIndex === idx
                                                ? "border-[#00a884]"
                                                : "border-transparent hover:border-[#8696a0]"
                                        )}
                                    >
                                        {isImg ? (
                                            <Image
                                                src={preview.url}
                                                alt=""
                                                fill
                                                className="object-cover"
                                            />
                                        ) : isPreviewPdf && preview.pdfThumb ? (
                                            <Image
                                                src={preview.pdfThumb}
                                                alt=""
                                                fill
                                                className="object-cover"
                                            />
                                        ) : isPreviewPdf ? (
                                            <div className="w-full h-full bg-white flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-red-600">
                                                    PDF
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-[#dfe5e7] flex items-center justify-center">
                                                <span className="text-[9px] font-bold text-[#667781] leading-none">
                                                    {preview.ext}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            );
                        })}

                        {/* Add more button */}
                        <button
                            onClick={onAddMore}
                            className="w-14 h-14 rounded-md bg-white/70 flex items-center justify-center shrink-0 hover:bg-white transition-colors border border-[#e9edef] cursor-pointer"
                        >
                            <Plus size={22} className="text-[#54656f]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileUploadPreview;
