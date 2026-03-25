"use client";

import React, { useState, useEffect } from "react";
import {
    X, Plus, Send, Download, Play, Smile, Clock, History,
    Crop, Sparkles, Pencil, Square, Grid3X3, StickyNote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiIcon } from "@/components/icons/chats-icon";

interface PhotoVideoUploadPreviewProps {
    files: File[];
    onClose: () => void;
    onSend: (files: File[], captions: Record<number, string>) => void;
    onAddMore: () => void;
    onRemoveFile: (index: number) => void;
}

const PhotoVideoUploadPreview = ({
    files,
    onClose,
    onSend,
    onAddMore,
    onRemoveFile,
}: PhotoVideoUploadPreviewProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [captions, setCaptions] = useState<Record<number, string>>({});
    const [previews, setPreviews] = useState<
        {
            url: string;
            type: string;
            name: string;
            size: number;
            thumbnail?: string;
        }[]
    >([]);

    // Generate thumbnails and URLs
    useEffect(() => {
        const loadPreviews = async () => {
            const results = await Promise.all(files.map(async (file) => {
                const url = URL.createObjectURL(file);
                let thumbnail: string | undefined;

                if (file.type.startsWith("video/")) {
                    thumbnail = await new Promise<string>((resolve) => {
                        const video = document.createElement("video");
                        video.src = url;
                        video.crossOrigin = "anonymous";
                        video.currentTime = 0.1;
                        video.onloadeddata = () => { video.currentTime = 0.1; };
                        video.onseeked = () => {
                            const canvas = document.createElement("canvas");
                            canvas.width = 160;
                            canvas.height = 100;
                            const ctx = canvas.getContext("2d");
                            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                            resolve(canvas.toDataURL("image/jpeg"));
                        };
                        setTimeout(() => resolve(""), 3000);
                    });
                }

                return {
                    url,
                    type: file.type,
                    name: file.name,
                    size: file.size,
                    thumbnail,
                };
            }));
            setPreviews(results);
        };

        loadPreviews();

        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p.url));
        };
    }, [files]);

    const handleDownload = () => {
        const current = previews[currentIndex];
        if (!current) return;
        const link = document.createElement('a');
        link.download = `whatsapp-${current.name}`;
        link.href = current.url;
        link.click();
    };

    const currentFileData = previews[currentIndex];
    if (!currentFileData) return null;

    const isImage = currentFileData.type.startsWith("image/");
    const isVideo = currentFileData.type.startsWith("video/");

    return (
        <div className={cn(
            "absolute inset-0 z-40 flex flex-col animate-in fade-in duration-200 bg-white",
        )}>
            {/* Header / Global Navigation */}
            <div className="flex items-center justify-between px-5 py-3 h-[60px] z-50">
                <button onClick={onClose} className={cn(
                    "p-2 rounded-full transition-all text-[#54656f] hover:bg-gray-100"
                )}>
                    <X size={24} />
                </button>

                {/* Toolbar for Image mode (Placeholder icons) */}
                {isImage && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2">
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Rotate">
                            <Crop size={22} />
                        </button>
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Enhance">
                            <Sparkles size={22} />
                        </button>
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Draw">
                            <Pencil size={22} />
                        </button>
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Text">
                            <span className="font-bold text-lg leading-none px-1">Aa</span>
                        </button>
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Shape">
                            <Square size={22} />
                        </button>
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Mosaic">
                            <Grid3X3 size={22} />
                        </button>
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Emoji">
                            <Smile size={22} />
                        </button>
                        <button className="p-2 text-[#54656f] hover:bg-gray-100 rounded-full" title="Sticker">
                            <StickyNote size={22} />
                        </button>
                    </div>
                )}

                <button onClick={handleDownload} className={cn("text-[#54656f] hover:bg-gray-100")}>
                    <Download size={24} />
                </button>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden p-6">
                {isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={currentFileData.url}
                        alt={currentFileData.name}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : isVideo ? (
                    <video
                        src={currentFileData.url}
                        controls
                        autoPlay
                        loop
                        className="max-w-full max-h-full object-contain z-10"
                    />
                ) : (
                    <div className="text-[#54656f]">Preview unavailable</div>
                )}
            </div>

            {/* Bottom Section */}
            <div className={cn(
                "w-full flex flex-col gap-3 p-4 pb-8 z-50 bg-white"
            )}>
                {/* Caption Input + Send (Unified with FileUploadPreview) */}
                <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
                    <div className="bg-white rounded-lg px-3 py-2 flex-1 flex items-center gap-2 shadow-sm border border-[#e9edef]">
                        <textarea
                            placeholder="Add a caption"
                            className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#111b21] placeholder-[#8696a0] resize-none py-1 min-h-[24px] max-h-[120px] leading-tight"
                            rows={1}
                            value={captions[currentIndex] || ""}
                            onChange={(e) => {
                                setCaptions(prev => ({ ...prev, [currentIndex]: e.target.value }));
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    onSend(files, captions);
                                }
                            }}
                        />
                        <EmojiIcon className="w-6 h-6 text-[#8696a0] cursor-pointer hover:text-[#54656f] transition-colors shrink-0" />
                    </div>

                    <button
                        onClick={() => onSend(files, captions)}
                        className="w-11 h-11 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#008f72] transition-colors shrink-0 cursor-pointer relative"
                    >
                        <Send size={18} className="ml-0.5" />
                        {files.length > 1 && (
                            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-[#00a884] border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {files.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Thumbnail Bar */}
                <div className="flex items-center justify-center gap-4 overflow-x-auto no-scrollbar py-2">
                    {previews.map((preview, idx) => (
                        <div key={idx} className="relative group shrink-0">
                            <button
                                onClick={() => setCurrentIndex(idx)}
                                className={cn(
                                    "relative w-[52px] h-[52px] rounded-lg overflow-hidden border-2 transition-all",
                                    currentIndex === idx ? "border-[#00a884] scale-110" : "border-transparent"
                                )}
                            >
                                {preview.thumbnail ? (
                                    <div className="relative w-full h-full">
                                        <img src={preview.thumbnail} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                            <Play size={16} className="text-white fill-white" />
                                        </div>
                                    </div>
                                ) : (
                                    <img src={preview.url} alt="" className="w-full h-full object-cover" />
                                )}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveFile(idx); }}
                                className="absolute -top-2 -right-2 bg-gray-500 rounded-full text-white p-1 opacity-0 group-hover:opacity-100 z-10"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={onAddMore}
                        className={cn(
                            "w-[52px] h-[52px] rounded-lg border-2 border-dashed flex items-center justify-center transition-all shrink-0 border-gray-300 text-gray-400 hover:bg-gray-50"
                        )}
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default PhotoVideoUploadPreview;
