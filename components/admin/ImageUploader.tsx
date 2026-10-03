// components/admin/ImageUploader.tsx
'use client'

import { useState, useCallback, type InputHTMLAttributes } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image as ImageIcon, Star, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface ImageItem {
  id?: string
  url: string
  isMain?: boolean
  alt?: string
}

interface ImageUploaderProps {
  images: ImageItem[]
  onUpload: (files: File[]) => Promise<void>
  onDelete: (index: number) => void
  onSetMain: (index: number) => void
  maxFiles?: number
  disabled?: boolean
}

export default function ImageUploader({
  images,
  onUpload,
  onDelete,
  onSetMain,
  maxFiles = 10,
  disabled = false
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (images.length + acceptedFiles.length > maxFiles) {
        setError(`Vous ne pouvez pas télécharger plus de ${maxFiles} images`)
        return
      }

      setError(null)
      setUploading(true)
      try {
        await onUpload(acceptedFiles)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
      } finally {
        setUploading(false)
      }
    },
    [images.length, maxFiles, onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => {},
    onDragLeave: () => {},
    onDragOver: () => {},
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']
    },
    maxFiles: maxFiles - images.length,
    disabled: disabled || uploading || images.length >= maxFiles,
    multiple: true
  })

  const inputProps = getInputProps() as InputHTMLAttributes<HTMLInputElement>
  const remainingSlots = maxFiles - images.length

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${(disabled || uploading || images.length >= maxFiles) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...inputProps} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Téléchargement en cours...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600">
                {isDragActive
                  ? 'Déposez vos images ici'
                  : 'Glissez-déposez vos images, ou cliquez pour sélectionner'}
              </p>
              <p className="text-xs text-gray-400">
                {images.length}/{maxFiles} images • PNG, JPG, WEBP, GIF, SVG
              </p>
              {remainingSlots > 0 && (
                <p className="text-xs text-blue-500">
                  {remainingSlots} image(s) restante(s)
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <X className="h-4 w-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Prévisualisation des images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img, index) => (
            <div
              key={img.id || index}
              className="relative group border rounded-lg overflow-hidden bg-gray-50 aspect-square"
            >
              <Image
                src={img.url}
                alt={img.alt || `Image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />

              {/* Overlay au survol */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {/* Bouton principale */}
                <button
                  onClick={() => onSetMain(index)}
                  className={`
                    p-1.5 rounded-full transition-colors
                    ${img.isMain
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-white/80 text-gray-700 hover:bg-white'
                    }
                  `}
                  title={img.isMain ? 'Image principale' : 'Définir comme principale'}
                >
                  <Star className={`h-4 w-4 ${img.isMain ? 'fill-white' : ''}`} />
                </button>

                {/* Bouton supprimer */}
                <button
                  onClick={() => onDelete(index)}
                  className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Supprimer cette image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Badge principale */}
              {img.isMain && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" />
                  Principale
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message si aucune image */}
      {images.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-400">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune image téléchargée</p>
        </div>
      )}
    </div>
  )
}