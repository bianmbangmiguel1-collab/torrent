'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleWithPermissions } from '@/lib/services/roles';
import RoleForm from './RoleForm';
import RoleDeleteModal from './RoleDeleteModal';
import { Pencil, Trash2, Users, Shield } from 'lucide-react';

interface ErrorResponse {
  error?: string;
  message?: string;
}

export default function RolesTable({ roles: initialRoles }: { roles: RoleWithPermissions[] }) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleWithPermissions | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpenForm = () => { setEditingRole(null); setIsFormOpen(true); };
    window.addEventListener('open-role-form', handleOpenForm);
    return () => window.removeEventListener('open-role-form', handleOpenForm);
  }, []);

  const handleEdit = (role: RoleWithPermissions) => { setEditingRole(role); setIsFormOpen(true); };
  const handleDelete = (role: RoleWithPermissions) => { setDeletingRole(role); setIsDeleteOpen(true); };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const url = editingRole ? `/api/admin/roles/${editingRole.id}` : '/api/admin/roles';
      const method = editingRole ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        router.refresh();
        setIsFormOpen(false);
        setEditingRole(null);
      } else {
        const err = (await res.json()) as ErrorResponse;
        alert(err.error || 'Erreur');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRole) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/roles/${deletingRole.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
        setIsDeleteOpen(false);
        setDeletingRole(null);
      } else {
        const err = (await res.json()) as ErrorResponse;
        alert(err.error || 'Erreur');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Rôle</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Utilisateurs</th>
              <th className="px-4 py-3 text-left font-medium">Permissions</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{role.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{role.name}</td>
                <td className="px-4 py-3 text-gray-500">{role.slug}</td>
                <td className="px-4 py-3 text-gray-500">{role.description || '-'}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-gray-600">
                    <Users className="w-4 h-4" /> {(role as any).users_count || 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {role.permissions.length} permissions
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(role)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Modifier">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(role)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun rôle trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <RoleForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingRole(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingRole || undefined}
        loading={loading}
      />
      <RoleDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setDeletingRole(null); }}
        onConfirm={handleConfirmDelete}
        roleName={deletingRole?.name || ''}
        loading={loading}
      />
    </div>
  );
}