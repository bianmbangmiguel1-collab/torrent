// components/admin/ProductTypeFields.tsx
'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import FileUploader from './FileUploader'

interface ProductTypeFieldsProps {
  type: string
  register: UseFormRegister<any>
  watch: UseFormWatch<any>
  setValue: UseFormSetValue<any>
}

export default function ProductTypeFields({ type, register, watch, setValue }: ProductTypeFieldsProps) {
  const renderFields = () => {
    switch (type) {
      // ============================================================
      // 1. FICHIER TÉLÉCHARGEABLE (✅ avec FileUploader)
      // ============================================================
      case 'file':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Fichier numérique
            </h3>
            <div className="space-y-4">
              {/* ✅ Utilisation du composant FileUploader avec les bonnes props */}
              <FileUploader
                currentFile={watch('file_path')}
                fileSize={watch('file_size')}
                fileFormat={watch('file_format')}
                onUpload={(fileInfo) => {
                  setValue('file_path', fileInfo.path)
                  setValue('file_size', fileInfo.size)
                  setValue('file_format', fileInfo.format)
                }}
                onRemove={() => {
                  setValue('file_path', null)
                  setValue('file_size', null)
                  setValue('file_format', null)
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limite de téléchargements</label>
                  <input
                    type="number"
                    {...register('download_limit', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0 = illimité"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration (jours)</label>
                  <input
                    type="number"
                    {...register('download_expires_days', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="30"
                  />
                </div>
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 2. LICENCE / CLÉ D'ACTIVATION
      // ============================================================
      case 'license':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Licence / Clé d'activation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validité (jours)</label>
                <input
                  type="number"
                  {...register('license_validity_days', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="365"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de licences par achat</label>
                <input
                  type="number"
                  {...register('license_quantity', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="1"
                />
              </div>
              <div className="text-sm text-gray-500">
                Les licences seront générées automatiquement après paiement
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 3. ABONNEMENT RÉCURRENT
      // ============================================================
      case 'subscription':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Abonnement récurrent
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intervalle</label>
                <select
                  {...register('subscription_interval')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Période d'essai (jours)</label>
                <input
                  type="number"
                  {...register('subscription_trial_days', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="0 = pas d'essai"
                />
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 4. ACCÈS GROUPE (WHATSAPP/TELEGRAM)
      // ============================================================
      case 'group_access':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Accès à un groupe (WhatsApp/Telegram)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lien du groupe</label>
                <input
                  {...register('group_link')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID du groupe</label>
                <input
                  {...register('group_id')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="ID unique du groupe"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('require_phone')}
                  id="require_phone"
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label htmlFor="require_phone" className="text-sm font-medium text-gray-700">
                  Exiger le numéro de téléphone pour rejoindre
                </label>
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 5. FORMATION EN LIGNE
      // ============================================================
      case 'course':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Formation en ligne
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de la formation</label>
                <input
                  type="number"
                  {...register('course_id', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="ID de la formation associée"
                />
              </div>
              <div className="text-sm text-gray-500">
                La gestion des modules se fait dans la section "Formations"
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 6. ÉVÉNEMENT / WEBINAIRE
      // ============================================================
      case 'event':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Événement / Webinaire
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de l'événement</label>
                <input
                  type="number"
                  {...register('event_id', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="ID de l'événement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'événement</label>
                <input
                  type="datetime-local"
                  {...register('event_date')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lien de l'événement</label>
                <input
                  {...register('event_link')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://zoom.us/..."
                />
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 7. CRÉDITS / MONNAIE VIRTUELLE
      // ============================================================
      case 'credits':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Crédits / Monnaie virtuelle
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de crédits</label>
                <input
                  type="number"
                  {...register('credits_amount', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="100"
                />
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 8. CONSULTATION / COACHING
      // ============================================================
      case 'consultation':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Consultation / Coaching
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  {...register('consultation_duration', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="30"
                />
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 9. PROGRAMME D'AFFILIATION
      // ============================================================
      case 'affiliate':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Programme d'affiliation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                <input
                  type="number"
                  {...register('affiliate_commission', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="10"
                />
              </div>
            </div>
          </section>
        )

      // ============================================================
      // 10. CONTENU GÉNÉRÉ PAR IA
      // ============================================================
      case 'ia_generation':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Contenu généré par IA
            </h3>
            <div className="text-sm text-gray-500">
              Après paiement, l'utilisateur remplira un formulaire pour générer son contenu (texte, image, code, etc.)
            </div>
          </section>
        )

      // ============================================================
      // 11. CERTIFICATION / BADGE
      // ============================================================
      case 'certificate':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Certification / Badge
            </h3>
            <div className="text-sm text-gray-500">
              Un certificat personnalisé sera généré après validation (PDF avec nom, date, logo)
            </div>
          </section>
        )

      // ============================================================
      // 12. DONNÉES / RAPPORT DE RECHERCHE
      // ============================================================
      case 'data':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Données / Rapport de recherche
            </h3>
            <div className="text-sm text-gray-500">
              L'acheteur pourra télécharger un fichier (CSV, Excel, PDF) ou accéder à une interface de visualisation
            </div>
          </section>
        )

      // ============================================================
      // 13. CONTENU PERSONNALISÉ
      // ============================================================
      case 'custom':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Contenu personnalisé
            </h3>
            <div className="text-sm text-gray-500">
              L'acheteur fournira des informations et le vendeur préparera le contenu sur mesure
            </div>
          </section>
        )

      // ============================================================
      // 14. QUESTIONNAIRE / DIAGNOSTIC
      // ============================================================
      case 'survey':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Questionnaire / Diagnostic
            </h3>
            <div className="text-sm text-gray-500">
              Après paiement, l'utilisateur remplira un questionnaire. Un rapport personnalisé sera généré
            </div>
          </section>
        )

      // ============================================================
      // 15. BIBLIOTHÈQUE DE CONTENUS (STREAMING)
      // ============================================================
      case 'streaming':
        return (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Bibliothèque de contenus (streaming)
            </h3>
            <div className="text-sm text-gray-500">
              L'acheteur aura accès à une bibliothèque de vidéos/musiques via un lecteur intégré
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return renderFields()
}