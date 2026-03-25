import React, { memo } from 'react'
import { MediaFile } from '@/types/mediaTypes'
import ImageMessage from './ImageMessage'
import VideoMessage from './VideoMessage'
import FileMessage from './FileMessage'
import AudioMessage from './AudioMessage'
import { cn } from '@/lib/utils'

interface MediaGridProps {
  files: MediaFile[]
  isMine?: boolean
  onRetry?: (file: MediaFile) => void
  onCancel?: (file: MediaFile) => void
  timestamp?: string
  receipt?: React.ReactNode
  messageStatus?: string
}

function MediaGridComponent({ files, isMine, onRetry, onCancel, timestamp: msgTimestamp, receipt }: MediaGridProps) {
  if (!files || files.length === 0) return null

  const visuals = files.filter(f => f.type === 'image' || f.type === 'video')
  const attachments = files.filter(f => f.type !== 'image' && f.type !== 'video')

  const renderVisual = (
    file: MediaFile,
    size: 'full' | 'half',
    showOverlay?: boolean,
    overlayCount?: number,
    isFirst?: boolean,
    hasCaption?: boolean
  ) => {
    const Component = file.type === 'image' ? ImageMessage : VideoMessage

    // In WhatsApp, if it's a single image/video without a caption, the timestamp is on that media.
    // If there are multiple items, the timestamp is shown in the bubble footer.
    const showMetadata = visuals.length === 1 && !hasCaption

    // We override dimensions if it's in a grid
    const className = size === 'full' ? '' : 'w-[138px] h-[138px]'

    return (
      <div key={file.file_id} className={cn("relative overflow-hidden rounded", className)}>
        <Component
          file={file}
          isMine={isMine}
          onRetry={() => onRetry?.(file)}
          onCancel={() => onCancel?.(file)}
          timestamp={showMetadata ? msgTimestamp : undefined}
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

  const anyCaption = visuals.find(v => !!v.caption)?.caption;
  const hasCaption = !!anyCaption;

  return (
    <div className={cn("flex flex-col gap-1", visuals.length === 1 ? "" : "max-w-[280px]")}>
      {/* Visuals Container */}
      {visuals.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-lg">
          <div className={cn("grid gap-1", visuals.length === 1 ? "" : "grid-cols-2")}>
            {visuals.length === 1 && (
              <div className="col-span-2">
                {renderVisual(visuals[0], 'full', false, 0, true, hasCaption)}
              </div>
            )}

            {visuals.length === 2 && (
              <>
                {renderVisual(visuals[0], 'half', false, 0, true, hasCaption)}
                {renderVisual(visuals[1], 'half', false, 0, true, hasCaption)}
              </>
            )}

            {visuals.length === 3 && (
              <>
                <div className="col-span-2 h-[200px] overflow-hidden">
                  {renderVisual({ ...visuals[0], aspect_ratio: 1.4 }, 'full', false, 0, true, hasCaption)}
                </div>
                {renderVisual(visuals[1], 'half', false, 0, true, hasCaption)}
                {renderVisual(visuals[2], 'half', false, 0, true, hasCaption)}
              </>
            )}

            {visuals.length >= 4 && (
              <>
                {renderVisual(visuals[0], 'half', false, 0, true, hasCaption)}
                {renderVisual(visuals[1], 'half', false, 0, true, hasCaption)}
                {renderVisual(visuals[2], 'half', false, 0, true, hasCaption)}
                {renderVisual(visuals[3], 'half', visuals.length > 4, visuals.length - 4, true, hasCaption)}
              </>
            )}
          </div>

          {/* Caption & Metadata Footer (Shown for captions or multiple visuals) */}
          {(hasCaption || visuals.length > 1) && (
            <div className="px-2 relative min-w-[200px]">
              {hasCaption && (
                <p className="text-[14.2px] text-[#111b21] leading-0 pt-2.5 whitespace-pre-wrap">
                  {anyCaption}
                </p>
              )}
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[11px] text-[#667781] uppercase font-medium">
                  {msgTimestamp}
                </span>
                {receipt}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className={cn("flex flex-col gap-1", visuals.length > 0 && "mt-1")}>
          {attachments.map(file =>
            file.type === 'audio' ? (
              <AudioMessage key={file.file_id} file={file} onRetry={() => onRetry?.(file)} />
            ) : (
              <FileMessage key={file.file_id} file={file} onRetry={() => onRetry?.(file)} />
            )
          )}
        </div>
      )}
    </div>
  )
}

export default memo(MediaGridComponent, (prevProps, nextProps) => {
  if (prevProps.files.length !== nextProps.files.length) { console.log('MediaGrid memo fail: length'); return false; }
  if (prevProps.timestamp !== nextProps.timestamp) { console.log('MediaGrid memo fail: time'); return false; }
  if (prevProps.messageStatus !== nextProps.messageStatus) { console.log('MediaGrid memo fail: status', prevProps.messageStatus, nextProps.messageStatus); return false; }
  
  // Deep check files for status/progress changes
  const filesSame = prevProps.files.every((file: MediaFile, idx: number) => {
    const nextFile = nextProps.files[idx]
    return (
      file.file_id === nextFile.file_id &&
      file.status === nextFile.status &&
      file.progress === nextFile.progress &&
      file.media_url === nextFile.media_url &&
      file.caption === nextFile.caption
    )
  })
  if (!filesSame) console.log('MediaGrid memo fail: files same');
  return filesSame;
})
