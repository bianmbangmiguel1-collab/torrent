// app/admin/products/import-export/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, LayoutDashboard } from 'lucide-react';

// ============================================================
// Types de réponses API
// ============================================================
interface ImportResponse {
  message?: string;
  error?: string;
}

export default function ImportExportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products/export', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = (await res.json()) as ImportResponse;
      if (!res.ok) throw new Error(data.error || 'Erreur import');
      setResult({ message: data.message || 'Import réussi', type: 'success' });
      setFile(null);
      router.refresh();
    } catch (error: any) {
      setResult({ message: error.message || 'Erreur lors de l\'import', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Import / Export</h1>
            <p className="text-gray-600 mt-1">Gestion massive des produits</p>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
          >
            <LayoutDashboard size={18} />
            Tableau de bord
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Export */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Exporter</h2>
                <p className="text-sm text-gray-500">Télécharger tous les produits en CSV</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Chargement...' : <><FileSpreadsheet size={18} /> Exporter en CSV</>}
            </button>
          </div>

          {/* Import */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Importer</h2>
                <p className="text-sm text-gray-500">Charger un fichier CSV pour ajouter/mettre à jour</p>
              </div>
            </div>

            <form onSubmit={handleImport} className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Fichier sélectionné : <span className="font-medium">{file.name}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Import en cours...' : <><Upload size={18} /> Importer</>}
              </button>
            </form>

            {result && (
              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {result.message}
              </div>
            )}
          </div>
        </div>

        {/* Mode d'emploi */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-2">📋 Format du fichier CSV</h3>
          <p className="text-sm text-gray-600 mb-2">Colonnes supportées :</p>
          <div className="text-xs font-mono bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-nowrap">
            id, title, slug, description, price, compare_price, stock, sku, barcode, status, type, category_id, brand, file_path, file_size, file_format, featured
          </div>
          <p className="text-sm text-gray-500 mt-3">
            ⚠️ Les colonnes <span className="font-mono">title</span> et <span className="font-mono">price</span> sont obligatoires.
            Le <span className="font-mono">slug</span> est généré automatiquement si absent.
          </p>
        </div>
      </div>
    </div>
  );
}