import React, { useState, useEffect } from 'react'
import { MediaFile } from '@/types/mediaTypes'
import { Play, Loader2, RefreshCw, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoMessageProps {
  file: MediaFile
  onRetry?: () => void
  onCancel?: () => void
  timestamp?: string
  receipt?: React.ReactNode
}

export default function VideoMessage({ file, onRetry, onCancel, timestamp, receipt }: VideoMessageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const isReady = file.status === 'ready'

  useEffect(() => {
    if (file.file_blob && !isReady) {
      const url = URL.createObjectURL(file.file_blob as Blob)
      setBlobUrl(url)
      return () => {
        URL.revokeObjectURL(url)
        setBlobUrl(null)
      }
    } else {
      setBlobUrl(null)
    }
  }, [file.file_blob, isReady])

  const aspectRatio = file.aspect_ratio || 1.77
  const maxWidth = 320
  const minWidth = 150
  
  const width = Math.max(minWidth, Math.min(maxWidth, 280))
  const height = width / aspectRatio

  const videoSrc = isReady ? file.media_url : (blobUrl || file.preview_url)

  return (
    <div 
      className="relative overflow-hidden rounded-lg bg-black/10 group/video"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {isReady ? (
        <video 
          src={videoSrc || ''} 
          controls 
          className="h-full w-full object-cover"
          poster={file.thumbnail_url || undefined}
        />
      ) : (
        <div className="relative h-full w-full">
          {/* Video Preview / Local Preview */}
          {videoSrc && (
            <video 
              src={videoSrc} 
              className="h-full w-full object-cover opacity-80"
              muted
              playsInline
            />
          )}

          {/* Play Icon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/40 p-3 text-white backdrop-blur-sm">
              <Play className="h-8 w-8 fill-current" />
            </div>
          </div>

          {/* Uploading / Processing Overlay */}
          {(file.status === 'uploading' || file.status === 'processing') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
              <div className="relative flex items-center justify-center w-12 h-12">
                {/* Spinner */}
                <Loader2 className="absolute inset-0 h-full w-full animate-spin text-white opacity-60" />
                
                {/* Cancel Button (Until fully ready) */}
                {(file.status === 'uploading' || file.status === 'processing') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onCancel?.()
                    }}
                    className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-20"
                    title="Cancel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {file.status === 'uploading' && (
            <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
              <div 
                className="h-full bg-green-500 transition-all duration-300" 
                style={{ width: `${file.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Failed State */}
      {file.status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-black/60 p-4 text-white">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="text-sm font-bold">Failed to send</span>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onRetry?.()
              }}
              className="mt-1 flex items-center gap-1.5 rounded-full bg-black/60 px-4 py-1.5 text-xs font-bold text-white hover:bg-black/80 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-white" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Timestamp Overlay */}
      {(timestamp || receipt) && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white backdrop-blur-[2px] z-10">
          <span>{timestamp}</span>
          {receipt}
        </div>
      )}
    </div>
  )
}
