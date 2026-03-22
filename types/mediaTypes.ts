export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'failed'
export type MediaType = 'image' | 'video' | 'file'

export interface MediaFile {
  file_id: string            // tempId during upload, real file_id after media.ready
  type: MediaType
  status: MediaStatus
  progress: number           // 0-100
  preview_url: string | null // local blob URL, sender only, cleared after ready
  media_url: string | null
  thumbnail_url: string | null
  blurhash: string | null
  aspect_ratio: number | null
  filename: string
  mime_type: string
  file_size: number
}

export interface MediaReadyEvent {
  type: 'media.ready'
  message_id: string
  file_id: string
  media_url: string
  thumbnail_url: string | null
  blurhash: string | null
  aspect_ratio: number | null
  mime_type: string
  filename: string
  file_size: number
  is_dm: boolean
}

export interface UploadContext {
  is_dm: boolean
  context_id: string  // chatgroup_id or direct_message_id
}
