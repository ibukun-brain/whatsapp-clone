import React from 'react'
import { MediaFile } from '@/types/mediaTypes'
import ImageMessage from './ImageMessage'
import VideoMessage from './VideoMessage'
import FileMessage from './FileMessage'
import { cn } from '@/lib/utils'

interface MediaGridProps {
  files: MediaFile[]
  onRetry?: (file: MediaFile) => void
  onCancel?: (file: MediaFile) => void
  timestamp?: string
  receipt?: React.ReactNode
}

export default function MediaGrid({ files, onRetry, onCancel, timestamp, receipt }: MediaGridProps) {
  if (!files || files.length === 0) return null

  const visuals = files.filter(f => f.type === 'image' || f.type === 'video')
  const attachments = files.filter(f => f.type === 'file')

  const renderVisual = (
    file: MediaFile, 
    size: 'full' | 'half', 
    showOverlay?: boolean, 
    overlayCount?: number,
    isFirst?: boolean
  ) => {
    const Component = file.type === 'image' ? ImageMessage : VideoMessage
    
    // In WhatsApp, if it's a grid, the timestamp is usually on the bottom-right image
    // If it's a single image, it's on that image.
    const isLastVisual = visuals[visuals.length - 1].file_id === file.file_id
    const showMetadata = visuals.length === 1 || isLastVisual
    
    // We override dimensions if it's in a grid
    const className = size === 'full' ? '' : 'w-[138px] h-[138px]'
    
    return (
      <div key={file.file_id} className={cn("relative overflow-hidden rounded", className)}>
        <Component 
          file={file} 
          onRetry={() => onRetry?.(file)} 
          onCancel={() => onCancel?.(file)}
          timestamp={showMetadata ? timestamp : undefined}
          receipt={showMetadata ? receipt : undefined}
        />
        {showOverlay && overlayCount && overlayCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xl font-bold text-white">
            +{overlayCount}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-1", visuals.length === 1 ? "" : "max-w-[280px]")}>
      {/* Visuals Grid */}
      {visuals.length > 0 && (
        <div className={cn("grid gap-1 overflow-hidden rounded-lg", visuals.length === 1 ? "" : "grid-cols-2")}>
          {visuals.length === 1 && (
            <div className="col-span-2">
              {renderVisual(visuals[0], 'full', false, 0, true)}
            </div>
          )}
          
          {visuals.length === 2 && (
            <>
              {renderVisual(visuals[0], 'half')}
              {renderVisual(visuals[1], 'half')}
            </>
          )}

          {visuals.length === 3 && (
            <>
              <div className="col-span-2 h-[200px] overflow-hidden">
                {renderVisual({...visuals[0], aspect_ratio: 1.4}, 'full')}
              </div>
              {renderVisual(visuals[1], 'half')}
              {renderVisual(visuals[2], 'half')}
            </>
          )}

          {visuals.length >= 4 && (
            <>
              {renderVisual(visuals[0], 'half')}
              {renderVisual(visuals[1], 'half')}
              {renderVisual(visuals[2], 'half')}
              {renderVisual(visuals[3], 'half', visuals.length > 4, visuals.length - 4)}
            </>
          )}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className={cn("flex flex-col gap-1", visuals.length > 0 && "mt-1")}>
          {attachments.map(file => (
            <FileMessage key={file.file_id} file={file} onRetry={() => onRetry?.(file)} />
          ))}
        </div>
      )}
    </div>
  )
}
