import React from 'react'
import { FileText, FileArchive, FileBarChart2 as FileSpreadsheet, File as FileIcon, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { MediaFile } from '@/types/mediaTypes'
import { cn } from '@/lib/utils'

interface FileMessageProps {
  file: MediaFile
  onRetry?: () => void
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />
  if (mimeType.includes('wordprocessingml')) return <FileText className="h-8 w-8 text-blue-500" />
  if (mimeType.includes('spreadsheetml')) return <FileSpreadsheet className="h-8 w-8 text-green-500" />
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="h-8 w-8 text-orange-500" />
  return <FileIcon className="h-8 w-8 text-gray-500" />
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function FileMessage({ file, onRetry }: FileMessageProps) {
  const isReady = file.status === 'ready'

  return (
    <div className="flex w-full min-w-[200px] max-w-[280px] items-start gap-3 rounded-lg bg-black/5 p-3 dark:bg-white/5">
      <div className="relative shrink-0">
        {getFileIcon(file.mime_type)}
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
          <span>{file.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
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
