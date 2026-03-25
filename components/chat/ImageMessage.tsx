import React, { useState, useEffect, memo } from 'react'
import { Blurhash } from 'react-blurhash'
import { Loader2, X, Download } from 'lucide-react'
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

function ImageMessageComp({ file, onRetry, onCancel, timestamp, receipt }: ImageMessageProps) {
  const isReady = file.status === 'ready'
  const [isLoaded, setIsLoaded] = useState(isReady) // Start as loaded if already ready
  const [serverLoaded, setServerLoaded] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    // If we have a file_blob, create a URL
    if (file.file_blob) {
      const url = URL.createObjectURL(file.file_blob as Blob)
      setBlobUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, []) // Only on mount/unmount to preserve the blob across ID swaps

  const aspectRatio = file.aspect_ratio || 1
  const maxWidth = 320
  const minWidth = 150

  // Dynamic width: try to use aspect ratio but stay within bounds
  const width = Math.max(minWidth, Math.min(maxWidth, 280))
  const height = Math.min(width / aspectRatio, 400)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-gray-200 group/image"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Layer 1: Blurhash — shown when not ready OR failed */}
      {file.blurhash && (file.status !== 'ready' || !isLoaded) && (
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
      {(file.media_url || blobUrl || file.preview_url) && (
        <Image
          src={isReady && (serverLoaded || !blobUrl) ? (file.media_url || '') : (blobUrl || file.preview_url || '')}
          alt={file.filename}
          fill={true}
          unoptimized={true}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            isReady ? "" : "transition-opacity duration-500",
            (isLoaded || blobUrl) && file.status !== 'failed' ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => {
            if (isReady) setServerLoaded(true)
            setIsLoaded(true)
          }}
        />
      )}

      {/* Layer 3: Overlays */}
      {(file.status === 'uploading' || file.status === 'processing') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="relative flex items-center justify-center w-12 h-12">
            <Loader2 className="absolute inset-0 h-full w-full animate-spin text-white opacity-60 font-bold" strokeWidth={3} />
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

      {/* Progress Bar */}
      {file.status === 'uploading' && (
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}

      {/* Failed / Not Downloaded State (The Pill) */}
      {(file.status === 'failed' || (!isReady && !blobUrl && !file.preview_url)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-[1px]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry?.()
            }}
            className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-black/70 transition-all active:scale-95 shadow-lg border border-white/10"
          >
            <Download className="h-5 w-5" strokeWidth={2.5} />
            <span>{formatFileSize(file.file_size)}</span>
          </button>
        </div>
      )}

      {/* Timestamp Overlay */}
      {(timestamp || receipt) && (
        <div className={cn(
          "absolute bottom-1 right-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-white z-10",
          !isReady ? "bg-black/30 backdrop-blur-sm" : ""
        )}>
          <span>{timestamp}</span>
          {receipt}
        </div>
      )}
    </div>
  )
}

export default memo(ImageMessageComp, (prev, next) => {
  const same = (
    prev.file.file_id === next.file.file_id &&
    prev.file.status === next.file.status &&
    prev.file.progress === next.file.progress &&
    prev.file.media_url === next.file.media_url &&
    prev.file.caption === next.file.caption &&
    prev.timestamp === next.timestamp &&
    prev.receipt === next.receipt
  );
  if (!same) console.log("ImageMessage memo fail", prev.file.file_id);
  return same;
})
