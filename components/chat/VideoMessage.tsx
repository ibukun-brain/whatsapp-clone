import React from 'react'
import { MediaFile } from '@/types/mediaTypes'
import { Play, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoMessageProps {
  file: MediaFile
  onRetry?: () => void
}

export default function VideoMessage({ file, onRetry }: VideoMessageProps) {
  const isReady = file.status === 'ready'
  const width = 280
  const height = 280 / (file.aspect_ratio || 1.77) // Default to 16:9 for videos

  return (
    <div 
      className="relative overflow-hidden rounded-lg bg-black/10"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {isReady ? (
        <video 
          src={file.media_url || ''} 
          controls 
          className="h-full w-full object-cover"
          poster={file.thumbnail_url || undefined}
        />
      ) : (
        <div className="relative h-full w-full">
          {/* Thumbnail / Local Preview */}
          {(file.thumbnail_url || file.preview_url) && (
            <img 
              src={file.thumbnail_url || file.preview_url || ''} 
              alt={file.filename}
              className="h-full w-full object-cover opacity-80"
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="rounded-full bg-black/40 p-2 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/20 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-black/60 p-4 text-white">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <span className="text-sm font-medium">Failed to send</span>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onRetry?.()
              }}
              className="mt-1 flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
