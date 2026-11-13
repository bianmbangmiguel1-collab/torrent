'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductForm from '@/components/admin/ProductForm'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'

interface AdminMeResponse {
  authenticated?: boolean
}

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

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
        const data = (await res.json()) as AdminMeResponse
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        setLoading(false)
      } catch {
        router.replace('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <Link href="/admin/product-factory" className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100">
          <Sparkles size={17} /> Préparer une idée avec Product Factory <ArrowRight size={16} />
        </Link>
      </div>
      <ProductForm />
    </div>
  )
}
