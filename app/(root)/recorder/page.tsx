"use client"

import { useState, useRef, useEffect } from "react";

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
};

const WaveformBar = ({ active, height }: { active: boolean; height: number }) => (
    <div
        style={{
            width: "3px",
            height: `${height}px`,
            borderRadius: "2px",
            background: active ? "#e8c97e" : "#3a3a4a",
            transition: "height 0.1s ease, background 0.3s ease",
        }}
    />
);

export default function VoiceRecorder() {
    const [status, setStatus] = useState("idle"); // idle | recording | stopped
    const [recordings, setRecordings] = useState<any[]>([]);
    const [timer, setTimer] = useState(0);
    const [waveHeights, setWaveHeights] = useState(Array(28).fill(6));
    const [playingId, setPlayingId] = useState<number | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const audioElsRef = useRef<{ [id: number]: HTMLAudioElement }>({});

    const startWaveAnimation = (analyser: AnalyserNode) => {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            const bars = Array.from({ length: 28 }, (_, i) => {
                const idx = Math.floor((i / 28) * bufferLength * 0.6);
                const value = dataArray[idx] / 255;
                return Math.max(4, Math.round(value * 48));
            });
            setWaveHeights(bars);
        };
        draw();
    };

    const stopWaveAnimation = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setWaveHeights(Array(28).fill(6));
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtxRef.current.createMediaStreamSource(stream);
            const analyser = audioCtxRef.current.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];

            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const url = URL.createObjectURL(blob);
                const id = Date.now();
                setRecordings((prev) => [
                    { id, url, duration: timerRef.current ? timer : 0, label: `Recording ${prev.length + 1}` },
                    ...prev,
                ]);
                stream.getTracks().forEach((t) => t.stop());
            };

            mr.start();
            setStatus("recording");
            setTimer(0);

            timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
            startWaveAnimation(analyser);
        } catch (err) {
            alert("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        clearInterval(timerRef.current);
        stopWaveAnimation();
        if (audioCtxRef.current) audioCtxRef.current.close();
        setStatus("stopped");
    };

    const deleteRecording = (id: number) => {
        if (audioElsRef.current[id]) {
            audioElsRef.current[id].pause();
            delete audioElsRef.current[id];
        }
        if (playingId === id) setPlayingId(null);
        setRecordings((prev) => prev.filter((r) => r.id !== id));
    };

    const togglePlay = (rec: any) => {
        const existing = audioElsRef.current[rec.id];

        // Pause all others
        Object.entries(audioElsRef.current).forEach(([id, el]) => {
            if (Number(id) !== rec.id) {
                el.pause();
                el.currentTime = 0;
            }
        });

        if (existing && !existing.paused) {
            existing.pause();
            setPlayingId(null);
            return;
        }

        if (!existing) {
            const audio = new Audio(rec.url);
            audio.onended = () => setPlayingId(null);
            audioElsRef.current[rec.id] = audio;
        }

        audioElsRef.current[rec.id].play();
        setPlayingId(rec.id);
    };

    useEffect(() => () => clearInterval(timerRef.current), []);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#0e0e14",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                padding: "48px 16px",
                fontFamily: "'Courier New', monospace",
                color: "#d4d4e0",
            }}
        >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <div style={{ fontSize: "11px", letterSpacing: "6px", color: "#e8c97e", marginBottom: "8px", textTransform: "uppercase" }}>
                    Audio Studio
                </div>
                <h1
                    style={{
                        fontSize: "32px",
                        fontWeight: "700",
                        margin: 0,
                        color: "#f0f0f8",
                        letterSpacing: "-1px",
                    }}
                >
                    Voice Recorder
                </h1>
            </div>

            {/* Recorder Card */}
            <div
                style={{
                    background: "#16161f",
                    border: "1px solid #2a2a38",
                    borderRadius: "20px",
                    padding: "36px 32px",
                    width: "100%",
                    maxWidth: "420px",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                }}
            >
                {/* Timer */}
                <div
                    style={{
                        textAlign: "center",
                        fontSize: "52px",
                        fontWeight: "700",
                        letterSpacing: "4px",
                        color: status === "recording" ? "#e8c97e" : "#3a3a4a",
                        marginBottom: "28px",
                        transition: "color 0.4s ease",
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {formatTime(timer)}
                </div>

                {/* Waveform */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        height: "56px",
                        marginBottom: "32px",
                    }}
                >
                    {waveHeights.map((h, i) => (
                        <WaveformBar key={i} active={status === "recording"} height={h} />
                    ))}
                </div>

                {/* Status label */}
                <div
                    style={{
                        textAlign: "center",
                        fontSize: "11px",
                        letterSpacing: "3px",
                        textTransform: "uppercase",
                        marginBottom: "28px",
                        color:
                            status === "recording"
                                ? "#e8c97e"
                                : status === "stopped"
                                    ? "#7ec8a0"
                                    : "#3a3a4a",
                    }}
                >
                    {status === "recording"
                        ? "● Recording..."
                        : status === "stopped"
                            ? "✓ Saved"
                            : "Ready"}
                </div>

                {/* Control Button */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                    {status !== "recording" ? (
                        <button
                            onClick={startRecording}
                            style={{
                                width: "72px",
                                height: "72px",
                                borderRadius: "50%",
                                border: "2px solid #e8c97e",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                position: "relative",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#e8c97e22";
                                e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            <div
                                style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    background: "#e8c97e",
                                }}
                            />
                        </button>
                    ) : (
                        <button
                            onClick={stopRecording}
                            style={{
                                width: "72px",
                                height: "72px",
                                borderRadius: "50%",
                                border: "2px solid #e87e7e",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#e87e7e22";
                                e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            <div
                                style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "3px",
                                    background: "#e87e7e",
                                }}
                            />
                        </button>
                    )}
                </div>

                <div
                    style={{
                        textAlign: "center",
                        marginTop: "14px",
                        fontSize: "11px",
                        color: "#3a3a4a",
                        letterSpacing: "1px",
                    }}
                >
                    {status === "recording" ? "Click to stop" : "Click to record"}
                </div>
            </div>

            {/* Recordings List */}
            {recordings.length > 0 && (
                <div style={{ width: "100%", maxWidth: "420px", marginTop: "32px" }}>
                    <div
                        style={{
                            fontSize: "10px",
                            letterSpacing: "4px",
                            color: "#3a3a4a",
                            textTransform: "uppercase",
                            marginBottom: "14px",
                            paddingLeft: "4px",
                        }}
                    >
                        Recordings ({recordings.length})
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {recordings.map((rec) => (
                            <div
                                key={rec.id}
                                style={{
                                    background: "#16161f",
                                    border: `1px solid ${playingId === rec.id ? "#e8c97e44" : "#2a2a38"}`,
                                    borderRadius: "14px",
                                    padding: "16px 18px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "14px",
                                    transition: "border-color 0.3s ease",
                                }}
                            >
                                {/* Play / Pause */}
                                <button
                                    onClick={() => togglePlay(rec)}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "50%",
                                        border: "1px solid #2a2a38",
                                        background: playingId === rec.id ? "#e8c97e" : "transparent",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        transition: "all 0.2s ease",
                                        color: playingId === rec.id ? "#0e0e14" : "#e8c97e",
                                        fontSize: "14px",
                                    }}
                                >
                                    {playingId === rec.id ? "⏸" : "▶"}
                                </button>

                                {/* Info */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "13px", color: "#d4d4e0", marginBottom: "3px" }}>
                                        {rec.label}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#3a3a4a", letterSpacing: "1px" }}>
                                        {formatTime(rec.duration)}
                                    </div>
                                </div>

                                {/* Download */}
                                <a
                                    href={rec.url}
                                    download={`${rec.label}.webm`}
                                    style={{
                                        color: "#3a3a4a",
                                        fontSize: "16px",
                                        textDecoration: "none",
                                        transition: "color 0.2s",
                                        padding: "4px",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "#7ec8a0")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a4a")}
                                    title="Download"
                                >
                                    ↓
                                </a>

                                {/* Delete */}
                                <button
                                    onClick={() => deleteRecording(rec.id)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#3a3a4a",
                                        fontSize: "16px",
                                        padding: "4px",
                                        transition: "color 0.2s",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "#e87e7e")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a4a")}
                                    title="Delete"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}