'use client';

import { useEffect } from 'react';

export default function DebugAuth() {
  useEffect(() => {
    console.log('🔍 Vérification auth:');
    const token = localStorage.getItem('token');
    console.log('Token dans localStorage:', token);
    
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('Payload du token:', payload);
        }
      } catch (e) {
        console.error('Erreur décodage token:', e);
      }
    }
  }, []);

  return null;
}