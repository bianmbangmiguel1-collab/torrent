// app/admin/campaigns/AnimationPanel.tsx
'use client';

import { useState } from 'react';
import type { Slide } from '@/lib/types';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface AnimationPanelProps {
  slide: Slide;
  onChange: (data: Partial<Slide>) => void;
}

export function AnimationPanel({ slide, onChange }: AnimationPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-gray-600" />
          <span className="font-medium text-sm">Animations</span>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="p-3 border-t space-y-3">
          {/* Entrée du slide */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Entrée du slide
            </label>
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

          {/* Animation du texte */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Animation du texte
            </label>
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

          {/* Transition entre slides */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Transition entre slides
            </label>
            <select
              value={slide.animation_transition || 'fade'}
              onChange={(e) => onChange({ animation_transition: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="cover">Cover</option>
              <option value="uncover">Uncover</option>
              <option value="none">Aucune</option>
            </select>
          </div>

          {/* Intervalle d'autoplay */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Intervalle (secondes)
            </label>
            <input
              type="number"
              value={slide.autoplay_interval || 5}
              onChange={(e) =>
                onChange({ autoplay_interval: parseInt(e.target.value) || 5 })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={1}
              max={20}
              step={1}
            />
          </div>

          {/* Pause au survol */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pause-on-hover"
              checked={!!slide.autoplay_pause_on_hover}
              onChange={(e) =>
                onChange({ autoplay_pause_on_hover: e.target.checked ? 1 : 0 })
              }
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="pause-on-hover" className="text-sm text-gray-700">
              Pause au survol
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnimationPanel;