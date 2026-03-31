import React, { useState, useRef, useEffect, memo, useMemo } from 'react'
import { Play, Pause, Loader2, Mic, Upload, Download } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'

interface VoiceMessageProps {
  file: MediaFile
  onRetry?: () => void
  timestamp?: string
  isMine?: boolean
  receipt?: React.ReactNode
  senderAvatar?: string | null
}

function formatDuration(seconds: number = 0) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Generate a deterministic waveform from a file_id seed
function generateWaveform(seed: string, bars: number = 40): number[] {
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

function VoiceMessageComp({ file, onRetry, timestamp, isMine, receipt, senderAvatar }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(file.duration || 0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const isReady = file.status === 'ready'
  const isUploading = file.status === 'uploading' || file.status === 'processing'
  const isFailed = file.status === 'failed'

  const audioUrl = file.media_url || file.preview_url

  // Generate a stable waveform based on file_id
  const waveformBars = useMemo(() => generateWaveform(file.file_id, 42), [file.file_id])

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      const handleLoadedMetadata = () => {
        if (!file.duration && isFinite(audio.duration)) setDuration(audio.duration)
      }
      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('ended', handleEnded)

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('ended', handleEnded)
        audio.pause()
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [audioUrl, file.file_id, file.duration])

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

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current || !isReady) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(console.error)
      setIsPlaying(true)
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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={cn(
      "flex min-w-[280px] max-w-[340px] items-center gap-2 py-1 px-1.5",
    )}>
      {/* Play/Pause Button with Avatar */}
      <div className="relative shrink-0">
        <div className={cn(
          "flex h-[52px] w-[52px] items-center justify-center rounded-full overflow-hidden",
          senderAvatar ? "" : "bg-[#dfe5e7]"
        )}>
          {senderAvatar ? (
            <img src={senderAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#dfe5e7] to-[#c8cfd3]">
              <svg viewBox="0 0 212 212" className="h-full w-full">
                <path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z" />
                <path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.647.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.624 0 52.661-11.058 70.945-28.985v-.399s-.258-.609-.817-1.677a49.642 49.642 0 0 0-1.07-1.926c-.031-.055-.071-.118-.104-.174a56.135 56.135 0 0 0-1.447-2.324zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-1.215-5.494 36.68 36.68 0 0 0-3.648-8.298 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 37.67 37.67 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z" />
              </svg>
            </div>
          )}
        </div>
        {/* Microphone Badge */}
        <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm">
          <Mic className="h-2.5 w-2.5" strokeWidth={3} />
        </div>
        {/* Status overlays */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col min-w-0 ml-1">
        {/* Play Button + Waveform Row */}
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            disabled={isUploading}
            onClick={(e) => {
              if (!isReady) {
                e.stopPropagation();
                onRetry?.();
              } else {
                togglePlay(e as any);
              }
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center transition-colors",
              (!isReady && !isUploading) ? "text-[#54656f] hover:text-[#111b21]" : (isUploading ? "text-gray-400" : "text-[#54656f]")
            )}
          >
            {!isReady ? (
              isMine ? <Upload className="h-6 w-6" /> : <Download className="h-6 w-6" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Waveform Container */}
          <div
            className="flex-1 flex items-center gap-[1.5px] h-8 cursor-pointer min-w-0"
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
                    isPlayed
                      ? (isMine ? "bg-[#6fb59f]" : "bg-[#6fb59f]")
                      : (isMine ? "bg-[#b3d5ca]" : "bg-[#c8cfd3]")
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
              className="absolute h-3 w-3 rounded-full bg-[#54656f] shadow-sm pointer-events-none"
              style={{
                left: `${progressPercent}%`,
                display: (isPlaying || currentTime > 0) ? 'block' : 'none'
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
            <div className="flex items-center gap-1">
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
    prev.file.file_id === next.file.file_id &&
    prev.file.status === next.file.status &&
    prev.file.progress === next.file.progress &&
    prev.file.media_url === next.file.media_url &&
    prev.timestamp === next.timestamp &&
    prev.isMine === next.isMine &&
    prev.receipt === next.receipt &&
    prev.senderAvatar === next.senderAvatar
  )
})
