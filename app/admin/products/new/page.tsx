// app/admin/products/new/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'
import { Loader2 } from 'lucide-react'

// ============================================================
// Types de réponses API
// ============================================================
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProductForm />
    </div>
  )
}