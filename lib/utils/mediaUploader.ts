import { axiosInstance } from "../axios"
import { UploadContext } from "../../types/mediaTypes"

interface UploaderOptions {
  file: File
  context: UploadContext
  blurhash?: string | null
  aspect_ratio?: number | null
  onProgress: (percent: number) => void
  onComplete: (uploadId: string) => void
  onError: (error: string) => void
}

const CHUNK_SIZE = 64 * 1024 // 64KB
const CHUNK_THRESHOLD = 1 * 1024 * 1024 // 1MB

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function uploadMedia(options: UploaderOptions) {
  const { file, context, blurhash, aspect_ratio, onProgress, onComplete, onError } = options

  try {
    if (file.size <= CHUNK_THRESHOLD) {
      // Single POST upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)
      formData.append('mime_type', file.type)
      if (blurhash) formData.append('blurhash', blurhash)
      if (aspect_ratio) formData.append('aspect_ratio', String(aspect_ratio))
      
      if (context.is_dm) {
        formData.append('direct_message_id', context.context_id)
      } else {
        formData.append('chatgroup_id', context.context_id)
      }

      const response = await axiosInstance.post('/api/media/upload/', formData, {
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
      const initiateResponse = await axiosInstance.post('/api/media/upload/initiate/', {
        filename: file.name,
        mime_type: file.type,
        total_size: file.size,
        total_chunks: totalChunks,
        blurhash,
        aspect_ratio,
        [context.is_dm ? 'direct_message_id' : 'chatgroup_id']: context.context_id
      })

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
            
            await axiosInstance.post('/api/media/upload/chunk/', formData, {
              headers: {
                'X-Upload-Id': uploadId,
                'X-Chunk-Index': i,
                'Content-Type': 'multipart/form-data'
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
