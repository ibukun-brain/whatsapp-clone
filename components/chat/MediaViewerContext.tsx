"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MediaFile } from '@/types/mediaTypes'
import MediaViewer from './MediaViewer'

interface MediaViewerContextType {
  openViewer: (files: MediaFile[], initialIndex: number, onDeleteRequest?: (files: MediaFile[], type: 'for_me' | 'for_everyone') => void, canDeleteForEveryone?: boolean, currentUserId?: string) => void
  closeViewer: () => void
}

const MediaViewerContext = createContext<MediaViewerContextType | undefined>(undefined)

export function MediaViewerProvider({ children }: { children: React.ReactNode }) {
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean
    files: MediaFile[]
    initialIndex: number
    onDeleteRequest?: (files: MediaFile[], type: 'for_me' | 'for_everyone') => void
    canDeleteForEveryone?: boolean
    currentUserId?: string
  }>({
    isOpen: false,
    files: [],
    initialIndex: 0,
    onDeleteRequest: undefined,
    canDeleteForEveryone: false,
    currentUserId: undefined
  })

  const openViewer = useCallback((files: MediaFile[], initialIndex: number, onDeleteRequest?: (files: MediaFile[], type: 'for_me' | 'for_everyone') => void, canDeleteForEveryone?: boolean, currentUserId?: string) => {
    setViewerState({ isOpen: true, files, initialIndex, onDeleteRequest, canDeleteForEveryone, currentUserId })
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
          onDeleteRequest={viewerState.onDeleteRequest}
          canDeleteForEveryone={viewerState.canDeleteForEveryone}
          currentUserId={viewerState.currentUserId}
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
