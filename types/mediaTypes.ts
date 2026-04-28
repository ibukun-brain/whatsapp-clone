export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'failed'
export type MediaType = 'image' | 'video' | 'audio' | 'voice_recording' | 'pdf' | 'word' | 'excel' | 'powerpoint' | 'access' | 'archive' | 'file' | 'document'

export interface MediaFile {
  file_id: string            // tempId during upload, real file_id after media.ready
  client_file_id: string     // persistent client-side ID for mapping
  type: MediaType
  status: MediaStatus
  progress: number           // 0-100
  preview_url: string | null // local blob URL, sender only, cleared after ready
  media_url: string | null
  thumbnail_url: string | null
  blurhash: string | null
  timestamp: Date,
  aspect_ratio: number | null
  filename: string
  mime_type: string
  file_size: number
  caption?: string
  duration?: string        // stored as HH:MM:SS
  file_blob?: Blob // Store for retry support
  deleted?: {
    file_id: string,
    delete_type: string,
    deleted_by: string,
  }
}

export interface MediaReadyEvent {
  type: 'media_ready'
  data: {
    message_id: string
    client_msg_id?: string
    chat_type: 'directmessage' | 'group_chat'
    files: {
      file_id: string,
      client_file_id: string,
      media_url: string
      thumbnail_url: string | null
      blurhash: string | null
      aspect_ratio: number | null
      mime_type: string,
      type: string,
      filename: string
      file_size: number
      caption?: string
    }
  }
}

export interface UploadContext {
  chat_type: 'directmessage' | 'group_chat'
  context_id: string  // chatgroup_id or direct_message_id
  client_msg_id?: string
  client_file_id?: string
  caption?: string
  forceDocument?: boolean
  mediaTypeOverride?: string   // e.g. 'voice_recording'
  duration?: string            // duration as HH:MM:SS
  reply_to?: string            // message ID being replied to
  highlightedFile?: MediaFile  // optional specific file being replied to
  mentions?: import("./mentions").MentionInput[]
}
