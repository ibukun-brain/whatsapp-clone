"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MediaFile } from '@/types/mediaTypes'
import MediaViewer from './MediaViewer'

interface MediaViewerContextType {
  openViewer: (files: MediaFile[], initialIndex: number, onDelete?: (file: MediaFile) => void) => void
  closeViewer: () => void
}

const MediaViewerContext = createContext<MediaViewerContextType | undefined>(undefined)

export function MediaViewerProvider({ children }: { children: React.ReactNode }) {
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean
    files: MediaFile[]
    initialIndex: number
    onDelete?: (file: MediaFile) => void
  }>({
    isOpen: false,
    files: [],
    initialIndex: 0,
    onDelete: undefined
  })

  const openViewer = useCallback((files: MediaFile[], initialIndex: number, onDelete?: (file: MediaFile) => void) => {
    setViewerState({ isOpen: true, files, initialIndex, onDelete })
  }, [])

  const closeViewer = useCallback(() => {
    setViewerState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return (
    <MediaViewerContext.Provider value={{ openViewer, closeViewer }}>
      {children}
      {viewerState.isOpen && viewerState.files.length > 0 && typeof document !== 'undefined' && createPortal(
        <MediaViewer
          files={viewerState.files}
          initialIndex={viewerState.initialIndex}
          onClose={closeViewer}
          onDelete={viewerState.onDelete}
        />,
        document.body
      )}
    </MediaViewerContext.Provider>
  )
}

export function useMediaViewer() {
  const context = useContext(MediaViewerContext)
  if (!context) {
    throw new Error('useMediaViewer must be used within a MediaViewerProvider')
  }
  return context
}
