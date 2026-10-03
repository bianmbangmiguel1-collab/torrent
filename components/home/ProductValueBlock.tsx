'use client';
import { Target, Clock, BookOpen, Gift, Sparkles, CheckCircle2, Lock, Unlock } from 'lucide-react';

const FEATURES = [
  { key: 'has_audio', label: 'Version audio', icon: '🎧' },
  { key: 'has_video', label: 'Vidéos incluses', icon: '🎥' },
  { key: 'has_summary', label: 'Résumé structuré', icon: '📝' },
  { key: 'has_exercises', label: 'Exercices pratiques', icon: '🧪' },
  { key: 'has_certificate', label: 'Certificat', icon: '🏆' },
  { key: 'has_updates', label: 'Mises à jour à vie', icon: '🔄' },
];

export default function ProductValueBlock({ value, readers }: { value: any; readers?: number }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 md:p-6 space-y-5">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-600" />
        Ce que vous obtenez réellement
      </h3>

      {/* Objectifs */}
      {value.learning_objectives?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
            <Target className="w-3.5 h-3.5 inline mr-1" /> Vous saurez
          </p>
          <ul className="space-y-1.5">
            {value.learning_objectives.map((o: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Méta */}
      <div className="flex flex-wrap gap-3 text-xs">
        {value.target_audience && (
          <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-gray-700">
            👥 {value.target_audience}
          </span>
        )}
        {value.difficulty_level && (
          <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-gray-700">
            📊 {value.difficulty_level}
          </span>
        )}
        {value.estimated_duration && (
          <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-gray-700">
            <Clock className="w-3 h-3 inline" /> {value.estimated_duration} min
          </span>
        )}
        {readers && readers > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-gray-700">
            ⭐ Déjà lu par {readers}+ personnes
          </span>
        )}
      </div>

      {/* Features matrix */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
          Inclus dans votre accès
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <div
              key={f.key}
              className={`flex items-center gap-2 text-sm ${
                value[f.key] ? 'text-gray-800' : 'text-gray-400 line-through'
              }`}
            >
              <span>{f.icon}</span>
              <span className="flex-1">{f.label}</span>
              {value[f.key] ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ressources bonus */}
      {value.included_resources?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
            <Gift className="w-3.5 h-3.5 inline mr-1" /> Ressources bonus
          </p>
          <div className="flex flex-wrap gap-2">
            {value.included_resources.map((r: string, i: number) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}