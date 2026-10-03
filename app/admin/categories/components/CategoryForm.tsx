'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  position: number;
  is_active: number;
}

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Category | null;
  categories: Category[];
  loading: boolean;
}

export default function CategoryForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  loading,
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSlug(initialData.slug);
      setParentId(initialData.parent_id);
      setDescription(initialData.description || '');
      setPosition(initialData.position);
      setIsActive(initialData.is_active === 1);
    } else {
      // Réinitialiser pour une nouvelle catégorie
      setName('');
      setSlug('');
      setParentId(null);
      setDescription('');
      setPosition(0);
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      parent_id: parentId,
      description: description || null,
      position: Number(position),
      is_active: isActive ? 1 : 0,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom de la catégorie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="slug-generé-automatiquement"
            />
            <p className="text-xs text-gray-400 mt-1">Laissez vide pour génération automatique</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie parente</label>
            <select
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Aucun (catégorie racine)</option>
              {categories
                .filter((c) => c.id !== initialData?.id) // éviter l'auto-référence
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Description (optionnelle)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="number"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
            />
            <p className="text-xs text-gray-400 mt-1">Ordre d'affichage (plus petit = en premier)</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              id="isActive"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (visible sur le site)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <span className="animate-spin">⏳</span>}
              {initialData ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}