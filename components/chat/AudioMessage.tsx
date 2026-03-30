import React, { useState, useRef, useEffect, memo } from 'react'
import { Play, Pause, Loader2, AlertCircle, Headphones } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'

interface AudioMessageProps {
  file: MediaFile
  onRetry?: () => void
  timestamp?: string
  isMine?: boolean
  receipt?: React.ReactNode
}

function formatDuration(seconds: number = 0) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioMessageComp({ file, onRetry, timestamp, isMine, receipt }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(file.duration || 0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const isReady = file.status === 'ready'
  const isUploading = file.status === 'uploading' || file.status === 'processing'
  const isFailed = file.status === 'failed'

  const audioUrl = file.media_url || file.preview_url

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
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
             disabled={!isReady}
             onClick={togglePlay}
             className={cn(
               "flex h-8 w-8 shrink-0 items-center justify-center transition-colors",
               isReady ? "text-[#54656f]" : "text-gray-400"
             )}
          >
            {isPlaying ? (
               <Pause className="h-6 w-6 fill-current" />
            ) : (
               <Play className="h-6 w-6 fill-current" />
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
