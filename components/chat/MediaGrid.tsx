import React from 'react'
import { MediaFile } from '@/types/mediaTypes'
import ImageMessage from './ImageMessage'
import VideoMessage from './VideoMessage'
import FileMessage from './FileMessage'
import { cn } from '@/lib/utils'

interface MediaGridProps {
  files: MediaFile[]
  onRetry?: (file: MediaFile) => void
}

export default function MediaGrid({ files, onRetry }: MediaGridProps) {
  if (!files || files.length === 0) return null

  const visuals = files.filter(f => f.type === 'image' || f.type === 'video')
  const attachments = files.filter(f => f.type === 'file')

  const renderVisual = (file: MediaFile, size: 'full' | 'half', showOverlay?: boolean, overlayCount?: number) => {
    const Component = file.type === 'image' ? ImageMessage : VideoMessage
    
    // We override dimensions for the grid
    const dimensions = size === 'full' ? 'w-[280px] h-[280px]' : 'w-[138px] h-[138px]'
    
    return (
      <div key={file.file_id} className={cn("relative overflow-hidden rounded", dimensions)}>
        <Component file={file} onRetry={() => onRetry?.(file)} />
        {showOverlay && overlayCount && overlayCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xl font-bold text-white">
            +{overlayCount}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 max-w-[280px]">
      {/* Visuals Grid */}
      {visuals.length > 0 && (
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
          {visuals.length === 1 && (
            <div className="col-span-2">
              {renderVisual(visuals[0], 'full')}
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
                {/* Note: renderVisual might need adjust for 3-up, but 3-up usually has one big top */}
                <ImageMessage 
                  file={{...visuals[0], aspect_ratio: 1.4}} 
                  onRetry={() => onRetry?.(visuals[0])} 
                />
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
