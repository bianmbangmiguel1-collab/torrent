// app/admin/campaigns/TargetingPanel.tsx
'use client';

import { useState } from 'react';
import type { Campaign } from '@/lib/types';
import { Target, ChevronDown, ChevronUp, Users, Monitor, Globe, Languages } from 'lucide-react';

interface TargetingPanelProps {
  campaign: Campaign;
  onChange: (campaign: Campaign | ((previous: Campaign) => Campaign)) => void;
}

const audienceOptions = [
  { value: 'all', label: 'Tous les utilisateurs' },
  { value: 'new', label: 'Nouveaux visiteurs' },
  { value: 'returning', label: 'Clients existants' },
  { value: 'purchased', label: 'Utilisateurs ayant acheté' },
  { value: 'interested', label: 'Utilisateurs intéressés' },
];

const deviceOptions = ['desktop', 'tablet', 'mobile'];

const countryOptions = [
  'Tous', 'Cameroun', 'Côte d\'Ivoire', 'Sénégal', 'Gabon', 'France', 'Belgique', 'Suisse', 'Canada'
];

const languageOptions = ['Toutes', 'Français', 'English', 'Español', 'Português'];

export function TargetingPanel({ campaign, onChange }: TargetingPanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Parse les devices depuis le JSON
  const getDevices = (): string[] => {
    if (!campaign.devices) return ['desktop', 'tablet', 'mobile'];
    try {
      return JSON.parse(campaign.devices);
    } catch {
      return ['desktop', 'tablet', 'mobile'];
    }
  };

  const handleDeviceToggle = (device: string) => {
    const current = getDevices();
    const updated = current.includes(device)
      ? current.filter(d => d !== device)
      : [...current, device];
    onChange({
      ...campaign,
      devices: JSON.stringify(updated),
    });
  };

  const handleAudienceChange = (value: string) => {
    onChange({ ...campaign, target_audience: value });
  };

  const handleCountryChange = (value: string) => {
    // Pour l'instant, on stocke en JSON
    const countries = value === 'Tous' ? null : JSON.stringify([value]);
    onChange({ ...campaign, countries });
  };

  const handleLanguageChange = (value: string) => {
    const languages = value === 'Toutes' ? null : JSON.stringify([value]);
    onChange({ ...campaign, languages });
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Target size={18} className="text-gray-600" />
          <span className="font-medium text-sm">Ciblage</span>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="p-3 border-t space-y-4">
          {/* Audience */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Users size={14} className="inline mr-1" />
              Audience cible
            </label>
            <select
              value={campaign.target_audience || 'all'}
              onChange={(e) => handleAudienceChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {audienceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Appareils */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Monitor size={14} className="inline mr-1" />
              Appareils
            </label>
            <div className="flex flex-wrap gap-2">
              {deviceOptions.map((device) => {
                const isChecked = getDevices().includes(device);
                return (
                  <label
                    key={device}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleDeviceToggle(device)}
                      className="sr-only"
                    />
                    <span className="capitalize">{device}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Pays */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Globe size={14} className="inline mr-1" />
              Pays
            </label>
            <select
              value={
                campaign.countries
                  ? (() => { try { return JSON.parse(campaign.countries)[0]; } catch { return 'Tous'; } })()
                  : 'Tous'
              }
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Langues */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Languages size={14} className="inline mr-1" />
              Langues
            </label>
            <select
              value={
                campaign.languages
                  ? (() => { try { return JSON.parse(campaign.languages)[0]; } catch { return 'Toutes'; } })()
                  : 'Toutes'
              }
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languageOptions.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Note de bas de page */}
          <p className="text-xs text-gray-400 italic">
            Le ciblage s'applique à l'ensemble de la campagne. 
            Chaque slide hérite de ces paramètres.
          </p>
        </div>
      )}
    </div>
  );
}

export default TargetingPanel;