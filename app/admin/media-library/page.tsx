// app/admin/media-library/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMediaLibrary, deleteMedia, uploadMedia } from '@/lib/admin-actions';
import { Plus, Search, Trash2, Upload, X, Image as ImageIcon, Video, Music, File } from 'lucide-react';

interface MediaItem {
  id: number;
  name: string;
  file_path: string;
  file_type: 'image' | 'video' | 'audio' | 'other';
  mime_type: string;
  size: number;
  dimensions?: string;
  alt?: string;
  created_at: string;
}

export default function MediaLibraryPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = async () => {
    try {
      const data = await getMediaLibrary();
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement médias:', err);
      setError('Impossible de charger les médias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadMedia(file);
      await fetchMedia();
      router.refresh();
    } catch (err) {
      console.error('Erreur upload:', err);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Supprimer le média "${name}" ?`)) return;
    try {
      await deleteMedia(id);
      await fetchMedia();
      router.refresh();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredMedia = media.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon size={20} className="text-blue-500" />;
      case 'video': return <Video size={20} className="text-red-500" />;
      case 'audio': return <Music size={20} className="text-purple-500" />;
      default: return <File size={20} className="text-gray-500" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la bibliothèque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bibliothèque média</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez tous vos médias (images, vidéos, audios)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition shadow-sm disabled:opacity-50">
            <Upload size={18} />
            {uploading ? 'Envoi...' : 'Importer'}
            <input
              type="file"
              onChange={handleUpload}
              className="hidden"
              accept="image/*,video/*,audio/*"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un média..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">🖼️</div>
          <h3 className="text-lg font-medium text-gray-800">
            {media.length === 0 ? 'Aucun média' : 'Aucun résultat'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {media.length === 0
              ? 'Importez votre premier média en cliquant sur "Importer"'
              : 'Essayez une autre recherche'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition group"
            >
              <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                {item.file_type === 'image' ? (
                  <img
                    src={item.file_path}
                    alt={item.alt || item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.png';
                    }}
                  />
                ) : item.file_type === 'video' ? (
                  <video
                    src={item.file_path}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    {getIcon(item.file_type)}
                    <span className="text-xs mt-1">{item.file_type}</span>
                  </div>
                )}
                <button
                  onClick={() => handleDelete(item.id, item.name)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{formatSize(item.size)}</span>
                  <span className="flex items-center gap-1">
                    {getIcon(item.file_type)}
                    {item.dimensions && <span>{item.dimensions}</span>}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}