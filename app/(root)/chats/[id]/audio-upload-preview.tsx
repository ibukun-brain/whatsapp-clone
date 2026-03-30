"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, Pause, Headphones, Send, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiIcon } from "@/components/icons/chats-icon";

interface AudioUploadPreviewProps {
    files: File[];
    onClose: () => void;
    onSend: (files: File[], captions: Record<number, string>) => void;
    onAddMore: () => void;
    onRemoveFile: (index: number) => void;
}

function formatDuration(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

const AudioUploadPreview = ({
    files,
    onClose,
    onSend,
    onAddMore,
    onRemoveFile,
}: AudioUploadPreviewProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [captions, setCaptions] = useState<Record<number, string>>({});
    const [previews, setPreviews] = useState<{ url: string; name: string; size: number; duration?: number }[]>([]);

    // Audio Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const results = files.map((file) => ({
            url: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
        }));
        setPreviews(results);

        return () => {
            results.forEach((p) => URL.revokeObjectURL(p.url));
        };
    }, [files]);

    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    }, [currentIndex]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSend = () => {
        // Construct new files with corrected mime type if needed (e.g. video/mpeg -> audio/mpeg)
        const correctedFiles = files.map((file) => {
            if (file.type.startsWith("video/")) {
                return new File([file], file.name, { type: "audio/mpeg", lastModified: file.lastModified });
            }
            return file;
        });
        onSend(correctedFiles, captions);
    };

    const currentFile = previews[currentIndex];
    if (!currentFile) return null;

    return (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#e9edef]">
                <button onClick={onClose} className="text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer">
                    <X size={22} />
                </button>
                <div className="text-[13px] text-[#667781] font-normal truncate max-w-[300px]">
                    {currentFile.name}
                </div>
                <div className="w-6" />
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white overflow-hidden">

                <div className="w-full max-w-md bg-[#f0f2f5] rounded-xl p-6 flex flex-col gap-4 border border-[#e9edef]">
                    <audio
                        ref={audioRef}
                        src={currentFile.url}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={handleEnded}
                        className="hidden"
                    />

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePlayPause}
                            className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center text-white hover:bg-[#008f72] transition-colors shadow-md"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>

                        <div className="flex-1 flex flex-col gap-1">
                            <div className="h-1.5 w-full bg-gray-300 rounded-full overflow-hidden relative">
                                <div
                                    className="absolute left-0 top-0 h-full bg-[#00a884] transition-all"
                                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[12px] text-[#667781] font-medium">
                                <span>{formatDuration(currentTime)}</span>
                                <span>{formatDuration(duration)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white px-6 py-3 flex flex-col gap-3">
                <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
                    <div className="bg-[#f0f2f5] rounded-lg px-3 py-2 flex-1 flex items-center gap-2 border border-[#e9edef]">
                        <textarea
                            placeholder="Add a caption"
                            className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#111b21] placeholder-[#8696a0] resize-none py-1 min-h-[24px] max-h-[120px] leading-tight"
                            rows={1}
                            value={captions[currentIndex] || ""}
                            onChange={(e) => {
                                setCaptions(prev => ({ ...prev, [currentIndex]: e.target.value }));
                                e.target.style.height = "auto";
                                e.target.style.height = e.target.scrollHeight + "px";
                            }}
                        />
                        <EmojiIcon className="w-6 h-6 text-[#8696a0] cursor-pointer hover:text-[#54656f] shrink-0" />
                    </div>

                    <button
                        onClick={handleSend}
                        className="w-11 h-11 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#008f72] transition-colors shrink-0"
                    >
                        <Send size={18} className="ml-0.5" />
                        {files.length > 1 && (
                            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-[#00a884] border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {files.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Thumbnails Tray */}
                <div className="flex items-center justify-center gap-2 py-1 overflow-x-auto">
                    {previews.map((_, idx) => (
                        <div key={idx} className="relative group shrink-0">
                            <button
                                onClick={() => onRemoveFile(idx)}
                                className="absolute -top-1 -right-1 z-10 w-4 h-4 bg-[#667781] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} className="text-white" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(idx)}
                                className={cn(
                                    "w-14 h-14 rounded-md flex flex-col items-center justify-center border-2 transition-all",
                                    currentIndex === idx ? "border-[#00a884] bg-[#ffb02e]" : "border-transparent bg-[#ffb02e] opacity-60 hover:opacity-100"
                                )}
                            >
                                <Headphones size={20} className="text-white" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={onAddMore}
                        className="w-14 h-14 rounded-md border border-dashed border-[#8696a0] flex items-center justify-center hover:bg-white transition-colors"
                    >
                        <Plus size={20} className="text-[#8696a0]" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioUploadPreview;
