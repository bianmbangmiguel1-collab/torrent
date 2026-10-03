// app/admin/campaigns/SlideEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Slide } from '@/lib/types';
import {
  Image as ImageIcon,
  Video,
  Music,
  Type,
  ShoppingBag,
  Gift,
  ChevronDown,
  ChevronUp,
  Upload,
  FolderOpen,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Zap,
  Gem,
  Flame,
  Rainbow,
  Monitor,
} from 'lucide-react';

interface SlideEditorProps {
  slide: Slide;
  onChange: (data: Partial<Slide>) => void;
}

interface MediaItem {
  id: number;
  name: string;
  file_path: string;
  file_type: 'image' | 'video' | 'audio';
}

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

interface MediaResponse {
  media?: MediaItem[];
  error?: string;
}

// ----- Composant MediaLibrary (modale) -----
function MediaLibrary({
  isOpen,
  onClose,
  onSelect,
}: MediaLibraryProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/media');
      if (res.ok) {
        const data = await res.json() as MediaItem[];
        setMedia(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadMedia();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = media.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Bibliothèque média</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            <Upload size={16} /> Importer
            <input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/media', { method: 'POST', body: formData });
                if (res.ok) {
                  loadMedia();
                }
              }}
              className="hidden"
              accept="image/*,video/*"
            />
          </label>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-4">
          {loading ? (
            <p className="col-span-4 text-center">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="col-span-4 text-center text-gray-400">Aucun média</p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition"
                onClick={() => {
                  onSelect(item.file_path);
                  onClose();
                }}
              >
                {item.file_type === 'image' ? (
                  <img src={item.file_path} alt={item.name} className="w-full h-32 object-cover" />
                ) : item.file_type === 'video' ? (
                  <video src={item.file_path} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">🎵</span>
                  </div>
                )}
                <p className="text-xs p-2 truncate">{item.name}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ----- Composant principal SlideEditor -----
export function SlideEditor({ slide, onChange }: SlideEditorProps) {
  const [openSections, setOpenSections] = useState({
    content: true,
    cta: true,
    media: true,
    video: true,
    audio: true,
    design: true,
    animation: true,
    destination: true,
  });

  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Upload d'un fichier
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json() as { path: string };
        onChange({ media_url: data.path });
      } else {
        alert("Erreur lors de l'upload");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau");
    }
  };

  // Options de type de contenu
  const typeOptions: Array<{ value: Slide['type']; label: string; icon: any }> = [
    { value: 'image', label: 'Image', icon: ImageIcon },
    { value: 'video', label: 'Vidéo', icon: Video },
    { value: 'audio', label: 'Audio', icon: Music },
    { value: 'text', label: 'Texte', icon: Type },
    { value: 'product', label: 'Produit', icon: ShoppingBag },
    { value: 'promotion', label: 'Promotion', icon: Gift },
  ];

  // Presets de design
  const STYLE_PRESETS = [
    { name: 'Élégant', icon: Sparkles, text_color: '#ffffff', button_color: '#8b5cf6', background_color: '#000000', overlay_opacity: 60 },
    { name: 'Promotion', icon: Flame, text_color: '#ffffff', button_color: '#ef4444', background_color: '#dc2626', overlay_opacity: 70 },
    { name: 'Premium', icon: Gem, text_color: '#ffffff', button_color: '#f59e0b', background_color: '#000000', overlay_opacity: 75 },
    { name: 'Créatif', icon: Rainbow, text_color: '#1a1a2e', button_color: '#2563eb', background_color: '#ffffff', overlay_opacity: 50 },
    { name: 'Tech', icon: Zap, text_color: '#ffffff', button_color: '#06b6d4', background_color: '#0f172a', overlay_opacity: 80 },
    { name: 'Minimal', icon: Monitor, text_color: '#ffffff', button_color: '#ffffff', background_color: '#000000', overlay_opacity: 40 },
  ];

  return (
    <div className="space-y-4">
      {/* ===== SECTION CONTENU ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('content')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">📝 Contenu</span>
          {openSections.content ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.content && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type de contenu</label>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = slide.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onChange({ type: opt.value })}
                      className={`flex items-center justify-center gap-1.5 px-2 py-2 border rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Titre</label>
              <input
                type="text"
                value={slide.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Titre de votre slide"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sous-titre</label>
              <input
                type="text"
                value={slide.subtitle || ''}
                onChange={(e) => onChange({ subtitle: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sous-titre"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                value={slide.description || ''}
                onChange={(e) => onChange({ description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Description détaillée"
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION CTA ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('cta')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">🔘 Bouton CTA</span>
          {openSections.cta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.cta && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Texte du bouton</label>
              <input
                type="text"
                value={slide.cta_text || ''}
                onChange={(e) => onChange({ cta_text: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Découvrir, Acheter..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
              <select
                value={slide.cta_action || ''}
                onChange={(e) => onChange({ cta_action: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sélectionner --</option>
                <option value="product">Voir un produit</option>
                <option value="category">Voir une catégorie</option>
                <option value="collection">Voir une collection</option>
                <option value="promotion">Voir une promotion</option>
                <option value="page">Page interne</option>
                <option value="url">URL externe</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valeur (ID, slug ou URL)</label>
              <input
                type="text"
                value={slide.cta_value || ''}
                onChange={(e) => onChange({ cta_value: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 123, /produits, https://..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION MÉDIA ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('media')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">🖼️ Média</span>
          {openSections.media ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.media && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Importer depuis votre PC</label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition">
                  <Upload size={16} />
                  <span className="text-sm">Choisir un fichier</span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    accept="image/*,video/*"
                  />
                </label>
                <button
                  onClick={() => setMediaLibraryOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  <FolderOpen size={16} />
                  <span className="text-sm">Bibliothèque</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Formats : JPG, PNG, GIF, WebP, MP4, MOV</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">URL du média</label>
              <input
                type="text"
                value={slide.media_url || ''}
                onChange={(e) => onChange({ media_url: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://exemple.com/image.jpg"
              />
            </div>

            {slide.media_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Aperçu</p>
                <div className="border rounded-lg overflow-hidden bg-gray-50 p-2 relative">
                  {slide.type === 'video' ? (
                    <video src={slide.media_url} className="max-h-32 w-auto mx-auto" controls />
                  ) : (
                    <img
                      src={slide.media_url}
                      alt={slide.title || 'Aperçu'}
                      className="max-h-32 w-auto object-contain mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                      }}
                    />
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Supprimer ce média ?')) {
                        onChange({ media_url: '', media_desktop: '', media_tablet: '', media_mobile: '' });
                      }
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-md"
                    title="Supprimer le média"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Versions responsive</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400">Desktop</label>
                  <input
                    type="text"
                    value={slide.media_desktop || ''}
                    onChange={(e) => onChange({ media_desktop: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="URL"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400">Tablet</label>
                  <input
                    type="text"
                    value={slide.media_tablet || ''}
                    onChange={(e) => onChange({ media_tablet: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="URL"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400">Mobile</label>
                  <input
                    type="text"
                    value={slide.media_mobile || ''}
                    onChange={(e) => onChange({ media_mobile: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="URL"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION VIDÉO ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('video')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">🎥 Vidéo</span>
          {openSections.video ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.video && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
              <select
                value={slide.video_source || ''}
                onChange={(e) => onChange({ video_source: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sélectionner --</option>
                <option value="upload">Télécharger une vidéo</option>
                <option value="youtube">YouTube</option>
                <option value="url">URL vidéo</option>
                <option value="library">Bibliothèque média</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!slide.video_autoplay}
                  onChange={(e) => onChange({ video_autoplay: e.target.checked ? 1 : 0 })}
                />
                Autoplay
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!slide.video_muted}
                  onChange={(e) => onChange({ video_muted: e.target.checked ? 1 : 0 })}
                />
                Muet
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!slide.video_loop}
                  onChange={(e) => onChange({ video_loop: e.target.checked ? 1 : 0 })}
                />
                Loop
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!slide.video_controls}
                  onChange={(e) => onChange({ video_controls: e.target.checked ? 1 : 0 })}
                />
                Contrôles
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Durée max (secondes)</label>
              <input
                type="number"
                value={slide.video_max_duration || 15}
                onChange={(e) => onChange({ video_max_duration: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Image de fallback</label>
              <input
                type="text"
                value={slide.video_fallback_image || ''}
                onChange={(e) => onChange({ video_fallback_image: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="URL de l'image de remplacement"
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION AUDIO ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('audio')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">🎵 Audio</span>
          {openSections.audio ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.audio && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">URL audio</label>
              <input
                type="text"
                value={slide.audio_url || ''}
                onChange={(e) => onChange({ audio_url: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://exemple.com/audio.mp3"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!slide.audio_autoplay}
                  onChange={(e) => onChange({ audio_autoplay: e.target.checked ? 1 : 0 })}
                />
                Autoplay
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!slide.audio_controls}
                  onChange={(e) => onChange({ audio_controls: e.target.checked ? 1 : 0 })}
                />
                Contrôles
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION DESIGN ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('design')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">🎨 Design</span>
          {openSections.design ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.design && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Presets de style</label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        onChange({
                          text_color: preset.text_color,
                          button_color: preset.button_color,
                          background_color: preset.background_color,
                          overlay_opacity: preset.overlay_opacity,
                        });
                      }}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
                    >
                      <Icon size={14} className="text-gray-600" />
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Position du contenu</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => onChange({ content_position: pos })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition ${
                      slide.content_position === pos
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pos === 'left' && <AlignLeft size={14} />}
                    {pos === 'center' && <AlignCenter size={14} />}
                    {pos === 'right' && <AlignRight size={14} />}
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Alignement du contenu</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => onChange({ content_alignment: pos })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition ${
                      slide.content_alignment === pos
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pos === 'left' && <AlignLeft size={14} />}
                    {pos === 'center' && <AlignCenter size={14} />}
                    {pos === 'right' && <AlignRight size={14} />}
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Opacité overlay : {slide.overlay_opacity || 65}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={slide.overlay_opacity || 65}
                onChange={(e) => onChange({ overlay_opacity: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Texte</label>
                <input
                  type="color"
                  value={slide.text_color || '#ffffff'}
                  onChange={(e) => onChange({ text_color: e.target.value })}
                  className="w-full h-9 border rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bouton</label>
                <input
                  type="color"
                  value={slide.button_color || '#2563eb'}
                  onChange={(e) => onChange({ button_color: e.target.value })}
                  className="w-full h-9 border rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Overlay</label>
                <input
                  type="color"
                  value={slide.background_color || '#000000'}
                  onChange={(e) => onChange({ background_color: e.target.value })}
                  className="w-full h-9 border rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION ANIMATION ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('animation')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">✨ Animations</span>
          {openSections.animation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.animation && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Entrée</label>
              <select
                value={slide.animation_entrance || 'fade'}
                onChange={(e) => onChange({ animation_entrance: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
                <option value="parallax">Parallax</option>
                <option value="none">Aucune</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Animation du texte</label>
              <select
                value={slide.animation_text || 'fade-up'}
                onChange={(e) => onChange({ animation_text: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fade-up">Fade Up</option>
                <option value="fade-in">Fade In</option>
                <option value="slide-in">Slide In</option>
                <option value="none">Aucune</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Transition</label>
              <select
                value={slide.animation_transition || 'fade'}
                onChange={(e) => onChange({ animation_transition: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="cover">Cover</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Intervalle (secondes)</label>
              <input
                type="number"
                value={slide.autoplay_interval || 5}
                onChange={(e) => onChange({ autoplay_interval: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="20"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!slide.autoplay_pause_on_hover}
                onChange={(e) => onChange({ autoplay_pause_on_hover: e.target.checked ? 1 : 0 })}
              />
              Pause au survol
            </label>
          </div>
        )}
      </div>

      {/* ===== SECTION DESTINATION ===== */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('destination')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
        >
          <span className="font-medium text-sm">📍 Destination</span>
          {openSections.destination ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSections.destination && (
          <div className="p-3 border-t space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type de destination</label>
              <select
                value={slide.destination_type || ''}
                onChange={(e) => onChange({ destination_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sélectionner --</option>
                <option value="product">Produit</option>
                <option value="category">Catégorie</option>
                <option value="collection">Collection</option>
                <option value="promotion">Promotion</option>
                <option value="page">Page interne</option>
                <option value="url">URL externe</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ID / Slug / URL</label>
              <input
                type="text"
                value={slide.destination_value || ''}
                onChange={(e) => onChange({ destination_value: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 123, /produits, https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Promotion associée</label>
              <input
                type="number"
                value={slide.promotion_id || ''}
                onChange={(e) => onChange({ promotion_id: parseInt(e.target.value) || undefined })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID de la promotion"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Collection</label>
              <input
                type="number"
                value={slide.collection_id || ''}
                onChange={(e) => onChange({ collection_id: parseInt(e.target.value) || undefined })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID de la collection"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie</label>
              <input
                type="number"
                value={slide.category_id || ''}
                onChange={(e) => onChange({ category_id: parseInt(e.target.value) || undefined })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID de la catégorie"
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALE BIBLIOTHÈQUE MÉDIA ===== */}
      <MediaLibrary
        isOpen={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={(path: string) => {
          onChange({ media_url: path });
        }}
      />
    </div>
  );
}

export default SlideEditor;