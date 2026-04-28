import React, { useState, useEffect, memo } from 'react'
import { MediaFile } from '@/types/mediaTypes'
import { Play, Loader2, RefreshCw, X, Download } from 'lucide-react'
import { Blurhash } from 'react-blurhash'
import { cn } from '@/lib/utils'

interface VideoMessageProps {
  file: MediaFile
  isMine?: boolean
  onRetry?: () => void
  onCancel?: () => void
  timestamp?: string
  receipt?: React.ReactNode
  fill?: boolean
}

function VideoMessageComp({ file, isMine, onRetry, onCancel, timestamp, receipt, fill }: VideoMessageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const isReady = file.status === 'ready'

  useEffect(() => {
    if (file.file_blob) {
      const url = URL.createObjectURL(file.file_blob as Blob)
      setBlobUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, []) // Only on mount/unmount to preserve the blob across ID swaps

  const aspectRatio = file.aspect_ratio || 1.77
  const maxWidth = 320
  const minWidth = 150

  const width = Math.max(minWidth, Math.min(maxWidth, 280))
  const height = width / aspectRatio

  const videoSrc = isReady ? file.media_url : (blobUrl || file.preview_url)


  return (
    <div
      className="relative overflow-hidden bg-black/10 group/video"
      style={fill ? { width: '100%', height: '100%' } : { width: `${width}px`, height: `${height}px` }}
    >
      {/* Background Layer: Blurhash */}
      {file.blurhash && (file.status !== 'ready') && (
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

      {isReady ? (
        <video
          src={file.media_url || blobUrl || ''}
          controls
          className="h-full w-full object-cover relative z-10"
          poster={file.thumbnail_url || undefined}
          crossOrigin="anonymous"
        />
      ) : (
        <div className="relative h-full w-full">
          {videoSrc && (
            <video
              src={videoSrc}
              className="h-full w-full object-cover opacity-80"
              muted
              playsInline
            />
          )}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-black/40 p-3 text-white backdrop-blur-sm shadow-xl border border-white/10">
              <Play className="h-8 w-8 fill-current" />
            </div>
          </div>

          {(file.status === 'uploading' || file.status === 'processing') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
              <div className="relative flex items-center justify-center w-12 h-12">
                <Loader2 className="absolute inset-0 h-full w-full animate-spin text-white opacity-60 font-bold" strokeWidth={3} />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancel?.()
                  }}
                  className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-20 pointer-events-auto"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {file.status === 'uploading' && (
            <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full z-20">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Failed / Not Downloaded State (The Pill) */}
      {(file.status === 'failed' || (!isReady && !blobUrl && !file.preview_url)) && (
        <div className="absolute top-2 left-2 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry?.()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 shadow-lg border border-white/20 text-white hover:bg-black/80 transition-all active:scale-95"
            title={isMine ? "Retry Upload" : "Download"}
          >
            {isMine ? (
              <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <Download className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      )}

      {(timestamp || receipt) && (
        <div className={cn(
          "absolute bottom-1 right-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-white z-20",
          !isReady ? "bg-black/30 backdrop-blur-sm" : "bg-black/10"
        )}>
          <span>{timestamp}</span>
          {receipt}
        </div>
      )}
    </div>
  )
}

export default memo(VideoMessageComp, (prev, next) => {
  return (
    prev.file.file_id === next.file.file_id &&
    prev.file.status === next.file.status &&
    prev.file.progress === next.file.progress &&
    prev.file.media_url === next.file.media_url &&
    prev.file.caption === next.file.caption &&
    prev.timestamp === next.timestamp &&
    prev.receipt === next.receipt &&
    prev.fill === next.fill
  )
})
