"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Trash2, Pause, Play } from "lucide-react";
import { SendIcon } from "@/components/icons/chats-icon";
import { toast } from "sonner";
import { fixWebmDuration } from '@fix-webm-duration/fix';

interface VoiceRecorderProps {
    onStop: (file: File, duration: number) => void;
    onCancel: () => void;
    onDraft?: (blob: Blob, duration: number, mimeType: string) => void;
    /** If provided, the recorder starts in "draft playback" mode instead of recording */
    draftBlob?: Blob;
    draftDuration?: number;
    draftMimeType?: string;
    onPause?: () => void;
    onResume?: () => void;
}

const DottedLineStyles = () => (
    <style>{`
        @keyframes moveDottedLine {
            from { background-position: 5px 50%; }
            to { background-position: 0 50%; }
        }
        .dotted-line-base {
            background-image: linear-gradient(to right, #919ba1 50%, rgba(255, 255, 255, 0) 0%);
            background-size: 5px 3px;
            background-repeat: repeat-x;
            background-position: 0 50%;
        }
        .dotted-line-recording {
            background-image: linear-gradient(to right, #54656f 50%, rgba(255, 255, 255, 0) 0%);
            opacity: 1;
        }
        .dotted-line-animated {
            animation: moveDottedLine 0.4s linear infinite;
        }
    `}</style>
);

export const VoiceRecorder = ({ onStop, onCancel, onDraft, onPause, onResume, draftBlob, draftDuration, draftMimeType }: VoiceRecorderProps) => {
    const [isPaused, setIsPaused] = useState(!!draftBlob);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(draftDuration || 0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [smoothProgress, setSmoothProgress] = useState(0);
    const [isDraftMode, setIsDraftMode] = useState(!!draftBlob);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const isCancelledRef = useRef(false);
    const isSentRef = useRef(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(
        draftBlob ? URL.createObjectURL(draftBlob) : null
    );
    const durationRef = useRef(draftDuration || 0);

    // Get the most compatible MIME type for the browser
    const getMimeType = () => {
        const types = [
            'audio/webm; codecs=opus',
            'audio/webm',
            'audio/ogg; codecs=opus',
            'audio/mp4; codecs=opus',
            'audio/aac',
        ];
        return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/wav';
    };

    // Smooth playhead animation loop
    useEffect(() => {
        let rafId: number;

        const updateProgress = () => {
            if (audioPlayerRef.current && isPlaying) {
                const duration = audioPlayerRef.current.duration;
                if (duration && isFinite(duration)) {
                    const progress = (audioPlayerRef.current.currentTime / duration) * 100;
                    setSmoothProgress(progress);
                }
                rafId = requestAnimationFrame(updateProgress);
            }
        };

        if (isPlaying) {
            rafId = requestAnimationFrame(updateProgress);
        } else {
            if (audioPlayerRef.current) {
                const duration = audioPlayerRef.current.duration;
                if (duration && isFinite(duration)) {
                    setSmoothProgress((playbackTime / duration) * 100);
                } else {
                    setSmoothProgress(0);
                }
            }
        }

        return () => cancelAnimationFrame(rafId);
    }, [isPlaying, playbackTime]);

    useEffect(() => {
        if (!draftBlob) {
            startRecording();
        }

        return () => {
            if (!isCancelledRef.current && !isSentRef.current) {
                if (chunksRef.current.length > 0) {
                    const draftBlobToSave = new Blob(chunksRef.current, { type: getMimeType() });
                    onDraft?.(draftBlobToSave, durationRef.current, getMimeType());
                } else if (draftBlob) {
                    onDraft?.(draftBlob, durationRef.current, draftMimeType || getMimeType());
                }
            }
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanup = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        // Do not clear chunksRef here as finalizeRecording needs it
    };

    const isStartingRef = useRef(false);

    const startRecording = async (isResuming = false) => {
        // Prevent accidental double-start from React StrictMode or rapid clicks
        if (isStartingRef.current || (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')) {
            return;
        }
        
        isStartingRef.current = true;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = getMimeType();
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            // Only clear chunks if we're starting a completely new recording
            if (!isResuming && !isDraftMode && chunksRef.current.length === 0) {
                chunksRef.current = [];
            }

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.start(); 
            
            isCancelledRef.current = false;
            isSentRef.current = false;
            setIsDraftMode(false);

            startTimer();
        } catch (err) {
            console.error("Recording failed:", err);
            toast.error("Could not access microphone");
            onCancel();
        } finally {
            isStartingRef.current = false;
        }
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setDuration(prev => {
                const next = prev + 1;
                durationRef.current = next;
                return next;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleStop = async () => {
        isCancelledRef.current = false;
        isSentRef.current = true;

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            await new Promise<void>((resolve) => {
                mediaRecorderRef.current!.onstop = async () => {
                    await finalizeRecording();
                    resolve();
                };
                mediaRecorderRef.current!.stop();
            });
        } else {
            await finalizeRecording();
        }
    };

    const finalizeRecording = async () => {
        const mimeType = getMimeType();
        const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'm4a';
        
        if (chunksRef.current.length > 0) {
            const rawBlob = new Blob(chunksRef.current, { type: mimeType });
            if (rawBlob.size > 0) {
                let finalBlob: Blob = rawBlob;
                // Fix WebM duration metadata (browsers don't set it correctly)
                if (mimeType.includes('webm')) {
                    try {
                        finalBlob = await fixWebmDuration(rawBlob, durationRef.current * 1000);
                    } catch (e) {
                        console.warn('Failed to fix WebM duration, using raw blob:', e);
                    }
                }
                const file = new File([finalBlob], `voice-${Date.now()}.${extension}`, { type: mimeType });
                onStop(file, durationRef.current);
            }
        }
        chunksRef.current = []; // Clear for next time
        cleanup();
    };

    const handleCancel = () => {
        isCancelledRef.current = true;
        isSentRef.current = false;
        chunksRef.current = []; // Clear current buffer
        cleanup();
        onCancel();
    };

    const togglePause = () => {
        if (isPaused) {
            setIsPaused(false);
            if (isPlaying) {
                audioPlayerRef.current?.pause();
                setIsPlaying(false);
            }
            
            // Resume the existing recorder if it's just paused
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
                mediaRecorderRef.current.resume();
            } else {
                // Otherwise start a new one (e.g. resuming from draft)
                startRecording(true);
            }
            startTimer();
            onResume?.();
        } else {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                // Pause first to keep the session alive, then flush the current chunk
                mediaRecorderRef.current.pause();
                mediaRecorderRef.current.requestData();

                // Build preview blob from existing chunks
                const mimeType = getMimeType();
                const previewBlob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(previewBlob);
                setAudioUrl(prev => {
                    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                    return url;
                });
                onDraft?.(previewBlob, durationRef.current, mimeType);
            }
            stopTimer();
            setIsPaused(true);
            onPause?.();
        }
    };

    const resumeFromDraft = async () => {
        if (isPlaying) {
            audioPlayerRef.current?.pause();
            setIsPlaying(false);
        }

        setIsDraftMode(false);
        setIsPaused(false);
        
        if (draftBlob && chunksRef.current.length === 0) {
            chunksRef.current = [draftBlob]; 
        }
        
        await startRecording(true);
        onResume?.();
    };

    const handlePlayPausePlayback = async () => {
        if (!audioPlayerRef.current || !audioUrl) return;

        const audio = audioPlayerRef.current;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            try {
                if (audio.currentTime >= (audio.duration - 0.1)) {
                    audio.currentTime = 0;
                    setPlaybackTime(0);
                }

                if (!audio.src || !audio.src.includes(audioUrl)) {
                    audio.src = audioUrl;
                    audio.load();
                }

                if (audio.readyState === 0 || audio.error) {
                    audio.load();
                }

                if (audio.readyState < 2) {
                    await new Promise((resolve) => {
                        const onCanPlay = () => { resolve(true); audio.removeEventListener('canplay', onCanPlay); };
                        audio.addEventListener('canplay', onCanPlay);
                        setTimeout(resolve, 3000);
                    });
                }

                await audio.play();
                setIsPlaying(true);
            } catch (error) {
                console.error("Playback error:", error);
                setIsPlaying(false);
                toast.error("Playback failed.");
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center flex-1 px-4 justify-end animate-in slide-in-from-right-2 duration-200">
            <DottedLineStyles />
            <audio
                ref={audioPlayerRef}
                src={audioUrl || undefined}
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    if (audioPlayerRef.current) {
                        setPlaybackTime(audioPlayerRef.current.duration);
                    }
                }}
                onTimeUpdate={() => setPlaybackTime(audioPlayerRef.current?.currentTime || 0)}
                className="hidden"
            />

            <div className="flex items-center gap-4 md:w-80 lg:w-120">
                <button
                    onClick={handleCancel}
                    className="-mt-1.5 text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer shrink-0"
                    title="Discard"
                >
                    <Trash2 size={22} strokeWidth={1.5} />
                </button>

                <div className="shrink-0 ml-2">
                    {isPaused || isDraftMode ? (
                        <button
                            onClick={handlePlayPausePlayback}
                            className="text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer mt-1"
                        >
                            {isPlaying ? <Pause size={22} fill="currentColor" stroke="none" /> : <Play size={22} fill="currentColor" stroke="none" />}
                        </button>
                    ) : (
                        <div className="bg-[#ea0038] w-2.5 h-2.5 rounded-lg" />
                    )}
                </div>

                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="flex-1 relative h-6 flex items-center">
                        <div className={`w-full h-[3px] dotted-line-base ${!isPaused && !isDraftMode ? 'dotted-line-recording dotted-line-animated' : 'opacity-50'}`} />
                        <div
                            className={`absolute bg-[#00a884] w-2.5 h-2.5 rounded-full pointer-events-none ${(!isPaused && !isDraftMode) ? 'invisible' : ''}`}
                            style={{
                                top: '50%',
                                left: (isPaused || isDraftMode) ? `${smoothProgress}%` : '100%',
                                transform: `translate(-${(isPaused || isDraftMode) ? smoothProgress : 100}%, -50%)`
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[15px] text-[#54656f] font-normal min-w-[32px]">
                        {formatTime((isPaused || isDraftMode) && isPlaying ? playbackTime : duration)}
                    </span>

                    {isDraftMode ? (
                        <div className="cursor-pointer" onClick={resumeFromDraft} title="Continue recording">
                            <Mic size={22} className="text-[#ea0038]" />
                        </div>
                    ) : (
                        <div className={`cursor-pointer ${!isPaused ? "animate-pulse" : ""}`} onClick={togglePause}>
                            {!isPaused ? (
                                <Pause size={22} className="text-[#ea0038]" fill="currentColor" stroke="none" />
                            ) : (
                                <Mic size={22} className="text-[#ea0038]" />
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleStop}
                        className="w-11 h-11 rounded-full bg-[#00a884] flex items-center justify-center text-white hover:bg-[#008f72] transition-all shadow-sm cursor-pointer ml-1"
                    >
                        <SendIcon style={{ width: "20px", height: "20px" }} className="ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
