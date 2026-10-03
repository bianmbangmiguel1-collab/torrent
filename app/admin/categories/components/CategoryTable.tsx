// app/admin/categories/components/CategoryTable.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import CategoryForm from './CategoryForm';
import CategoryDeleteModal from './CategoryDeleteModal';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  parent_name?: string;
  description: string | null;
  position: number;
  is_active: number;
  created_at: string;
  product_count: number;
  children_count: number;
}

interface CategoryTableProps {
  categories: Category[];
}

interface CategoriesResponse {
  categories: Category[];
  error?: string;
}

interface CategoryErrorResponse {
  error?: string;
}

export default function CategoryTable({ categories: initialCategories }: CategoryTableProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔄 Rafraîchir les données depuis l'API (mise à jour du state local)
  const refreshCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json() as CategoriesResponse;
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    }
  };

  // 📝 Ouvrir le formulaire d'édition
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  // 🗑️ Ouvrir le modal de suppression
  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
    setIsDeleteOpen(true);
  };

  // 💾 Soumettre le formulaire (création ou modification)
  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await refreshCategories();
        router.refresh();
        setIsFormOpen(false);
        setEditingCategory(null);
      } else {
        const err = await res.json() as CategoryErrorResponse;
        alert(err.error || 'Erreur lors de l’enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l’enregistrement');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirmer la suppression
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await refreshCategories();
        router.refresh();
        setIsDeleteOpen(false);
        setDeletingCategory(null);
      } else {
        const err = await res.json() as CategoryErrorResponse;
        alert(err.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  // 🔼🔽 Déplacer une catégorie (à implémenter)
  const moveCategory = async (id: number, direction: 'up' | 'down') => {
    alert('Fonctionnalité à implémenter : déplacement');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Catégories</h2>
          <p className="text-sm text-gray-500">{categories.length} catégorie(s)</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Catégorie
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Produits
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Sous-catégories
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Statut
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50 transition">
                {/* Catégorie */}
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{category.name}</p>
                    {category.parent_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Parent : {category.parent_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">/{category.slug}</p>
                  </div>
                </td>

                {/* Produits */}
                <td className="px-6 py-4">
                  <span className="font-semibold text-gray-900">
                    {category.product_count}
                  </span>
                </td>

                {/* Sous-catégories */}
                <td className="px-6 py-4">
                  <span className="font-semibold text-gray-900">
                    {category.children_count}
                  </span>
                </td>

                {/* Statut */}
                <td className="px-6 py-4">
                  {category.is_active ? (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/categories/${category.id}`}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                    >
                      Voir
                    </Link>
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Aucune catégorie */}
      {categories.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-gray-500">Aucune catégorie n'a encore été créée.</p>
          <button
            onClick={() => {
              setEditingCategory(null);
              setIsFormOpen(true);
            }}
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Créer la première catégorie
          </button>
        </div>
      )}

      {/* Formulaire d'ajout/modification */}
      <CategoryForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingCategory || undefined}
        categories={categories}
        loading={loading}
      />

      {/* Modal de confirmation de suppression */}
      <CategoryDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingCategory(null);
        }}
        onConfirm={handleConfirmDelete}
        categoryName={deletingCategory?.name || ''}
        loading={loading}
      />
    </div>
  );
}