import { useCallback, useRef, useEffect } from 'react'
import useWebSocket from 'react-use-websocket'
import { db } from '@/lib/indexdb'
import { computeBlurhash } from '@/lib/utils/computeBlurhash'
import { axiosInstance } from '@/lib/axios'
import { uploadMedia } from '@/lib/utils/mediaUploader'
import { getValidFilename } from '@/lib/utils'
import { getVideoMetadata } from '@/lib/utils/media-utils'
import { UploadContext, MediaFile, MediaReadyEvent } from '@/types/mediaTypes'

import { DirectMessageChats, GroupMessageChats } from '@/types'

const WORD_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
])
const EXCEL_MIMES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
])
const POWERPOINT_MIMES = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation',
])
const ACCESS_MIMES = new Set([
  'application/msaccess',
  'application/x-msaccess',
  'application/vnd.ms-access',
])
const ARCHIVE_MIMES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-bzip2',
  'application/x-xz',
])

export function getMediaType(mimeType: string, forceDocument?: boolean): MediaFile['type'] {
  if (!forceDocument) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
  }
  if (mimeType === 'application/pdf') return 'pdf'
  if (WORD_MIMES.has(mimeType)) return 'word'
  if (EXCEL_MIMES.has(mimeType)) return 'excel'
  if (POWERPOINT_MIMES.has(mimeType)) return 'powerpoint'
  if (ACCESS_MIMES.has(mimeType)) return 'access'
  if (ARCHIVE_MIMES.has(mimeType)) return 'archive'
  return 'file'
}

function getAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(undefined)
    }
  })
}

export function useMediaUpload(chatId?: string, options: { listen?: boolean } = { listen: true }) {
  const activeUploads = useRef<Map<string, AbortController>>(new Map())
  const WS_URL = chatId ? `ws://localhost:8000/ws/chats/${chatId}/` : null;

  const { lastJsonMessage } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    share: true,
    filter: (msg) => {
      try {
        const data = JSON.parse(msg.data)
        return data.type === 'media_ready'
      } catch {
        return false
      }
    }
  })

  // Handle media_ready event
  const handleMediaReady = useCallback(async ({ data }: MediaReadyEvent) => {
    console.log('Media Ready Event Received:', data)
    const table = data.chat_type === 'directmessage' ? db.directmessagechats : db.groupmessagechats
    // Search both ID (temp or real)
    let message = await table.get(data.message_id)
    let currentId = data.message_id

    if (!message) {
      console.log('Message not found by message_id, searching by flags...')
      const allMessages = await table.toArray()
      message = (allMessages as any[]).find(m =>
        (m.client_msg_id === data.client_msg_id) ||
        m.files?.some((f: MediaFile) =>
          (data.files.client_file_id && f.client_file_id === data.files.client_file_id) ||
          (f.filename === data.files.filename && f.file_size === data.files.file_size)
        )
      )
      if (message) {
        console.log('Message found by fallback matching:', message.id)
        currentId = message.id
      } else {
        console.warn('CRITICAL: Message NOT FOUND even by fallback. Skipping update.')
      }
    }

    const fileData = data.files
    if (!message || !message.files) {
      console.warn('CRITICAL: Message NOT FOUND even by fallback or missing files array. Skipping update.')
      return
    }

    const updatedFiles = message.files.map((f: MediaFile) => {
      // Find specific file primarily by client_file_id, fallback to filename and size
      const isMatch = (data.files.client_file_id && f.client_file_id === data.files.client_file_id) ||
        (f.filename === fileData.filename && f.file_size === fileData.file_size);
      if (isMatch) {
        return {
          ...f,
          file_id: fileData.file_id || f.file_id,
          status: 'ready' as const,
          media_url: fileData.media_url,
          thumbnail_url: fileData.thumbnail_url,
          blurhash: fileData.blurhash || f.blurhash,
          aspect_ratio: fileData.aspect_ratio || f.aspect_ratio,
          preview_url: null,   // clear local blob URL
          progress: 100,
          caption: fileData.caption || f.caption,
          file_blob: undefined, // Clear blob on success
        }
      }
      return f
    })

    console.log('Updated files:', updatedFiles)

    // Re-save with real message_id if it was temp
    if (currentId !== data.message_id) {
      console.log(`Deleting temporary message ${currentId} and replacing with ${data.message_id}`)
      await table.delete(currentId)
    }

    // cast to any to avoid union type mismatch in Dexie .put()
    await (table as any).put({
      ...message,
      id: data.message_id,
      isOptimistic: false,
      files: updatedFiles,
    })
    console.log('Database record updated to READY.')

    // Remove from active uploads tracking
    const fileId = data.files.file_id
    activeUploads.current.delete(fileId)
  }, [])

  // Process lastJsonMessage
  useEffect(() => {
    if (options.listen && lastJsonMessage && (lastJsonMessage as any).type === 'media_ready') {
      handleMediaReady(lastJsonMessage as MediaReadyEvent)
    }
  }, [lastJsonMessage, handleMediaReady, options.listen])

  const upload = useCallback(async (files: File[], context: UploadContext, captions?: Record<number, string>) => {
    const currentUser = await db.user.toCollection().first()
    if (!currentUser) return

    const timestamp = new Date()
    const table = context.chat_type === 'directmessage' ? db.directmessagechats : db.groupmessagechats
    const clientMsgId = `cmsg-${Date.now()}`
    const dbId = `temp-${Date.now()}`

    // 1. Pre-calculate all media file objects
    const mediaFilesWithOriginals = await Promise.all(files.map(async (file, index) => {
      const { blurhash, aspect_ratio, preview_url } = await computeBlurhash(file)
      const tempFileId = `${Date.now()}-${index}`
      const clientFileId = `cfile-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
      let mediaType: MediaFile['type'] = getMediaType(file.type, context.forceDocument)

      let tempFilesMimeType = file.type;
      let duration: number | undefined
      if (mediaType === 'audio' || mediaType === 'video') {
         // Special handling for .mpeg or generic video mime types that might be audio
         if (mediaType === 'video') {
            const meta = await getVideoMetadata(file)
            if (meta.width === 0 && meta.height === 0) {
               console.log('Video mime type has no dimensions - treating as audio.')
               mediaType = 'audio'
               // Use a corrected mime type for the database and uploader metadata
               tempFilesMimeType = 'audio/mpeg'
            }
            duration = meta.duration
         } else {
            duration = await getAudioDuration(file)
         }
      }

      return {
        originalFile: file,
        mediaFile: {
          file_id: tempFileId,
          client_file_id: clientFileId,
          type: mediaType,
          status: 'uploading' as const,
          progress: 0,
          preview_url,
          media_url: null,
          thumbnail_url: null,
          blurhash,
          aspect_ratio,
          filename: getValidFilename(file.name),
          mime_type: tempFilesMimeType,
          file_size: file.size,
          duration,
          caption: captions?.[index] || context.caption,
          file_blob: file, // Store for retry
          timestamp,
        } as MediaFile

      }
    }))

    const initialMediaFiles = mediaFilesWithOriginals.map(m => m.mediaFile)

    // 2. Create ONE message for all files
    if (context.chat_type === 'directmessage') {
      await db.directmessagechats.put({
        id: dbId,
        direct_message_id: context.context_id,
        client_msg_id: clientMsgId, // Corrected variable name
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
        files: initialMediaFiles,
      })
    } else {
      await db.groupmessagechats.put({
        id: dbId,
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
        client_msg_id: clientMsgId,
        files: initialMediaFiles,
      })
    }

    // 3. Start all uploads concurrently (don't await so UI is responsive)
    Promise.all(mediaFilesWithOriginals.map(async ({ originalFile, mediaFile }) => {
      const tempFileId = mediaFile.file_id
      const controller = new AbortController()
      activeUploads.current.set(tempFileId, controller)

      try {
        await uploadMedia({
          file: originalFile,
          mimeType: mediaFile.mime_type,
          mediaType: mediaFile.type,
          context: { ...context, caption: mediaFile.caption, client_msg_id: clientMsgId, client_file_id: mediaFile.client_file_id },
          blurhash: mediaFile.blurhash,
          aspect_ratio: mediaFile.aspect_ratio,
          signal: controller.signal,
          onProgress: async (progress) => {
            const msg = (await table.get(dbId)) || (await table.where('client_msg_id').equals(clientMsgId).first())
            if (msg && msg.files) {
              const updatedFiles = msg.files.map((f: MediaFile) =>
                f.file_id === tempFileId ? { ...f, progress } : f
              )
              await table.update(msg.id, { files: updatedFiles })
            }
          },
          onComplete: async (uploadId) => {
            const msg = (await table.get(dbId)) || (await table.where('client_msg_id').equals(clientMsgId).first())
            if (msg && msg.files) {
              const updatedFiles = msg.files.map((f: MediaFile) =>
                f.file_id === tempFileId ? { ...f, status: 'processing' as const, file_id: uploadId } : f
              )
              await table.update(msg.id, {
                files: updatedFiles,
              })
              activeUploads.current.delete(tempFileId)
            }
          },
          onError: async (error) => {
            if (error === 'Canceled' || controller.signal.aborted) return
            const msg = (await table.get(dbId)) || (await table.where('client_msg_id').equals(clientMsgId).first())
            if (msg && msg.files) {
              const updatedFiles = msg.files.map((f: MediaFile) =>
                f.file_id === tempFileId ? { ...f, status: 'failed' as const } : f
              )

              await table.update(msg.id, {
                files: updatedFiles,
              })
            }
            activeUploads.current.delete(tempFileId)
          }
        })
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Upload aborted')
        } else {
          console.error('Upload error catch:', err)
        }
      }
    }))
  }, [])

  const cancelUpload = useCallback(async (fileId: string, messageId: string, chatType: 'directmessage' | 'group_chat') => {
    const controller = activeUploads.current.get(fileId)
    if (controller) {
      controller.abort()
      activeUploads.current.delete(fileId)
    }

    // Update status in IndexedDB
    const table = chatType === 'directmessage' ? db.directmessagechats : db.groupmessagechats
    const msg = await table.get(messageId)
    if (msg && msg.files) {
      const updatedFiles = msg.files.map((f: MediaFile) =>
        f.file_id === fileId ? { ...f, status: 'failed' as const } : f
      )

      await table.update(messageId, {
        files: updatedFiles,
      })
    }
  }, [])

  const clearUploads = useCallback(() => {
    activeUploads.current.forEach(c => c.abort())
    activeUploads.current.clear()
  }, [])

  const retryUpload = useCallback(async (file: MediaFile, messageId: string, chatType: 'directmessage' | 'group_chat') => {
    const table = chatType === 'directmessage' ? db.directmessagechats : db.groupmessagechats
    const msg = await table.get(messageId)
    if (!msg) return

    // Receiver-only path: If no blob exists, but we have URLs, just restore visibility
    if (!file.file_blob) {
      if (file.media_url) {
        console.log('Restoring receiver visibility for ready media')
        const up = (msg.files || []).map((f: MediaFile) =>
          f.file_id === file.file_id ? { ...f, status: 'ready' as const } : f
        )
        await table.update(messageId, { files: up })
        return
      }

      // If no URLs, try to fetch the latest message details from the API
      try {
        console.log('Fetching latest message data for:', messageId)
        const endpoint = chatType === 'directmessage' ? `/directmessages/messages/${messageId}/` : `/groups/messages/${messageId}/`
        const response = await axiosInstance.get(endpoint)
        if (response.data) {
          await table.put(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch message details for receiver:', err)
      }
      return
    }

    // Sender path: Standard re-upload logic (must have blob)
    // Safeguard: Ensure client_msg_id exists
    let clientMsgId = msg.client_msg_id
    if (!clientMsgId) {
      clientMsgId = `cmsg-${Date.now()}`
      console.log('Generating missing client_msg_id for retry:', clientMsgId)
      await table.update(messageId, { client_msg_id: clientMsgId })
    }

    const controller = new AbortController()
    activeUploads.current.set(file.file_id, controller)

    // Reset status to uploading
    if (!msg.files) return
    const updatedFiles = msg.files.map((f: MediaFile) =>
      f.file_id === file.file_id ? { ...f, status: 'uploading' as const, progress: 0 } : f
    )
    await table.update(messageId, { files: updatedFiles })

    const context: UploadContext = {
      chat_type: chatType,
      context_id: chatType === 'directmessage' ? (msg as DirectMessageChats).direct_message_id : (msg as GroupMessageChats).groupchat_id,
      client_msg_id: clientMsgId,
      client_file_id: file.client_file_id,
      caption: file.caption
    }

    console.log('Retrying upload with blob:', file.file_blob)

    // Safety check: ensure we actually have a Blob-like object
    const blobToUpload = file.file_blob as Blob
    if (!(blobToUpload instanceof Blob)) {
      console.error('file_blob is NOT a Blob instance. It might have been corrupted or serialized incorrectly.', typeof file.file_blob);
      // If it's a plain object with blob-like properties, we might be able to recover it
      if (file.file_blob && (file.file_blob as any).size) {
        console.log('Attempting to recover blob from object properties...');
      }
    }

    try {
      await uploadMedia({
        file: blobToUpload,
        name: getValidFilename(file.filename),
        mimeType: file.mime_type,
        mediaType: file.type,
        context,
        blurhash: file.blurhash,
        aspect_ratio: file.aspect_ratio,
        signal: controller.signal,
        onProgress: async (progress) => {
          const m = await table.get(messageId)
          if (m && m.files) {
            const up = m.files.map((f: MediaFile) =>
              f.file_id === file.file_id ? { ...f, progress } : f
            )
            await table.update(messageId, { files: up })
          }
        },
        onComplete: async (uploadId) => {
          const m = await table.get(messageId)
          if (m && m.files) {
            const up = m.files.map((f: MediaFile) =>
              f.file_id === file.file_id ? { ...f, status: 'processing' as const, file_id: uploadId } : f
            )
            await table.update(messageId, { files: up })
            activeUploads.current.delete(file.file_id)
          }
        },
        onError: async (error) => {
          if (error === 'Canceled' || controller.signal.aborted) return
          const m = await table.get(messageId)
          if (m && m.files) {
            const up = m.files.map((f: MediaFile) =>
              f.file_id === file.file_id ? { ...f, status: 'failed' as const } : f
            )

            await table.update(messageId, { files: up })
          }
          activeUploads.current.delete(file.file_id)
        }
      })
    } catch (err) {
      console.error('Retry error:', err)
    }
  }, [])

  return { upload, cancelUpload, retryUpload, clearUploads }
}
