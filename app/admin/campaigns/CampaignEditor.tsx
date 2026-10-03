'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign, updateCampaign, getCampaign, createSlide, updateSlide, deleteSlide, reorderSlides } from '@/lib/admin-actions';
import { Campaign, Slide } from '@/lib/types';
import SlideList from './SlideList';
import { SlideEditor } from './SlideEditor';
import BannerPreview from './BannerPreview';
import AnimationPanel from './AnimationPanel';
import SchedulePanel from './SchedulePanel';
import TargetingPanel from './TargetingPanel';
import { ArrowLeft, Save, Send, X } from 'lucide-react';

interface CampaignEditorProps {
  campaignId?: number;
  isNew?: boolean;
}

export default function CampaignEditor({ campaignId, isNew = false }: CampaignEditorProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign>({ name: '', status: 'draft', type: 'carousel' });
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await getCampaign(campaignId as number);
          if (data) {
            setCampaign(data);
            if (data.slides) setSlides(data.slides as Slide[]);
          }
        } catch (e) {
          console.error(e);
          setError('Impossible de charger la campagne.');
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [campaignId]);

  const addSlide = async () => {
    const newSlide: Slide = {
      id: -Date.now(),
      campaign_id: campaignId,
      position: slides.length,
      type: 'image',
      title: '',
      media_type: 'image',
      media_url: ''
    };

    if (campaignId) {
      try {
        const id = await createSlide({ ...newSlide, campaign_id: campaignId });
        newSlide.id = id;
        setSlides((s) => [...s, newSlide]);
        setSelectedSlideIndex(slides.length);
      } catch (e) {
        console.error(e);
        setError('Impossible d\'ajouter le slide.');
      }
    } else {
      setSlides((s) => [...s, newSlide]);
      setSelectedSlideIndex(slides.length);
    }
  };

  const updateSlideData = async (index: number, data: Partial<Slide>) => {
    const updated = [...slides];
    const slide = updated[index];
    const newSlide = { ...slide, ...data };
    updated[index] = newSlide;
    setSlides(updated);

    if (newSlide.id && typeof newSlide.id === 'number' && newSlide.id > 0) {
      try {
        await updateSlide(newSlide.id, newSlide);
      } catch (e) {
        console.error(e);
        setError('Impossible de mettre à jour le slide.');
      }
    }
  };

  const removeSlide = async (index: number) => {
    const slide = slides[index];
    if (slide.id && typeof slide.id === 'number' && slide.id > 0) {
      try {
        await deleteSlide(slide.id as number);
      } catch (e) {
        console.error(e);
        setError('Impossible de supprimer le slide.');
        return;
      }
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (campaignId) {
      try {
        await reorderSlides(campaignId, newSlides.map(s => (typeof s.id === 'number' ? s.id : 0)));
      } catch (e) {
        console.error(e);
        setError('Impossible de réorganiser les slides.');
      }
    }
    setSelectedSlideIndex(null);
  };

  const handleReorder = async (newSlides: Slide[]) => {
    setSlides(newSlides);
    if (campaignId) {
      try {
        await reorderSlides(campaignId, newSlides.map(s => (typeof s.id === 'number' ? s.id : 0)));
      } catch (e) {
        console.error(e);
        setError('Impossible de réorganiser les slides.');
      }
    }
  };

  const saveCampaign = async (publish: boolean = false) => {
    setSaving(true);
    setError(null);
    try {
      let id = campaignId;
      if (!id) {
        const newId = await createCampaign(campaign);
        id = newId;
        setCampaign({ ...campaign, id: newId });
        campaignId = newId;
      } else {
        await updateCampaign(id, campaign);
      }

      const finalId = id as number;
      for (const slide of slides) {
        if (!slide.id || (typeof slide.id === 'number' && slide.id < 0)) {
          const newSlideId = await createSlide({ ...slide, campaign_id: finalId });
          slide.id = newSlideId;
        } else if (typeof slide.id === 'number') {
          await updateSlide(slide.id, slide);
        }
      }

      if (publish) {
        await updateCampaign(finalId, { ...campaign, status: 'active' });
      }

      router.refresh();
      router.push('/admin/campaigns');
    } catch (e) {
      console.error(e);
      setError('Impossible de sauvegarder la campagne.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de la campagne...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/campaigns')} className="p-2 hover:bg-gray-100 rounded-full transition" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">{isNew ? 'Nouvelle campagne' : 'Modifier la campagne'}</h1>
          {campaign.name && <span className="text-gray-500 text-sm">— {campaign.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-600 text-sm">{error}</span>}
          <button onClick={() => saveCampaign(false)} disabled={saving} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
            <Save size={18} /> Enregistrer
          </button>
          <button onClick={() => saveCampaign(true)} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            <Send size={18} /> Publier
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-1/3 min-h-0 border-r bg-white overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom de la campagne</label>
              <input type="text" value={campaign.name || ''} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Promotion été" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type de campagne</label>
              <select value={campaign.type || 'carousel'} onChange={(e) => setCampaign({ ...campaign, type: e.target.value as any })} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="image">Image</option>
                <option value="video">Vidéo</option>
                <option value="audio">Audio</option>
                <option value="carousel">Carousel</option>
                <option value="story">Story</option>
                <option value="collection">Collection</option>
                <option value="product">Produit</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>

            {campaign.type === 'carousel' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Slides</h3>
                  <button onClick={addSlide} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Ajouter un slide</button>
                </div>
                <SlideList slides={slides} selectedIndex={selectedSlideIndex} onSelect={setSelectedSlideIndex} onReorder={handleReorder} onDelete={removeSlide} />
              </div>
            )}

            {selectedSlideIndex !== null && slides[selectedSlideIndex] && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Modifier le slide {selectedSlideIndex + 1}</h4>
                  <button onClick={() => setSelectedSlideIndex(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <SlideEditor key={String(slides[selectedSlideIndex].id || selectedSlideIndex)} slide={slides[selectedSlideIndex]} onChange={(data) => updateSlideData(selectedSlideIndex, data)} />
                <div className="mt-4 space-y-4">
                  <AnimationPanel slide={slides[selectedSlideIndex]} onChange={(data) => updateSlideData(selectedSlideIndex, data)} />
                  <SchedulePanel slide={slides[selectedSlideIndex]} onChange={(data) => updateSlideData(selectedSlideIndex, data)} />
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <TargetingPanel
                campaign={campaign}
                onChange={(next) => setCampaign((previous) => typeof next === 'function' ? next(previous) : next)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 min-h-0 overflow-hidden p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Aperçu en temps réel</h2>
            <div className="flex gap-2">
              <button onClick={() => setPreviewDevice('desktop')} className={`px-3 py-1 rounded-lg text-sm ${previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Desktop</button>
              <button onClick={() => setPreviewDevice('tablet')} className={`px-3 py-1 rounded-lg text-sm ${previewDevice === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Tablet</button>
              <button onClick={() => setPreviewDevice('mobile')} className={`px-3 py-1 rounded-lg text-sm ${previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Mobile</button>
            </div>
          </div>
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <BannerPreview slides={slides} currentIndex={selectedSlideIndex !== null ? selectedSlideIndex : 0} device={previewDevice} />
          </div>
        </div>

        <div className="w-1/4 min-h-0 border-l bg-white p-4 overflow-hidden">
          <h3 className="font-medium mb-4">Statistiques</h3>
          <p className="text-sm text-gray-500">Impressions, clics, conversions...</p>
        </div>
      </div>

      <footer className="bg-white border-t px-6 py-3 text-center text-xs text-gray-500 flex-shrink-0">© {new Date().getFullYear()} TorrentTwist - Studio de campagnes v1.0</footer>
    </div>
  );
}
