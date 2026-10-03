// components/admin/VariantManager.tsx
'use client'

import { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react'

interface Variant {
  id?: string
  attributes: Record<string, string>
  price: number
  stock: number
  sku: string
  image?: string
}

interface VariantManagerProps {
  variants: Variant[]
  onChange: (variants: Variant[]) => void
  attributes: { name: string; values: string[] }[]
  onAttributesChange: (attributes: { name: string; values: string[] }[]) => void
}

export default function VariantManager({
  variants,
  onChange,
  attributes,
  onAttributesChange
}: VariantManagerProps) {
  const [newAttributeName, setNewAttributeName] = useState('')
  const [newAttributeValues, setNewAttributeValues] = useState('')
  const [expanded, setExpanded] = useState(true)

  const addAttribute = () => {
    const name = newAttributeName.trim()
    const values = newAttributeValues.split(',').map(v => v.trim()).filter(Boolean)
    
    if (!name || values.length === 0) return
    
    const newAttrs = [...attributes, { name, values }]
    onAttributesChange(newAttrs)
    setNewAttributeName('')
    setNewAttributeValues('')
    generateVariants(newAttrs)
  }

  const removeAttribute = (index: number) => {
    const newAttrs = attributes.filter((_, i) => i !== index)
    onAttributesChange(newAttrs)
    if (newAttrs.length === 0) {
      onChange([])
    } else {
      generateVariants(newAttrs)
    }
  }

  const updateAttributeValues = (index: number, values: string[]) => {
    const newAttrs = attributes.map((attr, i) =>
      i === index ? { ...attr, values } : attr
    )
    onAttributesChange(newAttrs)
    generateVariants(newAttrs)
  }

  const generateVariants = (attrs: { name: string; values: string[] }[]) => {
    if (attrs.length === 0) {
      onChange([])
      return
    }

    // Générer toutes les combinaisons possibles
    const combinations = attrs.reduce(
      (acc, attr) => {
        const newAcc: Record<string, string>[] = []
        for (const item of acc) {
          for (const value of attr.values) {
            newAcc.push({ ...item, [attr.name]: value })
          }
        }
        return newAcc
      },
      [{}] as Record<string, string>[]
    )

    // Préserver les données existantes si possible
    const newVariants = combinations.map((combo) => {
      const existing = variants.find(v =>
        Object.entries(combo).every(([key, val]) => v.attributes[key] === val)
      )
      return existing || {
        attributes: combo,
        price: 0,
        stock: 0,
        sku: '',
        image: ''
      }
    })

    onChange(newVariants)
  }

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    onChange(newVariants)
  }

  const removeVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index)
    onChange(newVariants)
  }

  const copyVariant = (index: number) => {
    const variant = variants[index]
    const newVariant = {
      ...variant,
      sku: variant.sku ? `${variant.sku}-copy` : ''
    }
    onChange([...variants, newVariant])
  }

  const applyToAll = (field: keyof Variant, value: any) => {
    const newVariants = variants.map(v => ({ ...v, [field]: value }))
    onChange(newVariants)
  }

  if (attributes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Aucune variation définie</p>
          <p className="text-sm text-gray-400 mt-1">
            Ajoutez des attributs ci-dessous pour créer des variantes
          </p>
        </div>
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            placeholder="Nom (ex: Couleur, Taille)"
            value={newAttributeName}
            onChange={(e) => setNewAttributeName(e.target.value)}
            className="flex-1 min-w-[150px] px-3 py-2 border rounded"
          />
          <input
            type="text"
            placeholder="Valeurs (ex: Rouge, Bleu, Vert)"
            value={newAttributeValues}
            onChange={(e) => setNewAttributeValues(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border rounded"
          />
          <button
            onClick={addAttribute}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Ajout d'attributs */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <input
          type="text"
          placeholder="Nom (ex: Couleur, Taille)"
          value={newAttributeName}
          onChange={(e) => setNewAttributeName(e.target.value)}
          className="flex-1 min-w-[150px] px-3 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="Valeurs (ex: Rouge, Bleu, Vert)"
          value={newAttributeValues}
          onChange={(e) => setNewAttributeValues(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded"
        />
        <button
          onClick={addAttribute}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Liste des attributs existants */}
      <div className="space-y-2">
        {attributes.map((attr, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2 bg-white px-3 py-2 rounded border border-gray-200">
            <span className="font-medium text-gray-700">{attr.name}</span>
            <span className="text-gray-500">:</span>
            <div className="flex flex-wrap gap-1">
              {attr.values.map((value, vIdx) => (
                <span key={vIdx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm">
                  {value}
                </span>
              ))}
            </div>
            <button
              onClick={() => removeAttribute(idx)}
              className="ml-auto text-red-500 hover:text-red-700 p-1"
              title="Supprimer cet attribut"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Tableau des variantes */}
      {variants.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {variants.length} variante(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {expanded ? 'Réduire' : 'Développer'}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {attributes.map(attr => (
                      <th key={attr.name} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                        {attr.name}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                      Prix
                      <button
                        onClick={() => {
                          const val = prompt('Prix à appliquer à toutes les variantes:')
                          if (val !== null && !isNaN(Number(val))) {
                            applyToAll('price', Number(val))
                          }
                        }}
                        className="ml-1 text-xs text-blue-500 hover:underline"
                      >
                        (tout)
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                      Stock
                      <button
                        onClick={() => {
                          const val = prompt('Stock à appliquer à toutes les variantes:')
                          if (val !== null && !isNaN(Number(val))) {
                            applyToAll('stock', Number(val))
                          }
                        }}
                        className="ml-1 text-xs text-blue-500 hover:underline"
                      >
                        (tout)
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                      SKU
                      <button
                        onClick={() => {
                          const val = prompt('SKU à appliquer à toutes les variantes:')
                          if (val !== null) {
                            applyToAll('sku', val)
                          }
                        }}
                        className="ml-1 text-xs text-blue-500 hover:underline"
                      >
                        (tout)
                      </button>
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variants.map((variant, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {attributes.map(attr => (
                        <td key={attr.name} className="px-3 py-2 text-gray-700">
                          {variant.attributes[attr.name] || '-'}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={variant.price || ''}
                          onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))}
                          className="w-24 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={variant.stock || ''}
                          onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))}
                          className="w-20 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={variant.sku || ''}
                          onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                          className="w-32 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="SKU"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => copyVariant(idx)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                            title="Dupliquer cette variante"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => removeVariant(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Supprimer cette variante"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}