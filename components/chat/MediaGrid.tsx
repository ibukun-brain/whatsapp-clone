import React, { memo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MediaFile } from '@/types/mediaTypes'
import ImageMessage from './ImageMessage'
import VideoMessage from './VideoMessage'
import FileMessage from './FileMessage'
import AudioMessage from './AudioMessage'
import VoiceMessage from './VoiceMessage'
import MediaViewer from './MediaViewer'
import { useMediaViewer } from './MediaViewerContext'
import { cn, getDateTimeByTimezone } from '@/lib/utils'

interface MediaGridProps {
  files: MediaFile[]
  isMine?: boolean
  onRetry?: (file: MediaFile) => void
  onCancel?: (file: MediaFile) => void
  userTimezone: string
  receipt?: React.ReactNode
  messageStatus?: string
  allVisualMedia?: MediaFile[]
}

function MediaGridComponent({ files, isMine, onRetry, onCancel, userTimezone, receipt, allVisualMedia = [] }: MediaGridProps) {
  const { openViewer } = useMediaViewer()

  // Collect all viewable files (image, video, audio) for the local grid
  const viewableFiles = files.filter(f => f.type === 'image' || f.type === 'video' || f.type === 'audio' || f.type === 'voice_recording')

  const openViewerHandler = useCallback((file: MediaFile) => {
    // We want to open the viewer using the CHAT-WIDE visual media array
    const mediaToUse = allVisualMedia.length > 0 ? allVisualMedia : viewableFiles
    const idx = mediaToUse.findIndex(f => f.file_id === file.file_id)

    if (idx >= 0 && (file.media_url || file.preview_url || file.file_blob)) {
      openViewer(mediaToUse, idx)
    }
  }, [viewableFiles, allVisualMedia, openViewer])

  if (!files || files.length === 0) return null

  const visuals = files.filter(f => f.type === 'image' || f.type === 'video')
  const attachments = files.filter(f => f.type !== 'image' && f.type !== 'video')

  const renderVisual = (
    file: MediaFile,
    size: 'full' | 'half',
    showOverlay?: boolean,
    overlayCount?: number,
    hasCaption?: boolean
  ) => {
    const Component = file.type === 'image' ? ImageMessage : VideoMessage
    const { time: fileTime } = getDateTimeByTimezone(file.timestamp, userTimezone)

    // WhatsApp logic:
    // 1. Single media, no caption: timestamp + receipt on media
    const isSingleNoCaption = visuals.length === 1 && !hasCaption

    // - If total visual count is even: show timestamp/receipt on EACH media (unless it's an overlay slot)
    // - If total visual count is odd: 
    //   - If count <= 3: hide timestamps on media, show in bubble footer instead
    //   - If count > 3: show timestamps/receipts on media (per user request)
    // - If count > 4: hide timestamp/receipt on the 4th slot (where overlay is shown)
    const isMultiple = visuals.length > 1
    const isOdd = isMultiple && visuals.length % 2 !== 0
    const isOddAtMost3 = isOdd && visuals.length <= 3
    const isOverlaySlot = !!(showOverlay && overlayCount && overlayCount > 0)

    const showMetadataOnMedia = isSingleNoCaption || (isMultiple && !isOddAtMost3 && !isOverlaySlot)

    // We override dimensions if it's in a grid
    const className = size === 'full' ? 'w-full h-full' : 'w-[138px] h-[138px]'

    return (
      <div
        key={file.file_id}
        className={cn("relative overflow-hidden rounded cursor-pointer", className)}
        onClick={(e) => { e.stopPropagation(); openViewerHandler(file) }}
      >
        <Component
          file={file}
          isMine={isMine}
          onRetry={() => onRetry?.(file)}
          onCancel={() => onCancel?.(file)}
          timestamp={showMetadataOnMedia ? fileTime : undefined}
          receipt={showMetadataOnMedia ? receipt : undefined}
          fill={visuals.length > 1}
        />

        {showOverlay && overlayCount && overlayCount > 0 && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-[1px] text-2xl font-semibold text-white pointer-events-none">
            +{overlayCount}
          </div>
        )}
      </div>
    )
  }

  const rawCaption = visuals.find(v => !!v.caption)?.caption;
  const hasCaption = !!rawCaption && visuals.length === 1;

  // For the bubble footer, we use the timestamp of the first visual if it exists, otherwise fall back to first file
  const firstVisualTime = visuals.length > 0
    ? getDateTimeByTimezone(visuals[0].timestamp, userTimezone).time
    : files.length > 0 ? getDateTimeByTimezone(files[0].timestamp, userTimezone).time : "";

  return (
    <div className={cn("flex flex-col gap-1", visuals.length === 1 ? "" : "max-w-[280px]")}>
      {/* Visuals Container */}
      {visuals.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-lg">
          <div className={cn("grid gap-0.5", visuals.length === 1 ? "" : "grid-cols-2")}>
            {visuals.length === 1 && (
              <div className="col-span-2">
                {renderVisual(visuals[0], 'full', false, 0, hasCaption)}
              </div>
            )}

            {visuals.length === 2 && (
              <>
                {renderVisual(visuals[0], 'half', false, 0, hasCaption)}
                {renderVisual(visuals[1], 'half', false, 0, hasCaption)}
              </>
            )}

            {visuals.length === 3 && (
              <>
                <div className="col-span-2 h-[200px] overflow-hidden">
                  {renderVisual({ ...visuals[0], aspect_ratio: 1.4 }, 'full', false, 0, hasCaption)}
                </div>
                {renderVisual(visuals[1], 'half', false, 0, hasCaption)}
                {renderVisual(visuals[2], 'half', false, 0, hasCaption)}
              </>
            )}

            {visuals.length >= 4 && (
              <>
                {renderVisual(visuals[0], 'half', false, 0, hasCaption)}
                {renderVisual(visuals[1], 'half', false, 0, hasCaption)}
                {renderVisual(visuals[2], 'half', false, 0, hasCaption)}
                {renderVisual(visuals[3], 'half', visuals.length > 4, visuals.length - 4, hasCaption)}  {/* "visuals.length - 5" because we already rendered 4 visuals */}
              </>
            )}
          </div>

          {/* Caption & Metadata Footer (Shown for captions or odd visual counts) */}
          {(hasCaption || visuals.length > 1) && (
            <div className="px-2 relative min-w-[200px]">
              {hasCaption && (
                <p className="text-[14.2px] text-[#111b21] leading-0 pt-2.5 whitespace-pre-wrap">
                  {rawCaption}
                </p>
              )}
              {/* Only show timestamp/receipt in footer if it's NOT shown on individual items.
                  This happens if it's an odd count of exactly 3 or if there's a caption. */}
              {(hasCaption || (visuals.length > 1 && visuals.length % 2 !== 0 && visuals.length <= 3)) && (
                <div className="flex items-center justify-end gap-0.5 -mr-1">
                  <span className="text-[11px] text-[#667781] font-medium">
                    {firstVisualTime}
                  </span>
                  {receipt}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className={cn("flex flex-col gap-1", visuals.length > 0 && "mt-1")}>
          {attachments.map(file => {
            const { time: fileTime } = getDateTimeByTimezone(file.timestamp, userTimezone)
            if (file.type === 'voice_recording') {
              return (
                <VoiceMessage key={file.file_id} file={file} onRetry={() => onRetry?.(file)} timestamp={fileTime} isMine={isMine} receipt={isMine ? receipt : undefined} />
              )
            }
            return file.type === 'audio' ? (
              <div key={file.file_id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); openViewerHandler(file) }}>
                <AudioMessage file={file} onRetry={() => onRetry?.(file)} timestamp={fileTime} isMine={isMine} receipt={isMine ? receipt : undefined} />
              </div>
            ) : (
              <FileMessage key={file.file_id} file={file} onRetry={() => onRetry?.(file)} />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default memo(MediaGridComponent, (prevProps, nextProps) => {
  if (prevProps.files.length !== nextProps.files.length) { console.log('MediaGrid memo fail: length'); return false; }
  if (prevProps.userTimezone !== nextProps.userTimezone) { console.log('MediaGrid memo fail: timezone'); return false; }
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
