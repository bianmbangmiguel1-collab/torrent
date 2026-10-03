// components/AppHeaderWrapper.tsx
'use client'

import AppHeader from './AppHeader'

/**
 * Wrapper pour AppHeader qui utilise le contexte UserContext.
 * Ce composant sert à afficher le header dans les pages Server Components
 * (ex: app/avant/page.tsx) sans avoir à passer de props.
 *
 * Le composant AppHeader utilise lui-même `useUser()` pour récupérer
 * l'utilisateur et gérer la déconnexion.
 */
export default function AppHeaderWrapper() {
  return <AppHeader />
}