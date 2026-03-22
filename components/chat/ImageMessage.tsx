import React, { useState } from 'react'
import { Blurhash } from 'react-blurhash'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'

interface ImageMessageProps {
  file: MediaFile
  onRetry?: () => void
}

export default function ImageMessage({ file, onRetry }: ImageMessageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  
  const aspectRatio = file.aspect_ratio || 1
  const width = 280
  const height = Math.min(width / aspectRatio, 400) // Caps height for very long images

  return (
    <div 
      className="relative overflow-hidden rounded-lg bg-gray-200"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Layer 1: Blurhash */}
      {file.blurhash && (
        <div className="absolute inset-0">
          <Blurhash
            hash={file.blurhash}
            width="100%"
            height="100%"
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </div>
      )}

      {/* Layer 2: Actual Image */}
      {(file.preview_url || file.media_url) && (
        <img
          src={(file.status === 'ready' ? file.media_url : file.preview_url) || ''}
          alt={file.filename}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            file.status === 'ready' && isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
        />
      )}

      {/* Layer 3: Overlays */}
      {(file.status === 'uploading' || file.status === 'processing') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="rounded-full bg-black/40 p-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {file.status === 'uploading' && (
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
          <div 
            className="h-full bg-white transition-all duration-300" 
            style={{ width: `${file.progress}%` }}
          />
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
