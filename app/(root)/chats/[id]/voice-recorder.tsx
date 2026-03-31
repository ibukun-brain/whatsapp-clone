"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Trash2, Pause, Play } from "lucide-react";
import { SendIcon } from "@/components/icons/chats-icon";
import { toast } from "sonner";

interface VoiceRecorderProps {
    onStop: (file: File, duration: number) => void;
    onCancel: () => void;
    onDraft?: (blob: Blob, duration: number, mimeType: string) => void;
    /** If provided, the recorder starts in "draft playback" mode instead of recording */
    draftBlob?: Blob;
    draftDuration?: number;
    draftMimeType?: string;
}

export const VoiceRecorder = ({ onStop, onCancel, onDraft, draftBlob, draftDuration, draftMimeType }: VoiceRecorderProps) => {
    const [isPaused, setIsPaused] = useState(!!draftBlob);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(draftDuration || 0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [isDraftMode, setIsDraftMode] = useState(!!draftBlob);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    // If resuming from a draft, seed audioChunks with the draft blob
    const audioChunksRef = useRef<Blob[]>(draftBlob ? [draftBlob] : []);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const isCancelledRef = useRef(false);
    const isSentRef = useRef(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(
        draftBlob ? URL.createObjectURL(draftBlob) : null
    );
    const durationRef = useRef(draftDuration || 0);
    const mimeTypeRef = useRef(draftMimeType || '');

    useEffect(() => {
        if (!draftBlob) {
            startRecording();
        }
        return () => {
            // On unmount: if not cancelled and not sent, save as draft
            if (!isCancelledRef.current && !isSentRef.current && audioChunksRef.current.length > 0) {
                const mime = mimeTypeRef.current;
                const blob = new Blob(audioChunksRef.current, { type: mime });
                onDraft?.(blob, durationRef.current, mime);
            }

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                // Prevent the onstop from firing onStop callback
                mediaRecorderRef.current.onstop = () => {
                    mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    /** Start a fresh recording session. If `appendToDraft` is true, keeps existing
     *  chunks (from a restored draft) so the final file includes both old + new audio. */
    const startRecording = async (appendToDraft = false) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Prefer audio/ogg with opus codec, fallback to audio/webm with opus
            let mimeType: string;
            if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
                mimeType = 'audio/ogg; codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
                mimeType = 'audio/webm; codecs=opus';
            } else {
                mimeType = 'audio/webm';
            }
            mimeTypeRef.current = mimeType;

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            if (!appendToDraft) {
                // Fresh recording — clear chunks
                audioChunksRef.current = [];
                isCancelledRef.current = false;
                isSentRef.current = false;
            }
            // If appending, keep existing chunks (draft blob) and just add new ones

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                if (!isCancelledRef.current && isSentRef.current && audioChunksRef.current.length > 0) {
                    const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
                    const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mimeType });
                    onStop(file, durationRef.current);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start(100);

            if (!appendToDraft) {
                setDuration(0);
                durationRef.current = 0;
            }
            // When appending, duration continues from where it left off
            startTimer();
        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast.error("Could not access microphone");
            if (!appendToDraft) onCancel();
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

    /** Send the final recording (all chunks merged). */
    const handleStop = () => {
        isCancelledRef.current = false;
        isSentRef.current = true;

        if (isDraftMode) {
            // Sending from pure draft mode (user never resumed recording)
            // Build file from whatever chunks we have (draft blob)
            const mime = mimeTypeRef.current || draftMimeType || 'audio/ogg';
            const ext = mime.includes('ogg') ? 'ogg' : 'webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mime });
            const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mime });
            onStop(file, durationRef.current);
        } else {
            // Active or resumed recording — stop the MediaRecorder, which triggers onstop → onStop
            mediaRecorderRef.current?.stop();
        }
        stopTimer();
    };

    const handleCancel = () => {
        isCancelledRef.current = true;
        isSentRef.current = false;

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        stopTimer();
        onCancel();
    };

    /** Toggle pause/resume during an active recording session. */
    const togglePause = () => {
        if (!mediaRecorderRef.current) return;

        if (isPaused) {
            // Resume recording
            if (isPlaying) {
                audioPlayerRef.current?.pause();
                setIsPlaying(false);
            }
            mediaRecorderRef.current.resume();
            startTimer();
            setIsPaused(false);
        } else {
            // Pause recording
            mediaRecorderRef.current.pause();
            stopTimer();
            setIsPaused(true);

            // Generate a preview URL for playback
            const mimeType = mediaRecorderRef.current.mimeType;
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
        }
    };

    /** Resume recording from a draft — starts a new MediaRecorder session that
     *  appends to the existing draft blob. */
    const resumeFromDraft = async () => {
        // Stop any playback
        if (isPlaying) {
            audioPlayerRef.current?.pause();
            setIsPlaying(false);
        }

        setIsDraftMode(false);
        setIsPaused(false);
        // Duration continues from draft duration (already set)
        await startRecording(true);
    };

    const handlePlayPausePlayback = () => {
        if (!audioPlayerRef.current) return;

        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        } else {
            audioPlayerRef.current.play();
            setIsPlaying(true);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center flex-1 px-4 justify-end animate-in slide-in-from-right-2 duration-200">
            <audio
                ref={audioPlayerRef}
                src={audioUrl || undefined}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={() => setPlaybackTime(audioPlayerRef.current?.currentTime || 0)}
                className="hidden"
            />

            <div className="flex items-center gap-4 md:w-80 lg:w-120">
                {/* Trash Icon (Outline) */}
                <button
                    onClick={handleCancel}
                    className="-mt-1.5 text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer shrink-0"
                    title="Discard"
                >
                    <Trash2 size={22} strokeWidth={1.5} />
                </button>

                {/* Play/Pause Button */}
                <div className="shrink-0 ml-2">
                    {isPaused || isDraftMode ? (
                        <button
                            onClick={handlePlayPausePlayback}
                            className="text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer"
                        >
                            {isPlaying ? <Pause size={22} fill="currentColor" stroke="none" /> : <Play size={22} fill="currentColor" stroke="none" />}
                        </button>
                    ) : (
                        <button
                            onClick={togglePause}
                            className="text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer"
                        >
                            <Pause size={22} fill="currentColor" stroke="none" />
                        </button>
                    )}
                </div>

                {/* Waveform/Dotted Line Area */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="flex-1 relative h-6 flex items-center">
                        {/* Dotted Line */}
                        <div className="w-full border-t-[3px] border-dotted border-[#919ba1] opacity-50" />

                        {/* Playhead/End Dot */}
                        <div
                            className="absolute bg-[#00a884] w-2.5 h-2.5 rounded-full"
                            style={{
                                left: (isPaused || isDraftMode) && isPlaying && audioPlayerRef.current
                                    ? `${(playbackTime / audioPlayerRef.current.duration) * 100}%`
                                    : '100%'
                            }}
                        />
                    </div>
                </div>

                {/* Info & Send Area */}
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[15px] text-[#54656f] font-normal min-w-[32px]">
                        {formatTime((isPaused || isDraftMode) && isPlaying ? playbackTime : duration)}
                    </span>

                    {/* Mic / Pause indicator:
                        - Draft mode: mic to resume recording
                        - Active recording: pulsing pause (red) / mic (red) to toggle */}
                    {isDraftMode ? (
                        <div
                            className="cursor-pointer"
                            onClick={resumeFromDraft}
                            title="Continue recording"
                        >
                            <Mic size={22} className="text-[#ea0038]" />
                        </div>
                    ) : (
                        <div
                            className={`cursor-pointer ${!isPaused ? "animate-pulse" : ""}`}
                            onClick={togglePause}
                        >
                            {!isPaused ? (
                                <Pause size={22} className="text-[#ea0038]" fill="currentColor" stroke="none" />
                            ) : (
                                <Mic size={22} className="text-[#ea0038]" />
                            )}
                        </div>
                    )}

                    {/* Send Button */}
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
