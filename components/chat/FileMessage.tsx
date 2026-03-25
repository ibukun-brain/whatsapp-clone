import React, { memo } from 'react'
import { FileText, FileArchive, FileBarChart2 as FileSpreadsheet, BarChart2 as FileBarChart, File as FileIcon, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'

interface FileMessageProps {
  file: MediaFile
  onRetry?: () => void
}

function getFileIcon(type: MediaFile['type'], mimeType: string) {
  switch (type) {
    case 'pdf':         return <FileText className="h-8 w-8 text-red-500" />
    case 'word':        return <FileText className="h-8 w-8 text-blue-500" />
    case 'excel':       return <FileSpreadsheet className="h-8 w-8 text-green-500" />
    case 'powerpoint':  return <FileBarChart className="h-8 w-8 text-orange-500" />
    case 'access':      return <FileIcon className="h-8 w-8 text-red-700" />
    case 'archive':     return <FileArchive className="h-8 w-8 text-orange-500" />
    case 'audio':       return <FileIcon className="h-8 w-8 text-purple-500" />
    default:
      return <FileIcon className="h-8 w-8 text-gray-500" />
  }
}

function getFormatLabel(type: MediaFile['type'], mimeType: string) {
  switch (type) {
    case 'pdf':         return 'PDF'
    case 'word':        return mimeType.includes('.document') ? 'DOCX' : 'DOC'
    case 'excel':       return mimeType.includes('.sheet') ? 'XLSX' : 'XLS'
    case 'powerpoint':  return mimeType.includes('.presentation') ? 'PPTX' : 'PPT'
    case 'access':      return 'MDB'
    case 'archive':     return mimeType.includes('rar') ? 'RAR' : mimeType.includes('7z') ? '7Z' : 'ZIP'
    case 'audio':       return (mimeType ?? '').split('/')[1]?.toUpperCase() || 'AUDIO'
    default:            return (mimeType ?? '').split('/')[1]?.toUpperCase() || 'FILE'
  }
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function FileMessageComp({ file, onRetry }: FileMessageProps) {
  const isReady = file.status === 'ready'

  return (
    <div className="flex w-full min-w-[200px] max-w-[280px] items-start gap-3 rounded-lg bg-black/5 p-3 dark:bg-white/5">
      <div className="relative shrink-0">
        {getFileIcon(file.type, file.mime_type)}
        {(file.status === 'uploading' || file.status === 'processing') && (
          <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm dark:bg-gray-800">
            <Loader2 className="h-3 w-3 animate-spin text-green-500" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <span className="truncate text-sm font-medium leading-tight text-gray-900 dark:text-gray-100">
          {file.filename}
        </span>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>{getFormatLabel(file.type, file.mime_type)}</span>
          <span>•</span>
          <span>{formatFileSize(file.file_size)}</span>
        </div>
        
        {file.status === 'uploading' && (
          <div className="mt-2 h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300" 
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}

        {file.status === 'failed' && (
          <div className="mt-1 flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            <span>Failed</span>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onRetry?.()
              }}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {isReady && (
        <a 
          href={file.media_url || '#'} 
          download={file.filename}
          className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-5 w-5 text-gray-500" />
        </a>
      )}
    </div>
  )
}

export default memo(FileMessageComp, (prev, next) => {
  return (
    prev.file.file_id === next.file.file_id &&
    prev.file.status === next.file.status &&
    prev.file.progress === next.file.progress &&
    prev.file.media_url === next.file.media_url
  )
})
