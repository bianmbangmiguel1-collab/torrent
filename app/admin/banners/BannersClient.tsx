'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/admin/DataTable';
import { ModalForm } from '@/components/admin/ModalForm';
import type { Field } from '@/components/admin/ModalForm';
import { createBanner, updateBanner, deleteBanner } from '@/lib/admin-actions';
import { Plus } from 'lucide-react';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Titre' },
  { key: 'media_type', label: 'Type' },
  {
    key: 'media_url',
    label: 'Aperçu',
    render: (url: string, row: any) => {
      if (row.media_type === 'image' && url) {
        return <img src={url} alt={row.title} className="w-12 h-12 object-cover rounded" />;
      }
      if (row.media_type === 'video' && url) {
        return <video src={url} className="w-12 h-12 object-cover rounded" muted />;
      }
      return url ? <span className="text-xs text-gray-500 truncate max-w-[100px] block">{url}</span> : '—';
    },
  },
  {
    key: 'is_active',
    label: 'Actif',
    render: (val: number) => (
      <span className={`px-2 py-1 rounded-full text-xs ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {val ? 'Oui' : 'Non'}
      </span>
    ),
  },
  { key: 'position', label: 'Position' },
  {
    key: 'starts_at',
    label: 'Début',
    render: (val: string) => (val ? new Date(val).toLocaleDateString('fr-FR') : '—'),
  },
  {
    key: 'ends_at',
    label: 'Fin',
    render: (val: string) => (val ? new Date(val).toLocaleDateString('fr-FR') : '—'),
  },
];

const fields: Field[] = [
  { name: 'title', label: 'Titre', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  {
    name: 'media_type',
    label: 'Type de média',
    type: 'select',
    options: [
      { value: 'image', label: 'Image' },
      { value: 'video', label: 'Vidéo' },
    ],
    required: true,
    defaultValue: 'image',
  },
  { name: 'media_file', label: 'Fichier (image ou vidéo)', type: 'file', accept: 'image/*,video/*', required: true },
  { name: 'video_url', label: 'URL vidéo (si vous préférez un lien externe)' },
  { name: 'link_url', label: 'Lien (URL de redirection)' },
  { name: 'position', label: 'Position (ordre d\'affichage)', type: 'number', defaultValue: 0 },
  { name: 'is_active', label: 'Actif', type: 'checkbox', defaultValue: '1' },
  { name: 'starts_at', label: 'Date de début', type: 'datetime-local' },
  { name: 'ends_at', label: 'Date de fin', type: 'datetime-local' },
];

interface Banner {
  id: number;
  title?: string;
  description?: string | null;
  media_type?: string;
  media_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  position?: number;
  is_active?: number;
  starts_at?: string | null;
  ends_at?: string | null;
}

export function BannersClient({ initialBanners }: { initialBanners: any[] }) {
  const router = useRouter();
  const [banners, setBanners] = useState(initialBanners);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette bannière ?')) return;
    setLoading(true);
    try {
      await deleteBanner(id);
      setBanners(banners.filter((b) => b.id !== id));
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      if (editingItem) {
        await updateBanner(editingItem.id, data);
        // Recharger la liste depuis le serveur
        const res = await fetch('/api/admin/banners');
        if (res.ok) {
          const newBanners = await res.json() as Banner[];
          setBanners(newBanners);
        } else {
          window.location.reload();
        }
      } else {
        await createBanner(data);
        const res = await fetch('/api/admin/banners');
        if (res.ok) {
          const newBanners = await res.json() as Banner[];
          setBanners(newBanners);
        } else {
          window.location.reload();
        }
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des bannières</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Ajouter une bannière
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
          {error}
        </div>
      )}

      <DataTable columns={columns} data={banners} onEdit={handleEdit} onDelete={handleDelete} />

      <ModalForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingItem ? 'Modifier la bannière' : 'Ajouter une bannière'}
        fields={fields}
        initialData={editingItem}
        loading={loading}
      />
    </div>
  );
}