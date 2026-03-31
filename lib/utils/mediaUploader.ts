import { axiosInstance } from "../axios"
import { UploadContext } from "../../types/mediaTypes"
import { getMediaType } from "../../hooks/use-media-upload"
import { getValidFilename } from "../utils"


interface UploaderOptions {
  file: File | Blob
  name?: string
  mimeType?: string
  mediaType?: string
  context: UploadContext
  blurhash?: string | null
  aspect_ratio?: number | null
  onProgress: (percent: number) => void
  onComplete: (uploadId: string) => void
  onError: (error: string) => void
  signal?: AbortSignal
}

const CHUNK_SIZE = 64 * 1024 // 64KB
const CHUNK_THRESHOLD = 1 * 1024 * 1024 // 1MB

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function uploadMedia(options: UploaderOptions) {
  const { file, name, mimeType: overrideMimeType, mediaType: overrideMediaType, context, blurhash, aspect_ratio, onProgress, onComplete, onError, signal } = options
  const fileName = getValidFilename(name || (file as File).name || 'file')
  const mimeType = overrideMimeType || (file as File).type || 'application/octet-stream'

  const mediaType = overrideMediaType || getMediaType(mimeType)

  try {
    if (typeof file.size === 'undefined') {
      throw new Error('CORRUPT_FILE: File size is missing. This happens when the file_blob is not a valid Blob instance.')
    }

    if (file.size <= CHUNK_THRESHOLD) {
      // Single POST upload
      const formData = new FormData()
      console.log('Single upload file:', file, 'size:', file.size, 'type:', file.type)
      formData.append('file', file, fileName)
      formData.append('filename', fileName)
      formData.append('mime_type', mimeType)
      formData.append('file_size', String(file.size))
      formData.append('media_type', mediaType)
      if (blurhash) formData.append('blurhash', blurhash)
      if (aspect_ratio) formData.append('aspect_ratio', String(aspect_ratio))
      if (context.caption) formData.append('caption', context.caption)
      if (context.client_file_id) formData.append('client_file_id', context.client_file_id)
      if (context.duration != null) formData.append('duration', String(context.duration))

      if (context.client_msg_id) formData.append('client_msg_id', context.client_msg_id)
      if (context.chat_type === 'directmessage') {
        formData.append('direct_message_id', context.context_id)
      } else {
        formData.append('chatgroup_id', context.context_id)
      }      // Log formData to verify (FormData looks empty in console unless spread)
      console.log('FormData contents:', Array.from(formData.entries()))

      const response = await axiosInstance.post('media/upload/direct/', formData, {
        signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percent)
          }
        }
      })

      onComplete(response.data.file_id || response.data.upload_id)
    } else {
      // Chunked upload
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      // 1. Initiate
      const initiateResponse = await axiosInstance.post('media/upload/initiate/', {
        filename: fileName,
        mime_type: mimeType,
        media_type: mediaType,
        total_size: file.size,
        total_chunks: totalChunks,
        blurhash,
        aspect_ratio,
        caption: context.caption,
        client_msg_id: context.client_msg_id,
        client_file_id: context.client_file_id,
        duration: context.duration,
        [context.chat_type === 'directmessage' ? 'direct_message_id' : 'chatgroup_id']: context.context_id
      }, { signal })

      const uploadId = initiateResponse.data.upload_id

      // 2. Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(file.size, start + CHUNK_SIZE)
        const chunk = file.slice(start, end)

        let success = false
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const formData = new FormData()
            formData.append('chunk', chunk)

            await axiosInstance.post('media/upload/chunk/', formData, {
              signal,
              headers: {
                'X-Upload-Id': uploadId,
                'X-Chunk-Index': i
              }
            })
            success = true
            break
          } catch (e) {
            if (attempt === 3) throw e
            await wait(1000 * attempt)
          }
        }

        if (!success) throw new Error(`Failed to upload chunk ${i}`)

        const progress = Math.round(((i + 1) * 100) / totalChunks)
        onProgress(progress)
      }

      onComplete(uploadId)
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    onError(error.message || 'Upload failed')
  }
}

