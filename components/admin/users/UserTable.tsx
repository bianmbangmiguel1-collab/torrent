// components/admin/users/UserTable.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from '@/lib/services/users';
import UserForm from './UserForm';
import UserDeleteModal from './UserDeleteModal';
import {
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { getFlagEmoji } from '@/lib/geo';

interface UserTableProps {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
}

interface ApiErrorResponse {
  error?: string;
}

export default function UserTable({
  users,
  total,
  currentPage,
  totalPages,
}: UserTableProps) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpenForm = () => {
      setEditingUser(null);
      setIsFormOpen(true);
    };

    window.addEventListener('open-user-form', handleOpenForm);

    return () =>
      window.removeEventListener('open-user-form', handleOpenForm);
  }, []);

  const handleEdit = (user: User) => {
    console.log('✏️ Édition :', user);
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);

    try {
      if (!editingUser) {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        });

        if (!res.ok) {
          const err = (await res.json()) as ApiErrorResponse;

          alert(err.error || 'Erreur création');
          return;
        }

        router.refresh();
        setIsFormOpen(false);
        return;
      }

      const userId = Number(editingUser.id);

      if (isNaN(userId) || userId <= 0) {
        alert('ID invalide');
        return;
      }

      const url = `/api/admin/users?id=${userId}`;

      console.log('🔗 PUT URL :', url);

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiErrorResponse;

        alert(err.error || 'Erreur mise à jour');
        return;
      }

      router.refresh();
      setIsFormOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    setLoading(true);

    try {
      const userId = Number(deletingUser.id);

      if (isNaN(userId) || userId <= 0) {
        alert('ID invalide');
        return;
      }

      const url = `/api/admin/users?id=${userId}`;

      console.log('🗑️ DELETE URL :', url);

      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiErrorResponse;

        alert(err.error || 'Erreur suppression');
        return;
      }

      router.refresh();
      setIsDeleteOpen(false);
      setDeletingUser(null);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);

    params.set('page', String(page));

    router.push(`/admin/users?${params.toString()}`);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Utilisateur</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Rôle</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Inscrit le</th>
              <th className="px-4 py-3 text-left font-medium">
                Dernière activité
              </th>
              <th className="px-4 py-3 text-left font-medium">Contact</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 text-gray-600">
                    {user.id}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>

                      <div>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-medium text-gray-800 hover:text-blue-600 hover:underline transition"
                        >
                          {user.name}
                        </Link>

                        {user.country && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <span>{getFlagEmoji(user.country)}</span>{' '}
                            {user.country}
                            {user.city && ` • ${user.city}`}
                          </div>
                        )}

                        {!user.country && (
                          <div className="text-xs text-gray-400">
                            Pays non détecté
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {user.email}
                  </td>

                  <td className="px-4 py-3">
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-100 px-2 py-1 rounded-full text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                        <UserIcon className="w-3 h-3" />
                        User
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Inactif
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : '-'}
                  </td>

                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.last_activity
                      ? new Date(user.last_activity).toLocaleString()
                      : '-'}
                  </td>

                  <td className="px-4 py-3">
                    {user.phone ? (
                      <a
                        href={`https://wa.me/${user.phone.replace(
                          /[^0-9+]/g,
                          ''
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-lg transition"
                        title="Contacter via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">WhatsApp</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        Non disponible
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>

          <span className="text-sm text-gray-600">
            Page {currentPage} sur {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <UserForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingUser || undefined}
        loading={loading}
      />

      <UserDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingUser(null);
        }}
        onConfirm={handleConfirmDelete}
        userName={deletingUser?.name || ''}
        loading={loading}
      />
    </div>
  );
}