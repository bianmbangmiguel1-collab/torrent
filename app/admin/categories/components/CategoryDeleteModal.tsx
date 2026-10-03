'use client';

interface CategoryDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName: string;
  loading: boolean;
}

export default function CategoryDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  categoryName,
  loading,
}: CategoryDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmer la suppression</h3>
        <p className="text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer la catégorie <strong>{categoryName}</strong> ?
          Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <span className="animate-spin">⏳</span>}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}