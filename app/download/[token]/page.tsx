// app/download/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react';

interface DownloadErrorResponse {
  error?: string;
  message?: string;
}

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      initiateDownload();
    }
  }, [token]);

  const initiateDownload = async () => {
    try {
      const response = await fetch(`/api/download/${token}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Télécharger le fichier
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'produit';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setStatus('success');
        setMessage('✅ Téléchargement terminé !');
      } else {
        const data = (await response.json()) as DownloadErrorResponse;
        setStatus('error');
        setMessage(data.error || '❌ Erreur lors du téléchargement');
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      setStatus('error');
      setMessage('❌ Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Préparation du téléchargement...</h2>
            <p className="text-gray-500 mt-2">Veuillez patienter</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{message}</h2>
            <p className="text-gray-500 mt-2">Votre fichier a été téléchargé avec succès</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Retour à l'accueil
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Erreur</h2>
            <p className="text-gray-500 mt-2">{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
}