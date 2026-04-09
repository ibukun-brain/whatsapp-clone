import React, { useState, useRef, useEffect, memo, useMemo } from 'react'
import { Play, Pause, Loader2, Mic, Upload, Download, X } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn, formatDuration } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from "sonner"

import { useVoicePlaybackStore } from '@/lib/stores/voice-playback-store'

interface VoiceMessageProps {
  id?: string
  file?: MediaFile
  voice_message?: string
  voice_message_duration?: string
  status?: string
  onRetry?: () => void
  onCancel?: () => void
  onPlayNext?: () => void
  timestamp?: string
  isMine?: boolean
  receipt?: React.ReactNode
  senderAvatar?: string | null
  senderName?: string | null
  read_date?: Date | string | null
  delivered_date?: Date | string | null
  receiptStatus?: string | null
}


function parseDurationHMS(hms?: string | number): number {
  if (!hms) return 0
  if (typeof hms === 'number') return hms
  const parts = hms.split(':').map(Number)
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
  }
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1]
  }
  return parts[0] || 0
}

// Generate a deterministic waveform from a file_id seed
function generateWaveform(seed: string, bars: number = 42): number[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  const waveform: number[] = []
  for (let i = 0; i < bars; i++) {
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff)
    // Generate heights between 0.15 and 1.0 with a natural-looking distribution
    const normalized = (hash % 100) / 100
    // Apply a curve to make it look more speech-like (some tall, some short)
    waveform.push(0.15 + normalized * 0.85)
  }
  return waveform
}

function VoiceMessageComp({
  id,
  file,
  voice_message,
  voice_message_duration,
  status,
  onRetry,
  onCancel,
  onPlayNext,
  timestamp,
  isMine,
  receipt,
  senderAvatar,
  senderName,
  read_date,
  delivered_date,
  receiptStatus,
}: VoiceMessageProps) {
  const activeAudioId = useVoicePlaybackStore((s) => s.activeAudioId)
  const setActiveAudioId = useVoicePlaybackStore((s) => s.setActiveAudioId)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(() => parseDurationHMS(voice_message_duration))
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const currentStatus = status || file?.status
  const isReady = currentStatus === 'ready' || currentStatus === 'sent' || (!currentStatus && voice_message)
  const isUploading = currentStatus === 'uploading' || currentStatus === 'processing' || currentStatus === 'pending'

  const audioUrl = voice_message || file?.media_url || file?.preview_url

  // Generate a stable waveform based on file_id or voice_message URL
  const waveformBars = useMemo(() => generateWaveform(file?.file_id || voice_message || 'default', 42), [file?.file_id, voice_message])

  // Synchronize playback state with global store
  useEffect(() => {
    if (activeAudioId && activeAudioId !== id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    } else if (activeAudioId === id) {
      if (!isPlaying && audioRef.current && isReady) {
        const playAudio = async () => {
          try {
            await audioRef.current?.play();
            setIsPlaying(true);
          } catch (e) {
            console.error("Auto-play failed:", e);
          }
        };
        playAudio();
      }
    }
  }, [activeAudioId, id, isReady]);

  // Use requestAnimationFrame for smooth waveform playback animation
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const updateTime = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime)
        }
        animationFrameRef.current = requestAnimationFrame(updateTime)
      }
      animationFrameRef.current = requestAnimationFrame(updateTime)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPlaying])

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio || !isReady || !audioUrl) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      if (activeAudioId === id) {
        setActiveAudioId(null)
      }
    } else {
      try {
        setActiveAudioId(id || null)
        // Ensure the src is set and loaded
        // Use a more robust check for Blob URLs or different formats
        if (!audio.src || (audio.src !== audioUrl && !audio.src.endsWith(audioUrl))) {
          audio.src = audioUrl
          audio.load()
        }

        // If the audio source failed before or is not loaded, try to load it
        if (audio.readyState === 0 || audio.error) {
          audio.load()
        }

        // Wait for it to be playable if not already
        if (audio.readyState < 2) { // HAVE_CURRENT_DATA
          await new Promise((resolve) => {
            let timer: NodeJS.Timeout;
            const onCanPlay = () => {
              clearTimeout(timer);
              audio.removeEventListener('canplay', onCanPlay)
              audio.removeEventListener('error', onError)
              resolve(true)
            }
            const onError = () => {
              clearTimeout(timer);
              audio.removeEventListener('canplay', onCanPlay)
              audio.removeEventListener('error', onError)
              resolve(false)
            }
            audio.addEventListener('canplay', onCanPlay)
            audio.addEventListener('error', onError)
            // Timeout after 4 seconds
            timer = setTimeout(() => {
              audio.removeEventListener('canplay', onCanPlay)
              audio.removeEventListener('error', onError)
              resolve(false)
            }, 4000)
          })
        }

        if (audio.error) {
          const errorCode = audio.error.code;
          const errorMessage = audio.error.message || 'Unknown error';
          let detailedError = "Unknown playback error";

          if (errorCode === 1) detailedError = "Playback aborted";
          else if (errorCode === 2) detailedError = "Network error while loading audio";
          else if (errorCode === 3) detailedError = "Audio decoding failed (unsupported codec or corrupt file)";
          else if (errorCode === 4) detailedError = "Audio format not supported by this browser";

          throw new Error(`${detailedError}: ${errorMessage} (Code ${errorCode})`);
        }

        await audio.play()
        setIsPlaying(true)
      } catch (err) {
        console.error("Playback failed:", err)
        setIsPlaying(false)
        // If it's a support issue, inform the user
        if (err instanceof Error && err.message.includes("not supported")) {
          toast.error("Your browser doesn't support Ogg/Opus audio. Try using Chrome or Firefox.");
        }
      }
    }
  }

  const handleSeekFromWaveform = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (!audioRef.current || !isReady || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    const time = percent * duration
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }
  const progressPercent = Math.min(100, Math.max(0, duration > 0 ? (currentTime / duration) * 100 : 0))

  return (
    <div className={cn(
      "flex min-w-[280px] max-w-[340px] items-center gap-2 pt-1 pb-3 px-1.5", !isMine ? "flex-row-reverse" : ""
    )}>
      {/* Hidden Audio Element */}
      {audioUrl && isReady && (
      <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          loop={false}
          playsInline
          onLoadedMetadata={(e) => {
            const audio = e.target as HTMLAudioElement;
            const duration = audio.duration;
            if (isFinite(duration) && duration < 0) {
              setDuration(duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
            }
            if (activeAudioId === id) {
              setActiveAudioId(null);
            }
            // Trigger next audio play
            onPlayNext?.();
          }}
          onTimeUpdate={(e) => {
            if (!isPlaying && e.currentTarget.currentTime !== currentTime) {
              setCurrentTime(e.currentTarget.currentTime);
            }
          }}
        />
      )}
      {/* Play/Pause Button with Avatar */}
      <div className="absolute right-4 top-2 shrink-0">
        <Avatar className="h-[36px] w-[36px] border-none">
          {senderAvatar && <AvatarImage src={senderAvatar} alt={senderName || ""} className="object-center" />}
          <AvatarFallback className="bg-[#dfe5e7] text-[#54656f] text-lg font-medium">
            {senderName ? senderName.slice(0, 1).toUpperCase() : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#dfe5e7] to-[#c8cfd3]">
                <svg viewBox="0 0 212 212" className="h-full w-full">
                  <path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z" />
                  <path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.647.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.624 0 52.661-11.058 70.945-28.985v-.399s-.258-.609-.817-1.677a49.642 49.642 0 0 0-1.07-1.926c-.031-.055-.071-.118-.104-.174a56.135 56.135 0 0 0-1.447-2.324zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-1.215-5.494 36.68 36.68 0 0 0-3.648-8.298 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 37.67 37.67 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z" />
                </svg>
              </div>
            )}
          </AvatarFallback>
        </Avatar>
        {/* Microphone Badge */}
        <div className={cn("absolute flex h-5 w-5 items-center justify-center rounded-full", isMine ? "text-[#00a884] -bottom-0.5 -right-0.5" : "text-[#468cf5] -bottom-0.5 -left-0.5")}>
          <Mic className="h-3.5 w-3.5" strokeWidth={3} />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Play Button + Waveform Row */}
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isUploading) {
                onCancel?.();
              } else if (!isReady) {
                onRetry?.();
              } else {
                togglePlay(e as any);
              }
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center transition-colors cursor-pointer group/cancel",
              isReady ? "text-[#54656f]" : "text-[#54656f] hover:text-[#111b21]"
            )}
          >
            {isUploading ? (
              <div className="relative flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin " strokeWidth={2.5} />
                <X className="absolute h-3.5 w-3.5 text-[#54656f] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
                <Mic className="absolute h-3.5 w-3.5 text-[#54656f] group-hover:opacity-0 transition-opacity" />
              </div>
            ) : !isReady ? (
              isMine ? (
                <div className="flex items-center justify-center p-1 hover:scale-105 transition-transform">
                  <Upload className="h-5 w-5 text-[#54656f]" />
                </div>
              ) : <Download className="h-5 w-5" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Waveform Container */}
          <div
            className="flex items-center gap-[1.5px] h-8 cursor-pointer min-w-0 relative mx-1.5"
            onClick={handleSeekFromWaveform}
          >
            {waveformBars.map((height, i) => {
              const barPercent = (i / waveformBars.length) * 100
              const isPlayed = barPercent < progressPercent
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-colors duration-150 shrink-0",
                    isPlayed ? "bg-[#667781]" : "bg-[#c8cfd3]"
                  )}
                  style={{
                    width: '2.5px',
                    height: `${Math.max(4, height * 26)}px`,
                  }}
                />
              )
            })}
            {/* Seek dot */}
            <div
              className={cn("absolute h-3 w-3 rounded-full shadow-sm pointer-events-none", isMine ? "bg-[#54656f]" : "bg-[#468cf5]")}
              style={{
                top: '50%',
                left: `${progressPercent}%`,
                transform: `translate(-50%, -50%)`,
                display: "block"
              }}
            />
          </div>
        </div>

        {/* Duration + Timestamp Row */}
        <div className="flex items-center justify-between text-[11px] text-[#667781] mt-0 px-0.5 ml-9">
          <span className="tabular-nums">
            {isPlaying || currentTime > 0 ? formatDuration(currentTime) : formatDuration(duration)}
          </span>

          {(timestamp || receipt) && (
            <div className="absolute right-3.5 bottom-1  flex items-center gap-1">
              {timestamp && <span>{timestamp}</span>}
              {receipt}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(VoiceMessageComp, (prev, next) => {
  return (
    prev.file?.file_id === next.file?.file_id &&
    prev.file?.status === next.file?.status &&
    prev.voice_message === next.voice_message &&
    prev.voice_message_duration === next.voice_message_duration &&
    prev.status === next.status &&
    prev.timestamp === next.timestamp &&
    prev.isMine === next.isMine &&
    prev.senderAvatar === next.senderAvatar &&
    prev.senderName === next.senderName &&
    prev.id === next.id &&
    (prev.read_date ? new Date(prev.read_date).getTime() : 0) === (next.read_date ? new Date(next.read_date).getTime() : 0) &&
    (prev.delivered_date ? new Date(prev.delivered_date).getTime() : 0) === (next.delivered_date ? new Date(next.delivered_date).getTime() : 0) &&
    prev.receiptStatus === next.receiptStatus
  )
})
