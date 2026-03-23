import React, { useState, useEffect } from 'react'
import { Blurhash } from 'react-blurhash'
import { Loader2, RefreshCw, AlertCircle, X } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageMessageProps {
  file: MediaFile
  onRetry?: () => void
  onCancel?: () => void
  timestamp?: string
  receipt?: React.ReactNode
}

export default function ImageMessage({ file, onRetry, onCancel, timestamp, receipt }: ImageMessageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    // If we have a file_blob but no media_url (or not ready yet), create a URL
    if (file.file_blob && file.status !== 'ready') {
      const url = URL.createObjectURL(file.file_blob as Blob)
      setBlobUrl(url)
      
      return () => {
        URL.revokeObjectURL(url)
        setBlobUrl(null)
      }
    } else {
      setBlobUrl(null)
    }
  }, [file.file_blob, file.status])

  const aspectRatio = file.aspect_ratio || 1
  const maxWidth = 320
  const minWidth = 150
  
  // Dynamic width: try to use aspect ratio but stay within bounds
  // If it's a very tall image, we cap width and height
  const width = Math.max(minWidth, Math.min(maxWidth, 280))
  const height = Math.min(width / aspectRatio, 400)

  // Determine final image source
  const imageSrc = file.status === 'ready' ? file.media_url : (blobUrl || file.preview_url)

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-gray-200 group/image"
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
      {imageSrc && (
        <Image
          src={imageSrc || ''}
          alt={file.filename}
          fill={true}
          unoptimized={true}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            (file.status === 'ready' && isLoaded) || (file.status !== 'ready' && imageSrc) ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
        />
      )}

      {/* Layer 3: Overlays */}
      {(file.status === 'uploading' || file.status === 'processing') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="relative flex items-center justify-center w-12 h-12">
            {/* Spinner */}
            <Loader2 className="absolute inset-0 h-full w-full animate-spin text-white opacity-60" />

            {/* Cancel Button (Until fully ready) */}
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
          </div>
        </div>
      )}

      {/* Progress Bar (Circular or Bottom) */}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
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
      )}

      {/* Timestamp Overlay (WhatsApp Style) */}
      {(timestamp || receipt) && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-white z-10">
          <span>{timestamp}</span>
          {receipt}
        </div>
      )}
    </div>
  )
}
