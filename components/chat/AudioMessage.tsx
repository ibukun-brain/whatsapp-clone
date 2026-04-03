import React, { useState, useRef, useEffect, memo } from 'react'
import { Play, Pause, Loader2, AlertCircle, Headphones, X, Download } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'

interface AudioMessageProps {
  file: MediaFile
  onRetry?: () => void
  onCancel?: () => void
  timestamp?: string
  isMine?: boolean
  receipt?: React.ReactNode
}

function formatDuration(seconds: number = 0) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
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

function AudioMessageComp({ file, onRetry, onCancel, timestamp, isMine, receipt }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(() => parseDurationHMS(file.duration))
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const isReady = file.status === 'ready'
  const isUploading = file.status === 'uploading' || file.status === 'processing'
  const isFailed = file.status === 'failed'

  const audioUrl = file.media_url || file.preview_url

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.preload = 'auto'
      audio.src = audioUrl
      audioRef.current = audio

      const handleLoadedMetadata = () => {
        if (!file.duration) setDuration(audio.duration)
      }
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
        audio.pause()
      }
    }
  }, [audioUrl, file.file_id, file.duration])

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio || !isReady || !audioUrl) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      try {
        // Ensure the src is set and loaded
        if (!audio.src || !audio.src.includes(audioUrl)) {
          audio.src = audioUrl
          audio.load()
        }

        // If the audio source failed before or is not loaded, try to load it
        if (audio.readyState === 0 || audio.error) {
          audio.load()
        }

        // Wait for it to be playable if not already (HAVE_CURRENT_DATA)
        if (audio.readyState < 2) { 
          await new Promise((resolve) => {
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay)
              audio.removeEventListener('error', onError)
              resolve(true)
            }
            const onError = () => {
              audio.removeEventListener('canplay', onCanPlay)
              audio.removeEventListener('error', onError)
              resolve(false)
            }
            audio.addEventListener('canplay', onCanPlay)
            audio.addEventListener('error', onError)
            setTimeout(resolve, 3500)
          })
        }

        if (audio.error) {
            throw new Error(`Browser rejected the audio source: ${audio.error.message || 'Unknown error'}`)
        }

        await audio.play()
        setIsPlaying(true)
      } catch (err) {
        console.error("Playback failed:", err)
        setIsPlaying(false)
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (!audioRef.current || !isReady) return

    const time = Number(e.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={cn(
      "flex min-w-[280px] max-w-[320px] items-start gap-2.5 py-1 px-1",
      isMine ? "" : "" // We let MessageBubble handle the main background usually
    )}>
      {/* 1. Large Orange Icon with Headphones */}
      <div className="relative shrink-0 mt-0.5">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#ffb02e] text-white">
          <Headphones className="h-7 w-7" strokeWidth={2.5} />
          {/* Status overlays if any */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {isFailed && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 text-white"
            >
              <AlertCircle className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-1">
        <div className="flex items-center gap-3">
          {/* 2. Play/Pause Button */}
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
                <Loader2 className="h-6 w-6 animate-spin text-[#00a884]" strokeWidth={2.5} />
                <X className="absolute h-3 w-3 text-[#54656f] opacity-0 group-hover/cancel:opacity-100 transition-opacity" strokeWidth={3} />
                <Headphones className="absolute h-3 w-3 text-[#54656f] group-hover/cancel:opacity-0 transition-opacity" />
              </div>
            ) : !isReady ? (
              <div className="flex items-center justify-center rounded-full bg-[#f8f9fa] border border-[#e9edef] p-1 shadow-sm hover:scale-105 transition-transform">
                <Download className="h-5 w-5 text-[#00a884]" />
              </div>
            ) : isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            )}
          </button>

          {/* 3. Seeker Column */}
          <div className="flex flex-1 flex-col gap-1.5 min-w-0 pr-2">
            <div className="relative h-6 flex items-center">
              <div className="relative w-full h-1 bg-[#b0bcc3] rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-[#33b1ff]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                disabled={!isReady}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                onClick={(e) => e.stopPropagation()}
              />
              {/* Custom Thumb */}
              <div
                className="absolute h-3.5 w-3.5 -ml-1.5 rounded-full bg-[#33b1ff] shadow-sm pointer-events-none z-0"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. Metadata Line (Timer & Timestamp) */}
        <div className="flex items-center justify-between text-[11.5px] text-[#667781] mt-0.5 px-0.5">
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

export default memo(AudioMessageComp, (prev, next) => {
  return (
    prev.file.file_id === next.file.file_id &&
    prev.file.status === next.file.status &&
    prev.file.progress === next.file.progress &&
    prev.file.media_url === next.file.media_url &&
    prev.timestamp === next.timestamp &&
    prev.isMine === next.isMine &&
    prev.receipt === next.receipt
  )
})
