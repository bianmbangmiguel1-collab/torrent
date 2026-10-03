// components/admin/ProductForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import ImageUploader from './ImageUploader'
import FileUploader from './FileUploader'
import VariantManager from './VariantManager'
import ProductTypeFields from './ProductTypeFields'
import RichTextEditor from './RichTextEditor'
import TagInput from './TagInput'
import CurrencyConverter from './CurrencyConverter'

// 👇 IMPORT DES CATÉGORIES EN DUR
import { categories, getCategoriesByParent, getCategoryById } from '@/app/data/categoriesData'

const productSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  type: z.enum([
    'file', 'license', 'subscription', 'group_access', 'course',
    'event', 'credits', 'custom', 'consultation', 'survey',
    'streaming', 'affiliate', 'certificate', 'data', 'ia_generation'
  ]).default('file'),
  price: z.number().min(0, 'Le prix doit être positif'),
  compare_price: z.number().nullable().optional(),
  cost_price: z.number().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  stock: z.number().min(0).default(0),
  stock_alert: z.number().min(0).default(5),
  category_id: z.number().nullable().optional(),
  brand: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  visibility: z.enum(['public', 'private', 'password']).default('public'),
  password: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  weight: z.number().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  validity_start_date: z.string().nullable().optional(),
  validity_end_date: z.string().nullable().optional(),
  validity_duration_days: z.number().default(0),
  validity_duration_unit: z.enum(['days', 'months', 'years']).default('days'),
  has_auto_renewal: z.boolean().default(false),
  renewal_price: z.number().nullable().optional(),
  base_currency: z.string().default('FCFA'),
  file_path: z.string().nullable().optional(),
  file_size: z.string().nullable().optional(),
  file_format: z.string().nullable().optional(),
  download_limit: z.number().default(0),
  download_expires_days: z.number().default(30),
  license_validity_days: z.number().default(365),
  license_quantity: z.number().default(1),
  group_id: z.string().nullable().optional(),
  group_link: z.string().nullable().optional(),
  require_phone: z.boolean().default(false),
  course_id: z.number().nullable().optional(),
  event_id: z.number().nullable().optional(),
  event_date: z.string().nullable().optional(),
  event_link: z.string().nullable().optional(),
  credits_amount: z.number().default(0),
  subscription_interval: z.enum(['monthly', 'quarterly', 'yearly']).nullable().optional(),
  subscription_trial_days: z.number().default(0),
  consultation_duration: z.number().default(30),
  affiliate_commission: z.number().default(10),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  meta_keywords: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string(), isMain: z.boolean().default(false) })).default([]),
  variants: z.array(z.any()).default([])
})

type ProductFormData = z.infer<typeof productSchema>

// ============================================================
// Types de réponses API
// ============================================================
interface AIGenerateResponse {
  data?: {
    description?: string
    meta_title?: string
    meta_description?: string
    meta_keywords?: string
    tags?: string[]
    price?: number
    compare_price?: number | null
    cost_price?: number | null
    stock?: number
    stock_alert?: number
    sku?: string
    brand?: string
    weight?: number
    dimensions?: string
    validity_start_date?: string
    validity_end_date?: string
    validity_duration_days?: number
    image_url?: string
  }
  error?: string
}

interface ProductActionResponse {
  product?: {
    id?: number
  }
  error?: string
  message?: string
}

interface ProductImagesResponse {
  images?: Array<{
    url: string
    is_main?: number
    alt?: string
    id?: number
  }>
  error?: string
}

interface ProductFormProps {
  product?: any
  onSuccess?: () => void
}

const PRODUCT_TYPES = [
  { value: 'file', label: 'Fichier téléchargeable' },
  { value: 'license', label: 'Licence / Clé d\'activation' },
  { value: 'subscription', label: 'Abonnement récurrent' },
  { value: 'group_access', label: 'Accès groupe (WhatsApp/Telegram)' },
  { value: 'course', label: 'Formation en ligne' },
  { value: 'event', label: 'Événement / Webinaire' },
  { value: 'credits', label: 'Crédits / Monnaie virtuelle' },
  { value: 'custom', label: 'Contenu personnalisé' },
  { value: 'consultation', label: 'Consultation / Coaching' },
  { value: 'survey', label: 'Questionnaire / Diagnostic' },
  { value: 'streaming', label: 'Bibliothèque de contenus (streaming)' },
  { value: 'affiliate', label: 'Lien d\'affiliation' },
  { value: 'certificate', label: 'Certification / Badge' },
  { value: 'data', label: 'Données / Rapport de recherche' },
  { value: 'ia_generation', label: 'Contenu généré par IA' }
]

export default function ProductForm({ product, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attributes, setAttributes] = useState<{ name: string; values: string[] }[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [tempImageUrls, setTempImageUrls] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const [selectedParentId, setSelectedParentId] = useState<number | null>(null)
  const [subCategories, setSubCategories] = useState<typeof categories>([])

  // ✅ Vérification de l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) {
          router.replace('/admin/login')
          return
        }
        const data: { authenticated?: boolean } = await res.json()
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        setIsAuthenticated(true)
      } catch {
        router.replace('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: 'file',
      status: 'draft',
      visibility: 'public',
      stock: 0,
      featured: false,
      download_limit: 0,
      download_expires_days: 30,
      license_validity_days: 365,
      license_quantity: 1,
      require_phone: false,
      affiliate_commission: 10,
      consultation_duration: 30,
      subscription_trial_days: 0,
      validity_duration_days: 0,
      validity_duration_unit: 'days',
      has_auto_renewal: false,
      base_currency: 'FCFA',
      images: [],
      variants: [],
      tags: []
    }
  })

  // Réinitialisation du formulaire
  useEffect(() => {
    if (!product || !product.id) {
      reset({
        type: 'file',
        status: 'draft',
        visibility: 'public',
        stock: 0,
        featured: false,
        download_limit: 0,
        download_expires_days: 30,
        license_validity_days: 365,
        license_quantity: 1,
        require_phone: false,
        affiliate_commission: 10,
        consultation_duration: 30,
        subscription_trial_days: 0,
        validity_duration_days: 0,
        validity_duration_unit: 'days',
        has_auto_renewal: false,
        base_currency: 'FCFA',
        images: [],
        variants: [],
        tags: []
      })
      setSelectedParentId(null)
      setSubCategories([])
      setValue('category_id', null)
      return
    }

    if (product && product.id) {
      const formatted: any = {
        ...product,
        price: product.price || 0,
        compare_price: product.compare_price ?? null,
        cost_price: product.cost_price ?? null,
        stock: product.stock || 0,
        stock_alert: product.stock_alert || 5,
        featured: product.featured === 1,
        require_phone: product.require_phone === 1,
        has_auto_renewal: product.has_auto_renewal === 1,
        validity_duration_days: product.validity_duration_days || 0,
        validity_duration_unit: product.validity_duration_unit || 'days',
        download_limit: product.download_limit || 0,
        download_expires_days: product.download_expires_days || 30,
        license_validity_days: product.license_validity_days || 365,
        license_quantity: product.license_quantity || 1,
        affiliate_commission: product.affiliate_commission || 10,
        consultation_duration: product.consultation_duration || 30,
        subscription_trial_days: product.subscription_trial_days || 0,
        credits_amount: product.credits_amount || 0,
        renewal_price: product.renewal_price ?? null,
        course_id: product.course_id ?? null,
        event_id: product.event_id ?? null,
        group_id: product.group_id ?? null,
        group_link: product.group_link ?? null,
        event_date: product.event_date ?? null,
        event_link: product.event_link ?? null,
        subscription_interval: product.subscription_interval ?? null,
        password: product.password ?? null,
        barcode: product.barcode ?? null,
        sku: product.sku ?? null,
        brand: product.brand ?? null,
        weight: product.weight ?? null,
        dimensions: product.dimensions ?? null,
        validity_start_date: product.validity_start_date ?? null,
        validity_end_date: product.validity_end_date ?? null,
        scheduled_at: product.scheduled_at ?? null,
        meta_title: product.meta_title ?? null,
        meta_description: product.meta_description ?? null,
        meta_keywords: product.meta_keywords ?? null,
        file_path: product.file_path ?? null,
        file_size: product.file_size ?? null,
        file_format: product.file_format ?? null,
        description: product.description ?? '',
        tags: Array.isArray(product.tags) ? product.tags : [],
        images: Array.isArray(product.images) ? product.images : [],
        variants: Array.isArray(product.variants) ? product.variants : []
      }

      reset(formatted)

      if (product.category_id) {
        const cat = getCategoryById(product.category_id)
        if (cat) {
          setSelectedParentId(cat.parentId)
          setSubCategories(getCategoriesByParent(cat.parentId))
          setValue('category_id', product.category_id)
        } else {
          setSelectedParentId(null)
          setSubCategories([])
          setValue('category_id', null)
        }
      } else {
        setSelectedParentId(null)
        setSubCategories([])
        setValue('category_id', null)
      }
    }
  }, [product, reset])

  // Nettoyage des URLs temporaires
  useEffect(() => {
    return () => {
      tempImageUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [tempImageUrls])

  const watchType = watch('type') ?? 'file'
  const watchVisibility = watch('visibility') ?? 'public'
  const watchStatus = watch('status') ?? 'draft'
  const watchImages = watch('images') ?? []
  const watchTitle = watch('title') ?? ''
  const watchPrice = watch('price') ?? 0
  const watchBaseCurrency = watch('base_currency') ?? 'FCFA'
  const watchHasAutoRenewal = watch('has_auto_renewal') ?? false
  const watchDescription = watch('description') ?? ''

  // Génération automatique du slug
  useEffect(() => {
    if (watchTitle && !product?.slug) {
      const slug = watchTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setValue('slug', slug)
    }
  }, [watchTitle, setValue, product])

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parentId = e.target.value ? Number(e.target.value) : null
    setSelectedParentId(parentId)
    const subs = parentId ? getCategoriesByParent(parentId) : []
    setSubCategories(subs)
    setValue('category_id', null)
  }

  // Génération IA
  const handleAIGenerate = async () => {
    const title = watch('title')
    if (!title || title.length < 3) {
      alert('Veuillez d’abord saisir un titre (minimum 3 caractères).')
      return
    }

    setIsGeneratingAI(true)
    setError('')

    try {
      const res = await fetch('/api/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: watch('title'),
          type: watch('type'),
          brand: watch('brand'),
          category: watch('category_id')
        })
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        const err: { error?: string } = await res.json()
        throw new Error(err.error || 'Erreur IA')
      }

      const result: AIGenerateResponse = await res.json()
      const data = result.data

      if (!data) {
        throw new Error('Réponse IA invalide')
      }

      setValue('description', data.description || '')
      setValue('meta_title', data.meta_title || '')
      setValue('meta_description', data.meta_description || '')
      setValue('meta_keywords', data.meta_keywords || '')
      if (data.tags && data.tags.length > 0) {
        setValue('tags', data.tags)
      }

      setValue('price', data.price || 0)
      setValue('compare_price', data.compare_price ?? null)
      setValue('cost_price', data.cost_price ?? null)

      setValue('stock', data.stock || 0)
      setValue('stock_alert', data.stock_alert || 5)
      setValue('sku', data.sku || '')
      setValue('brand', data.brand || '')

      setValue('weight', data.weight || 0)
      setValue('dimensions', data.dimensions || '')

      setValue('validity_start_date', data.validity_start_date || '')
      setValue('validity_end_date', data.validity_end_date || '')
      setValue('validity_duration_days', data.validity_duration_days || 30)

      if (data.image_url) {
        const currentImages = watch('images') || []
        const newImage = {
          url: data.image_url,
          isMain: currentImages.length === 0,
          alt: watch('title') || 'Image produit'
        }
        setValue('images', [...currentImages, newImage])
      }

      alert('✨ Produit généré par IA avec succès !')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // SOUMISSION
  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true)
      setError('')

      if (isAuthenticated === null) {
        setError('Vérification de l\'authentification en cours...')
        setLoading(false)
        return
      }

      const isEditing = !!product?.id
      const url = isEditing ? `/api/admin/products/${product.id}` : '/api/admin/products'
      const method = isEditing ? 'PUT' : 'POST'

      const payload = {
        ...data,
        price: Number(data.price),
        compare_price: data.compare_price ? Number(data.compare_price) : null,
        cost_price: data.cost_price ? Number(data.cost_price) : null,
        stock: Number(data.stock),
        stock_alert: Number(data.stock_alert),
        featured: data.featured ? 1 : 0,
        download_limit: Number(data.download_limit),
        download_expires_days: Number(data.download_expires_days),
        license_validity_days: Number(data.license_validity_days),
        license_quantity: Number(data.license_quantity),
        affiliate_commission: Number(data.affiliate_commission),
        consultation_duration: Number(data.consultation_duration),
        subscription_trial_days: Number(data.subscription_trial_days),
        credits_amount: Number(data.credits_amount),
        validity_duration_days: Number(data.validity_duration_days),
        renewal_price: data.renewal_price ? Number(data.renewal_price) : null,
        require_phone: data.require_phone ? 1 : 0,
        has_auto_renewal: data.has_auto_renewal ? 1 : 0,
        images: data.images,
        variants: data.variants
      }

      console.log('📤 Envoi des données :', payload)

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        const err: { error?: string } = await res.json()
        throw new Error(err.error || 'Erreur lors de la sauvegarde')
      }

      const result: ProductActionResponse = await res.json()
      console.log('📦 Réponse de l\'API :', result)

      // Récupération du productId
      const productId = result.product?.id
      if (!productId) {
        console.error('❌ productId manquant dans la réponse', result)
        throw new Error('Erreur : ID du produit non retourné par le serveur')
      }

      // Upload des images après création
      if (!isEditing && uploadedFiles.length > 0) {
        const formData = new FormData()
        uploadedFiles.forEach(file => formData.append('images', file))
        formData.append('productId', String(productId))

        const uploadRes = await fetch('/api/admin/products/upload-images', {
          method: 'POST',
          credentials: 'include',
          body: formData
        })

        if (uploadRes.ok) {
          const uploadData: ProductImagesResponse = await uploadRes.json()
          const newImages = (uploadData.images || []).map((img: any) => ({
            url: img.url,
            isMain: img.is_main === 1,
            alt: img.alt || '',
            id: img.id
          }))
          setValue('images', newImages)
          setUploadedFiles([])
        } else {
          console.warn('⚠️ Les images n\'ont pas pu être uploadées')
        }
      }

      // ✅ Redirection vers la page d'édition
      if (!isEditing) {
        console.log(`🔄 Redirection vers /admin/products/${productId}/edit`)
        router.replace(`/admin/products/${productId}/edit`)
      } else {
        // En mode édition, on reste sur la page
        onSuccess?.()
        alert('Produit sauvegardé avec succès !')
      }
    } catch (err: any) {
      console.error('❌ Erreur sauvegarde:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Gestion de l'upload d'images
  const handleImageUpload = async (files: File[]) => {
    try {
      setUploadedFiles(prev => [...prev, ...files])

      if (product?.id) {
        const formData = new FormData()
        files.forEach(f => formData.append('images', f))
        formData.append('productId', String(product.id))

        const res = await fetch('/api/admin/products/upload-images', {
          method: 'POST',
          credentials: 'include',
          body: formData
        })

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/admin/login')
            return
          }
          const err: { error?: string } = await res.json()
          throw new Error(err.error || 'Erreur upload')
        }

        const data: ProductImagesResponse = await res.json()
        const newImages = (data.images || []).map((img: any) => ({
          url: img.url,
          isMain: img.is_main === 1,
          alt: img.alt || '',
          id: img.id
        }))
        setValue('images', newImages)
      } else {
        const currentImages = watchImages || []
        const newTempImages = files.map((file, idx) => {
          const url = URL.createObjectURL(file)
          setTempImageUrls(prev => [...prev, url])
          return {
            url,
            isMain: currentImages.length === 0 && idx === 0
          }
        })
        setValue('images', [...currentImages, ...newTempImages])
      }
    } catch (err: any) {
      console.error('❌ Erreur upload images:', err)
      alert(err.message || 'Erreur lors de l\'upload des images')
    }
  }

  const removeImage = (index: number) => {
    const current = watchImages || []
    const removed = current[index]
    if (removed?.url && removed.url.startsWith('blob:')) {
      URL.revokeObjectURL(removed.url)
      setTempImageUrls(prev => prev.filter(url => url !== removed.url))
    }
    setValue('images', current.filter((_, i) => i !== index))
  }

  const setMainImage = (index: number) => {
    const current = watchImages || []
    setValue('images', current.map((img, i) => ({
      ...img,
      isMain: i === index
    })))
  }

  const getTypeLabel = (type: string) => {
    const found = PRODUCT_TYPES.find(t => t.value === type)
    return found ? found.label : type
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-bold">
            {product?.id ? 'Modifier le produit' : 'Créer un produit'}
          </h2>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            watchStatus === 'published' ? 'bg-green-100 text-green-700' :
            watchStatus === 'archived' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {watchStatus === 'published' ? 'Publié' :
             watchStatus === 'archived' ? 'Archivé' : 'Brouillon'}
          </span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            {getTypeLabel(watchType)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="font-bold">Erreurs de validation :</p>
          <ul className="list-disc list-inside">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{field} : {error.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Informations générales */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Informations générales
            </h3>

            <div className="space-y-4">
              {/* Titre avec bouton IA */}
              <div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre du produit <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('title')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="Titre accrocheur du produit"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={handleAIGenerate}
                    disabled={isGeneratingAI}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 h-[42px] whitespace-nowrap"
                  >
                    {isGeneratingAI ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <span>✨</span>
                    )}
                    {isGeneratingAI ? 'Génération...' : 'IA Magic'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">/produit/</span>
                  <input
                    {...register('slug')}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="slug-du-produit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <RichTextEditor
                  value={watchDescription || ''}
                  onChange={(html) => setValue('description', html)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de produit <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('type')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {PRODUCT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('price', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="0"
                  />
                  {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix barré</label>
                  <input
                    type="number"
                    {...register('compare_price', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Prix original"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix de revient</label>
                  <input
                    type="number"
                    {...register('cost_price', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Coût d'achat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    {...register('sku')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Référence interne"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    {...register('stock', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Quantité disponible"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alerte stock</label>
                  <input
                    type="number"
                    {...register('stock_alert', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Seuil d'alerte"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Période de validité */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Période de validité
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                  <input
                    type="datetime-local"
                    {...register('validity_start_date')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                  <input
                    type="datetime-local"
                    {...register('validity_end_date')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée de validité</label>
                  <input
                    type="number"
                    {...register('validity_duration_days', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                  <select
                    {...register('validity_duration_unit')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="days">Jours</option>
                    <option value="months">Mois</option>
                    <option value="years">Années</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('has_auto_renewal')}
                  id="auto_renewal"
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label htmlFor="auto_renewal" className="text-sm font-medium text-gray-700">
                  Renouvellement automatique
                </label>
              </div>
              {watchHasAutoRenewal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix de renouvellement
                  </label>
                  <input
                    type="number"
                    {...register('renewal_price', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Prix du renouvellement"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Devises et conversion */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Devise et conversion
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise de base</label>
                <select
                  {...register('base_currency')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="FCFA">FCFA (Franc CFA)</option>
                  <option value="USD">USD (Dollar US)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (Livre Sterling)</option>
                </select>
              </div>
              <CurrencyConverter
                amount={watchPrice || 0}
                baseCurrency={watchBaseCurrency}
              />
            </div>
          </section>

          {/* Champs spécifiques au type */}
          <ProductTypeFields
            type={watchType}
            register={register}
            watch={watch}
            setValue={setValue}
          />

          {/* Images */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Images du produit
            </h3>
            <ImageUploader
              images={watchImages || []}
              onUpload={handleImageUpload}
              onDelete={removeImage}
              onSetMain={setMainImage}
              maxFiles={10}
            />
          </section>

          {/* Variations */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Variations
            </h3>
            <VariantManager
              variants={watch('variants') || []}
              onChange={(variants) => setValue('variants', variants)}
              attributes={attributes}
              onAttributesChange={setAttributes}
            />
          </section>

          {/* Tags */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tags
            </h3>
            <TagInput
              value={watch('tags') || []}
              onChange={(tags) => setValue('tags', tags)}
            />
          </section>
        </div>

        <div className="space-y-8">
          {/* Catégorie et marque */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Organisation</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Famille
                </label>
                <select
                  value={selectedParentId ?? ''}
                  onChange={handleParentChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Sélectionner une famille</option>
                  {getCategoriesByParent(null).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sous‑catégorie
                </label>
                <select
                  {...register('category_id', { valueAsNumber: true })}
                  value={watch('category_id') ?? ''}
                  onChange={(e) => setValue('category_id', e.target.value ? Number(e.target.value) : null)}
                  disabled={subCategories.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">Choisir une sous‑catégorie</option>
                  {subCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                <input
                  {...register('brand')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="Marque du produit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poids</label>
                <input
                  type="number"
                  {...register('weight', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="Poids (kg)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                <input
                  {...register('dimensions')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="L x l x h (cm)"
                />
              </div>
            </div>
          </section>

          {/* Statut et publication */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              Publication
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibilité</label>
                <select
                  {...register('visibility')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="public">Public</option>
                  <option value="private">Privé</option>
                  <option value="password">Protégé par mot de passe</option>
                </select>
              </div>

              {watchVisibility === 'password' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <input
                    {...register('password')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Mot de passe pour accéder"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Publication programmée</label>
                <input
                  type="datetime-local"
                  {...register('scheduled_at')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('featured')}
                  id="featured"
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Mettre en avant (produit vedette)
                </label>
              </div>
            </div>
          </section>

          {/* SEO */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              SEO
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta title</label>
                <input
                  {...register('meta_title')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="Titre pour les moteurs de recherche"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta description</label>
                <textarea
                  {...register('meta_description')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="Description pour les moteurs de recherche"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés</label>
                <input
                  {...register('meta_keywords')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="mot-clé1, mot-clé2, mot-clé3"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </form>
  )
}