// app/admin/products/new/page.tsx
'use client'

import ProductForm from '@/components/admin/ProductForm'

export default function NewProductPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProductForm />
    </div>
  )
}