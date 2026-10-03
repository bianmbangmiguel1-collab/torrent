// app/admin/campaigns/SchedulePanel.tsx
'use client';

import { useState } from 'react';
import type { Slide } from '@/lib/types';
import { Calendar, Clock, ChevronDown, ChevronUp, CalendarDays, Timer } from 'lucide-react';

interface SchedulePanelProps {
  slide: Slide;
  onChange: (data: Partial<Slide>) => void;
}

export function SchedulePanel({ slide, onChange }: SchedulePanelProps) {
  const [expanded, setExpanded] = useState(true);

  const handleDateChange = (field: string, value: string) => {
    // Convertir le format datetime-local en format ISO
    const date = value ? new Date(value).toISOString() : null;
    onChange({ [field]: date });
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-600" />
          <span className="font-medium text-sm">Programmation</span>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="p-3 border-t space-y-4">
          {/* Date de début */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Date de début
            </label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                value={slide.start_date ? new Date(slide.start_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
                className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date de fin */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Date de fin
            </label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                value={slide.end_date ? new Date(slide.end_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
                className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-t border-dashed border-gray-200"></div>

          {/* Fuseau horaire */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fuseau horaire
            </label>
            <div className="relative">
              <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={slide.timezone || 'Africa/Douala'}
                onChange={(e) => onChange({ timezone: e.target.value })}
                className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="Africa/Douala">Afrique/Douala (GMT+1)</option>
                <option value="Africa/Lagos">Afrique/Lagos (GMT+1)</option>
                <option value="Africa/Nairobi">Afrique/Nairobi (GMT+3)</option>
                <option value="Africa/Casablanca">Afrique/Casablanca (GMT+1)</option>
                <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">Amérique/New York (GMT-4)</option>
                <option value="America/Los_Angeles">Amérique/Los Angeles (GMT-7)</option>
                <option value="Asia/Dubai">Asie/Dubai (GMT+4)</option>
                <option value="Asia/Tokyo">Asie/Tokyo (GMT+9)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          {/* Indicateur de statut */}
          {slide.start_date && slide.end_date && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Durée</span>
                <span className="font-medium text-gray-800">
                  {new Date(slide.start_date).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(slide.end_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-gray-600">Statut</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Timer size={12} />
                  Programmée
                </span>
              </div>
            </div>
          )}

          {/* Message d'info */}
          <p className="text-xs text-gray-400 italic">
            La programmation du slide est gérée au niveau de la campagne. 
            Ces dates s'appliquent à l'ensemble de la campagne.
          </p>
        </div>
      )}
    </div>
  );
}

export default SchedulePanel;