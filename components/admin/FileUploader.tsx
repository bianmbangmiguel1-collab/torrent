// components/admin/FileUploader.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { File, X, CheckCircle, Upload, Loader2 } from 'lucide-react'

interface FileUploaderProps {
  currentFile?: string | null
  fileSize?: string | null
  fileFormat?: string | null
  onUpload: (fileInfo: { path: string; size: string; format: string }) => void
  onRemove?: () => void
  disabled?: boolean
  productId?: number | null
}

interface FileUploadResponse {
  path?: string
  size?: string
  format?: string
  error?: string
}

const MAX_SIZE = 500 * 1024 * 1024 // 500 MB

const ACCEPTED_TYPES = [
  '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.wav',
  '.epub', '.mobi',
  '.psd', '.ai', '.fig', '.sketch',
  '.txt', '.csv', '.json',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

export default function FileUploader({
  currentFile,
  fileSize,
  fileFormat,
  onUpload,
  onRemove,
  disabled = false,
  productId = null
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentFile) {
      console.log(`📎 Fichier actuel : ${currentFile} (${fileSize || '?'}, ${fileFormat || '?'})`)
    }
  }, [currentFile, fileSize, fileFormat])

  const uploadFile = async (file: File) => {
    setError(null)

    // Validation taille
    if (file.size > MAX_SIZE) {
      setError(`Fichier trop volumineux (max 500 MB). Votre fichier : ${formatBytes(file.size)}`)
      return
    }

    // Validation extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_TYPES.includes(ext)) {
      setError(`Type non autorisé : ${ext}. Formats acceptés : PDF, ZIP, MP4, MP3, DOC, etc.`)
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (productId) {
        formData.append('productId', String(productId))
      }

      // Barre de progression simulée (fetch natif ne supporte pas le vrai progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 300)

      const res = await fetch('/api/admin/products/upload-file', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Non authentifié. Reconnectez-vous.')
        }
        const err = (await res.json().catch(() => ({}))) as FileUploadResponse
        throw new Error(err.error || `Erreur HTTP ${res.status}`)
      }

      const data = (await res.json()) as FileUploadResponse
      console.log('✅ Fichier uploadé :', data)

      if (!data.path || !data.size || !data.format) {
        throw new Error('Réponse d’upload invalide')
      }

      onUpload({
        path: data.path,
        size: data.size,
        format: data.format,
      })

      setProgress(0)
    } catch (err: unknown) {
      console.error('❌ Erreur upload:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
      setProgress(0)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !uploading) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || uploading) return

    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const getFileName = (path: string) => {
    return path.split('/').pop() || path
  }

  const hasFile = currentFile && currentFile.trim() !== ''

  return (
    <div className="space-y-3">
      {/* Fichier existant */}
      {hasFile && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <File className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {getFileName(currentFile)}
              </div>
              <div className="text-xs text-gray-600 flex flex-wrap gap-3 mt-0.5">
                {fileSize && <span>💾 {fileSize}</span>}
                {fileFormat && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {fileFormat}
                  </span>
                )}
              </div>
            </div>
            <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="ml-2 text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 flex-shrink-0 transition"
              title="Supprimer le fichier"
              type="button"
              disabled={disabled}
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Zone d'upload (drag & drop) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : hasFile
              ? 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'
              : 'border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
          accept={ACCEPTED_TYPES.join(',')}
        />

        {uploading ? (
          <div className="text-center w-full">
            <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin mb-2" />
            <p className="text-sm font-medium text-blue-700 mb-2">
              Téléchargement en cours...
            </p>
            <div className="w-full max-w-xs mx-auto h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-1">{Math.round(progress)}%</p>
          </div>
        ) : (
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition ${
              isDragging ? 'bg-blue-500' : 'bg-blue-100'
            }`}>
              <Upload className={`w-6 h-6 ${isDragging ? 'text-white' : 'text-blue-600'}`} />
            </div>
            <p className="text-sm font-medium text-gray-800">
              {isDragging
                ? '📥 Déposez le fichier ici'
                : hasFile
                  ? 'Remplacer le fichier'
                  : 'Cliquez ou glissez un fichier ici'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, ZIP, MP4, MP3, DOC, etc. — Max 500 MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
          <X size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}