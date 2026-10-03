// app/admin/layout.tsx
import type { Metadata } from 'next'

// ⚠️ Force TOUTES les pages admin à être dynamiques
// → évite les erreurs D1 au build (pré-rendu impossible sur D1 vide)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Administration | TorrentTwist',
  description: 'Espace d’administration de TorrentTwist',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="admin-panel min-h-screen bg-gray-50 font-sans antialiased">
      {/* 
        L’authentification est gérée par le middleware et les pages individuelles.
        Le cookie `admin_session` est automatiquement envoyé par le navigateur.
        Aucun token ou localStorage n’est nécessaire ici.
      */}
      {children}
    </div>
  )
}