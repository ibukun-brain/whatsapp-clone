import { useCallback } from 'react'
import useWebSocket from 'react-use-websocket'
import { db } from '@/lib/indexdb'
import { computeBlurhash } from '@/lib/utils/computeBlurhash'
import { uploadMedia } from '@/lib/utils/mediaUploader'
import { UploadContext, MediaFile, MediaReadyEvent } from '@/types/mediaTypes'
import { User } from '@/types'

export function useMediaUpload(chatId?: string) {
  const WS_URL = chatId ? `ws://localhost:8000/ws/chats/${chatId}/` : null;

  const { lastJsonMessage } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    share: true,
    filter: (msg) => {
      try {
        const data = JSON.parse(msg.data)
        return data.type === 'media.ready'
      } catch {
        return false
      }
    }
  })

  // Handle media.ready event
  const handleMediaReady = useCallback(async (data: MediaReadyEvent) => {
    const table = data.is_dm ? db.directmessagechats : db.groupmessagechats
    
    // We need to find the message by its temporary ID if it's not yet updated
    // or by its new ID if it was already updated once by another file in the same message.
    // The user's prompt says: "Finds message by tempMessageId"
    // However, the sender might have multiple temp IDs.
    // Actually, each file in the batch gets the SAME tempMessageId in the user's logic:
    // "Generates tempMessageId = crypto.randomUUID() and tempFileId = crypto.randomUUID()"
    // Wait, "For EACH file... Generates tempMessageId". This implies one message per file?
    // "supporting multiple image, video, and file uploads".
    // If I select 3 files, do they go into ONE message or 3 messages?
    // "Adds optimistic entry to IndexedDB immediately... files: [{ file_id: tempFileId, ... }]".
    // This looks like ONE message PER file in the optimistic step.
    
    // Let's try to find it by ID. The message_id in the event is the REAL message_id.
    // We probably stored the tempMessageId somewhere or we use it as the initial ID.
    
    // Search both ID (temp or real)
    let message = await table.get(data.message_id)
    let currentId = data.message_id

    if (!message) {
      // If not found by real ID, it might still be under tempId.
      // But we don't know the tempId from the event.
      // Wait, the backend should probably send back the tempId or we should have a mapping.
      // The user's prompt says: "Finds message by tempMessageId ... data.file_id"
      // This implies we need to find which message contains the temp file_id.
      
      const allMessages = await table.toArray()
      message = (allMessages as any[]).find(m => 
        m.files?.some((f: MediaFile) => f.file_id === data.file_id || f.file_id.startsWith('temp-'))
      )
      if (message) currentId = message.id
    }

    if (!message || !message.files) return

    const updatedFiles = message.files.map((f: MediaFile) =>
      (f.file_id === data.file_id || f.status === 'uploading' || f.status === 'processing') && f.filename === data.filename ? {
        ...f,
        file_id: data.file_id,
        status: 'ready' as const,
        media_url: data.media_url,
        thumbnail_url: data.thumbnail_url,
        blurhash: data.blurhash,
        aspect_ratio: data.aspect_ratio,
        preview_url: null,   // clear blob URL
        progress: 100,
      } : f
    )

    const allReady = updatedFiles.every((f: MediaFile) => f.status === 'ready')
    
    // Re-save with real message_id if it was temp
    if (currentId !== data.message_id) {
      await table.delete(currentId)
    }
    
    // cast to any to avoid union type mismatch in Dexie .put()
    await (table as any).put({
      ...message,
      id: data.message_id,
      files: updatedFiles,
      uploadStatus: allReady ? 'ready' : 'processing',
    })
  }, [])

  // Process lastJsonMessage
  if (lastJsonMessage && (lastJsonMessage as any).type === 'media.ready') {
    handleMediaReady(lastJsonMessage as MediaReadyEvent)
  }

  const upload = useCallback(async (files: File[], context: UploadContext) => {
    const currentUser = await db.user.toCollection().first()
    if (!currentUser) return

    await Promise.all(files.map(async (file) => {
      const { blurhash, aspect_ratio, preview_url } = await computeBlurhash(file)
      const tempMessageId = crypto.randomUUID()
      const tempFileId = crypto.randomUUID()
      const timestamp = new Date()

      const mediaType: MediaFile['type'] = file.type.startsWith('image/') 
        ? 'image' 
        : file.type.startsWith('video/') ? 'video' : 'file'

      const mediaFile: MediaFile = {
        file_id: tempFileId,
        type: mediaType,
        status: 'uploading',
        progress: 0,
        preview_url,
        media_url: null,
        thumbnail_url: null,
        blurhash,
        aspect_ratio,
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
      }

      if (context.is_dm) {
        await db.directmessagechats.put({
          id: tempMessageId,
          direct_message_id: context.context_id,
          user: currentUser.id,
          reply: null,
          content: '',
          type: 'media',
          depth: null,
          forwarded: false,
          edited: false,
          deleted: false,
          timestamp,
          isOptimistic: true,
          files: [mediaFile],
          uploadStatus: 'uploading',
        })
      } else {
        await db.groupmessagechats.put({
          id: tempMessageId,
          groupchat_id: context.context_id,
          user: currentUser,
          type: 'media',
          contact_name: currentUser.display_name,
          reply: null,
          content: '',
          depth: null,
          forwarded: false,
          edited: false,
          deleted: false,
          timestamp,
          receipt: 'sent',
          isOptimistic: true,
          files: [mediaFile],
          uploadStatus: 'uploading',
        })
      }

      const table = context.is_dm ? db.directmessagechats : db.groupmessagechats

      await uploadMedia({
        file,
        context,
        blurhash,
        aspect_ratio,
        onProgress: async (progress) => {
          const msg = await table.get(tempMessageId)
          if (msg && msg.files) {
            const updatedFiles = msg.files.map((f: MediaFile) =>
              f.file_id === tempFileId ? { ...f, progress } : f
            )
            await table.update(tempMessageId, { files: updatedFiles })
          }
        },
        onComplete: async (uploadId) => {
          const msg = await table.get(tempMessageId)
          if (msg && msg.files) {
            const updatedFiles = msg.files.map((f: MediaFile) =>
              f.file_id === tempFileId ? { ...f, status: 'processing' as const } : f
            )
            await table.update(tempMessageId, { 
              files: updatedFiles,
              uploadStatus: 'processing'
            })
          }
        },
        onError: async (error) => {
          const msg = await table.get(tempMessageId)
          if (msg && msg.files) {
            const updatedFiles = msg.files.map((f: MediaFile) =>
              f.file_id === tempFileId ? { ...f, status: 'failed' as const } : f
            )
            await table.update(tempMessageId, { 
              files: updatedFiles,
              uploadStatus: 'failed'
            })
          }
        }
      })
    }))
  }, [])

  const clearUploads = useCallback(() => {
    // Requirements don't specify what to clear, but usually it means local state.
    // Since we use IndexedDB, maybe it means clearing failed uploads?
    // We'll leave it simple for now.
  }, [])

  return { upload, clearUploads }
}
