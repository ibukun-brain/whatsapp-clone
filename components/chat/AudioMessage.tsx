import React, { useState, useRef, useEffect, memo } from 'react'
import { Play, Pause, Loader2, AlertCircle } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'

interface AudioMessageProps {
  file: MediaFile
  onRetry?: () => void
}

function formatDuration(seconds: number = 0) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioMessageComp({ file, onRetry }: AudioMessageProps) {
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
  }, [audioUrl, file.file_id])

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
    <div className="flex min-w-[240px] max-w-[300px] items-center gap-3 rounded-lg bg-black/5 p-3 dark:bg-white/5">
      <div className="relative shrink-0">
        {isUploading ? (
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-500">
             <Loader2 className="h-5 w-5 animate-spin" />
           </div>
        ) : isFailed ? (
          <button 
             onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
             className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/20"
          >
            <AlertCircle className="h-5 w-5" />
          </button>
        ) : (
          <button 
             disabled={!isReady}
             onClick={togglePlay}
             className={cn(
               "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
               isReady 
                 ? "bg-green-500 text-white hover:bg-green-600" 
                 : "bg-gray-300 text-gray-500 dark:bg-gray-700"
             )}
          >
            {isPlaying ? (
               <Pause className="h-5 w-5 fill-current ml-0" />
            ) : (
               <Play className="h-5 w-5 fill-current ml-1" />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-hidden">
        <div className="relative mb-1 flex h-6 items-center">
            {isUploading ? (
               <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                 <div 
                   className="h-full bg-green-500 transition-all duration-300" 
                   style={{ width: `${file.progress}%` }}
                 />
               </div>
            ) : (
                <div className="relative flex w-full items-center">
                  <div className="absolute h-1 w-full rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div 
                     className="absolute h-1 rounded-full bg-green-500" 
                     style={{ width: `${progressPercent}%` }}
                  />
                  <input
                     type="range"
                     min="0"
                     max={duration || 100}
                     value={currentTime}
                     onChange={handleSeek}
                     disabled={!isReady}
                     className="absolute w-full cursor-pointer opacity-0 z-10"
                     onClick={(e) => e.stopPropagation()}
                  />
                  <div 
                     className="absolute h-3 w-3 -ml-1.5 rounded-full bg-green-500 shadow pointer-events-none transition-all"
                     style={{ left: `${progressPercent}%` }}
                  />
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
           {isUploading ? (
             <span>{file.progress}% Uploading</span>
           ) : isFailed ? (
             <span className="text-red-500">Failed to upload</span>
           ) : (
             <>
               <span className="tabular-nums w-[35px]">
                 {isPlaying ? formatDuration(currentTime) : formatDuration(duration)}
               </span>
               {(file.mime_type ?? '').split('/')[1]?.toUpperCase() || 'AUDIO'} • {((file.file_size || 0) / 1024 / 1024).toFixed(1)}MB
             </>
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
    prev.file.media_url === next.file.media_url
  )
})
