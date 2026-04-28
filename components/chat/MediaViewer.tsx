"use client"

import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Crop,
  Sparkles,
  Pencil,
  Square,
  Grid3X3,
  Smile,
  StickyNote,
  ZoomIn,
  ZoomOut,
  Star,
  Forward,
  Reply,
  Play,
  Pause,
  Headphones,
  Trash2,
  Image as ImageIcon
} from 'lucide-react'
import Image from 'next/image'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────
export interface MediaViewerProps {
  /** All media files to display */
  files: MediaFile[]
  /** Index of the initially selected file */
  initialIndex?: number
  /** Called when the viewer is closed */
  onClose: () => void
  /** Called when files are requested to be deleted */
  onDeleteRequest?: (files: MediaFile[], type: 'for_me' | 'for_everyone') => void
  /** Whether the user can delete for everyone */
  canDeleteForEveryone?: boolean
  /** Current user ID for filtering 'deleted for me' */
  currentUserId?: string
  /** Called when reply is clicked */
  onReply?: (file: MediaFile) => void
}

function useFileUrl(file: MediaFile | undefined) {
  const [localUrl, setLocalUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file?.file_blob && !file.media_url && !file.preview_url) {
      const url = URL.createObjectURL(file.file_blob as Blob)
      setLocalUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setLocalUrl(null)
  }, [file])

  if (!file) return ''
  return file.media_url || file.preview_url || localUrl || ''
}

// ─── Audio Player (inline) ────────────────────────────────────────────
function ViewerAudioPlayer({ file }: { file: MediaFile }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState<number>(() => {
    if (typeof file.duration === 'number') return file.duration;
    if (typeof file.duration === 'string') return parseFloat(file.duration) || 0;
    return 0;
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const audioUrl = useFileUrl(file)

  useEffect(() => {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    const onMeta = () => { if (!file.duration) setDuration(audio.duration) }
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0) }

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.pause()
    }
  }, [audioUrl, file.duration])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(console.error)
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const time = Number(e.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const fmt = (s: number = 0) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[420px] px-4">
      {/* Big Icon */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#ffb02e] text-white shadow-xl">
        <Headphones className="h-12 w-12" strokeWidth={2} />
      </div>

      {/* Filename */}
      <p className="text-[#111b21] dark:text-white/90 text-sm font-medium truncate max-w-full text-center">
        {file.filename}
      </p>

      {/* Controls Row */}
      <div className="flex items-center gap-4 w-full">
        <button
          onClick={togglePlay}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/15 backdrop-blur-sm hover:bg-gray-200 dark:hover:bg-white/25 transition-colors text-[#54656f] dark:text-white"
        >
          {isPlaying
            ? <Pause className="h-6 w-6 fill-current" />
            : <Play className="h-6 w-6 fill-current ml-0.5" />
          }
        </button>

        {/* Seeker */}
        <div className="flex flex-col flex-1 gap-1">
          <div className="relative h-6 flex items-center">
            <div className="relative w-full h-1 bg-gray-200 dark:bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-[#00a884] rounded-full transition-all duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Thumb */}
            <div
              className="absolute h-3.5 w-3.5 -ml-[7px] rounded-full bg-[#00a884] shadow-md pointer-events-none"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#667781] dark:text-white/60 tabular-nums px-0.5">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Viewer ──────────────────────────────────────────────────────
function MediaViewerComponent({
  files: initialViewableFiles,
  initialIndex = 0,
  onClose,
  onDeleteRequest,
  canDeleteForEveryone = false,
  currentUserId,
  onReply
}: MediaViewerProps) {
  const filteredViewableFiles = initialViewableFiles.filter(f => {
    if (!f.deleted) return true;
    if (f.deleted.delete_type === "for_everyone") return false;
    if (f.deleted.delete_type === "for_me" && String(f.deleted.deleted_by) === String(currentUserId)) return false;
    return true;
  });

  const [activeIndex, setActiveIndex] = useState(() => {
    // Try to find the file from the original list in the filtered list
    const file = initialViewableFiles[initialIndex];
    if (!file) return 0;
    const newIdx = filteredViewableFiles.findIndex(f => f.file_id === file.file_id);
    return newIdx >= 0 ? newIdx : 0;
  })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const activeFile = filteredViewableFiles[activeIndex]
  const isImage = activeFile?.type === 'image'
  const isVideo = activeFile?.type === 'video'
  const isAudio = activeFile?.type === 'audio'
  const activeFileUrl = useFileUrl(activeFile)

  // Reset zoom/pan on slide change
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [activeIndex])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const active = thumbnailContainerRef.current.querySelector('[data-active="true"]')
      active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeIndex])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goTo(activeIndex - 1)
      if (e.key === 'ArrowRight') goTo(activeIndex + 1)
      if (e.key === '+' || e.key === '=') handleZoomIn()
      if (e.key === '-') handleZoomOut()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < filteredViewableFiles.length) setActiveIndex(idx)
  }, [filteredViewableFiles.length])

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4))
  const handleZoomOut = () => {
    setZoom(z => {
      const next = Math.max(z - 0.25, 1)
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }
  const handleZoomReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Pan handlers (only when zoomed in on images)
  const onPointerDown = (e: React.PointerEvent) => {
    if (!isImage || zoom <= 1) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    })
  }
  const onPointerUp = () => setIsPanning(false)

  // Native wheel handler for zoom (passive: false to allow preventDefault)
  useEffect(() => {
    const el = contentRef.current
    if (!el || !isImage) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        setZoom(z => Math.min(z + 0.25, 4))
      } else {
        setZoom(z => {
          const next = Math.max(z - 0.25, 1)
          if (next === 1) setPan({ x: 0, y: 0 })
          return next
        })
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isImage, activeIndex]) // re-run on index change is safe

  const handleDownload = () => {
    if (!activeFile?.media_url) return
    const a = document.createElement('a')
    a.href = activeFile.media_url
    a.download = activeFile.filename
    a.click()
  }

  const handleToggleSelect = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleDeleteClick = () => {
    if (selectedIndices.size > 0) {
      setShowDeleteDialog(true)
    }
  }

  const confirmDelete = (type: 'for_me' | 'for_everyone') => {
    const filesToDelete = Array.from(selectedIndices).map(i => filteredViewableFiles[i])
    onDeleteRequest?.(filesToDelete, type)
    setShowDeleteDialog(false)
    onClose()
  }

  if (!activeFile) return null

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col bg-white dark:bg-[#111b21] animate-in fade-in duration-200"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      {/* ── Top Bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-[64px] px-4 shrink-0 bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-md z-50">
        <div className="flex items-center">
          {activeFile && (
            <div className="flex flex-col ml-2">
              <span className="text-[15px] font-medium text-[#111b21] dark:text-white/90">
                {activeFile.filename}
              </span>
              <span className="text-[12px] text-[#667781] dark:text-white/60">
                {new Date(activeFile.timestamp).toLocaleDateString()} at {new Date(activeFile.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>


        {/* Image-only Toolbar */}
        {isImage && (
          <div className="flex items-center gap-0.5">
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Crop">
              <Crop size={20} />
            </button>
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Enhance">
              <Sparkles size={20} />
            </button>
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Draw">
              <Pencil size={20} />
            </button>
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Text">
              <span className="font-bold text-[15px] leading-none px-0.5">Aa</span>
            </button>
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Shape">
              <Square size={20} />
            </button>
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Mosaic">
              <Grid3X3 size={20} />
            </button>
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Emoji">
              <Smile size={20} />
            </button>
            <button className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Sticker">
              <StickyNote size={20} />
            </button>

            {/* Zoom Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-white/20 mx-1.5" />

            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className={cn(
                "p-2.5 rounded-full transition-colors",
                zoom <= 1 ? "text-[#54656f]/30 dark:text-white/30 cursor-not-allowed" : "text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              )}
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 text-[12px] text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white font-medium tabular-nums min-w-[48px] text-center"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className={cn(
                "p-2.5 rounded-full transition-colors",
                zoom >= 4 ? "text-[#54656f]/30 dark:text-white/30 cursor-not-allowed" : "text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              )}
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
          </div>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-0.5">
          <button
            className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            title="Star"
          >
            <Star size={20} />
          </button>
          <button
            onClick={() => {
              if (onReply) {
                onReply(activeFile);
                onClose();
              }
            }}
            className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            title="Reply"
          >
            <Reply size={20} />
          </button>
          <button
            className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            title="Forward"
          >
            <Forward size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2.5 text-[#54656f] dark:text-white/70 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            title="Download"
          >
            <Download size={20} />
          </button>

          {selectedIndices.size > 0 && (
            <button
              onClick={handleDeleteClick}
              className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors animate-in zoom-in duration-200"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
          )}

          <div className="w-px h-5 bg-gray-200 dark:bg-white/20 mx-1" />

          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full text-[#54656f] dark:text-white/80 hover:text-[#111b21] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
            title="Close (Esc)"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden select-none min-h-0">
        {/* Prev Button */}
        {activeIndex > 0 && (
          <button
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-3 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-gray-200/50 dark:bg-white/10 text-[#54656f] dark:text-white/80 hover:bg-gray-300/50 dark:hover:bg-white/20 hover:text-[#111b21] dark:hover:text-white backdrop-blur-sm transition-all"
            title="Previous"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Next Button */}
        {activeIndex < filteredViewableFiles.length - 1 && (
          <button
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-3 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-gray-200/50 dark:bg-white/10 text-[#54656f] dark:text-white/80 hover:bg-gray-300/50 dark:hover:bg-white/20 hover:text-[#111b21] dark:hover:text-white backdrop-blur-sm transition-all"
            title="Next"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className={cn(
            "flex items-center justify-center w-full h-full",
            isImage && zoom > 1 ? "cursor-grab" : "",
            isImage && isPanning ? "cursor-grabbing" : ""
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div
            className="absolute top-6 left-6 z-50 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelectionMode) setIsSelectionMode(true);
              handleToggleSelect(activeIndex);
            }}
          >
            <div className={cn(
              "w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-105",
              selectedIndices.has(activeIndex)
                ? "bg-[#00a884] border-[#00a884]"
                : "border-white/80 bg-black/20"
            )}>
              {selectedIndices.has(activeIndex) && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7.5L5.5 10L11 4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>

          {isImage && (
            <div
              className="transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                draggable={false}
                src={activeFileUrl}
                alt={activeFile.filename}
                className="max-h-[calc(100vh-180px)] max-w-[calc(100vw-120px)] object-contain select-none pointer-events-none"
              />
            </div>
          )}

          {isVideo && (
            <video
              key={activeFile.file_id}
              src={activeFileUrl}
              controls
              autoPlay
              className="max-h-[calc(100vh-180px)] max-w-[calc(100vw-120px)] object-contain rounded-lg"
              poster={activeFile.thumbnail_url || undefined}
            />
          )}

          {isAudio && <ViewerAudioPlayer key={activeFile.file_id} file={activeFile} />}
        </div>

        {/* Caption below image/video */}
        {activeFile?.caption && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4 pointer-events-none z-30">
            <div className="bg-black/60 dark:bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl max-w-[80%] pointer-events-auto shadow-2xl border border-white/10">
              <p className="text-white text-[15px] leading-relaxed text-center font-normal">
                {activeFile.caption}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Thumbnail Strip ───────────────────────────────────────── */}
      {filteredViewableFiles.length > 1 && (
        <div className="relative shrink-0 py-3 px-4 flex items-center justify-center bg-white dark:bg-[#0b141a] border-t border-gray-200/50 dark:border-white/5">
          {selectedIndices.size > 0 && (
            <div className="absolute left-6 text-[16px] font-medium text-[#667781] dark:text-white/60">
              {selectedIndices.size} selected
            </div>
          )}
          <div
            ref={thumbnailContainerRef}
            className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1 w-full max-w-full"
          >
            {filteredViewableFiles.map((file, idx) => {
              const isActive = idx === activeIndex
              const isThumbImage = file.type === 'image'
              const isThumbVideo = file.type === 'video'
              const isThumbAudio = file.type === 'audio'

              return (
                <button
                  key={file.file_id || idx}
                  data-active={isActive}
                  onClick={() => goTo(idx)}
                  className={cn(
                    "relative shrink-0 w-[52px] h-[52px] rounded-md overflow-hidden border-2 transition-all duration-200",
                    isActive
                      ? "border-[#00a884] scale-110 shadow-lg shadow-[#00a884]/20 z-10"
                      : "border-transparent opacity-60 hover:opacity-100 dark:hover:border-white/30",
                    selectedIndices.has(idx) && "ring-2 ring-[#00a884] opacity-100 scale-105"
                  )}
                >
                  {isSelectionMode && (
                    <div
                      className="absolute top-0 left-0 p-1.5 z-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(idx);
                      }}
                    >
                      <div className={cn(
                        "w-[14px] h-[14px] rounded-full border flex items-center justify-center transition-all",
                        selectedIndices.has(idx) ? "bg-[#00a884] border-[#00a884]" : "border-white/50 bg-black/20"
                      )}>
                        {selectedIndices.has(idx) && (
                          <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7.5L5.5 10L11 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {isThumbImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <Image
                      unoptimized={true}
                      fill={true}
                      src={file.media_url || file.thumbnail_url || file.preview_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}

                  {isThumbVideo && (
                    <div className="w-full h-full bg-black/60 flex items-center justify-center">
                      {file.thumbnail_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <Image
                            unoptimized={true}
                            fill={true}
                            src={file.thumbnail_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                        </>
                      ) : null}
                      <Play size={16} className="text-white fill-white relative z-10" />
                    </div>
                  )}

                  {isThumbAudio && (
                    <div className="w-full h-full bg-[#ffb02e]/90 flex items-center justify-center">
                      <Headphones size={20} className="text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[450px] rounded-[16px] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in duration-200 z-10000">
          <AlertDialogHeader className="px-6 pt-6 pb-2">
            <AlertDialogTitle className="text-[19px] font-medium text-[#111b21] tracking-tight">
              Delete message{selectedIndices.size > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="hidden">
              Are you sure you want to delete {selectedIndices.size} selected file{selectedIndices.size > 1 ? 's' : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col items-end gap-2.5 px-6 pb-6 pt-2 w-full">
            {canDeleteForEveryone && (
              <button
                onClick={() => confirmDelete('for_everyone')}
                className="w-auto min-w-[140px] px-6 py-2.5 bg-white hover:bg-[#eaf7f2] text-[#008069] text-[15px] font-medium rounded-full border border-[#008069]/10 transition-colors cursor-pointer"
              >
                Delete for everyone
              </button>
            )}
            <button
              onClick={() => confirmDelete('for_me')}
              className="w-auto min-w-[140px] px-6 py-2.5 bg-white hover:bg-[#eaf7f2] text-[#008069] text-[15px] font-medium rounded-full border border-[#d1d7db] transition-colors cursor-pointer"
            >
              Delete for me
            </button>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="w-auto min-w-[140px] px-6 py-2.5 bg-white hover:bg-[#eaf7f2] text-[#008069] text-[15px] font-medium rounded-full border border-[#d1d7db] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

export default memo(MediaViewerComponent)
