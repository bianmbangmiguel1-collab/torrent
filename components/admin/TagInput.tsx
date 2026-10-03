// components/admin/TagInput.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Search, Loader2 } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[] // Liste de tags suggérés (si non fourni, chargés depuis l'API)
  placeholder?: string
  disabled?: boolean
  maxTags?: number
}

interface TagsApiResponse {
  tags?: string[]
  error?: string
  message?: string
}

export default function TagInput({
  value,
  onChange,
  suggestions: initialSuggestions,
  placeholder = 'Ajouter un tag...',
  disabled = false,
  maxTags = 20
}: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions || [])
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Charger les suggestions depuis l'API si non fournies
  useEffect(() => {
    if (!initialSuggestions) {
      fetchSuggestions()
    }
  }, [initialSuggestions])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/tags')
      if (res.ok) {
        const data = (await res.json()) as TagsApiResponse
        setSuggestions(data.tags || [])
      }
    } catch (err) {
      console.error('Erreur chargement tags:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les suggestions en fonction de la saisie
  useEffect(() => {
    if (input.trim().length > 0) {
      const filtered = suggestions.filter(
        tag =>
          tag.toLowerCase().includes(input.toLowerCase()) &&
          !value.includes(tag)
      )
      setFilteredSuggestions(filtered.slice(0, 10))
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
  }, [input, suggestions, value])

  // Fermer les suggestions en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) {
      setInput('')
      setShowSuggestions(false)
      return
    }
    if (value.length >= maxTags) {
      setError(`Vous ne pouvez pas ajouter plus de ${maxTags} tags`)
      setTimeout(() => setError(null), 3000)
      return
    }
    onChange([...value, trimmed])
    setInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) {
        addTag(input)
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      // Supprimer le dernier tag si le champ est vide
      removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setInput('')
    }
  }

  const handleSuggestionClick = (tag: string) => {
    addTag(tag)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Champ de saisie */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (input.trim() && filteredSuggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              placeholder={placeholder}
              disabled={disabled || value.length >= maxTags}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            )}
          </div>
          <button
            onClick={() => addTag(input)}
            disabled={!input.trim() || disabled || value.length >= maxTags}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            type="button"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              <ul className="py-1">
                {filteredSuggestions.map((tag) => (
                  <li
                    key={tag}
                    onClick={() => handleSuggestionClick(tag)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm flex items-center gap-2"
                  >
                    <Search size={14} className="text-gray-400" />
                    {tag}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                Aucune suggestion
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="text-sm text-red-500 flex items-center gap-1">
          <X size={14} />
          {error}
        </div>
      )}

      {/* Tags existants */}
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200"
          >
            #{tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-red-600 transition-colors ml-1"
              type="button"
              disabled={disabled}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-sm text-gray-400">Aucun tag ajouté</span>
        )}
      </div>

      {/* Compteur */}
      <div className="text-xs text-gray-400 flex justify-between">
        <span>
          {value.length} / {maxTags} tags
        </span>
        <span>
          {value.length > maxTags * 0.8 && (
            <span className="text-yellow-500">
              {maxTags - value.length} restant(s)
            </span>
          )}
        </span>
      </div>
    </div>
  )
}