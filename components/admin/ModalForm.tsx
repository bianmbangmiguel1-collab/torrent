// components/admin/ModalForm.tsx
'use client';

import { useState, useEffect } from 'react';

export interface Field {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'number' | 'datetime-local' | 'checkbox' | 'file';
  options?: { value: any; label: string }[];
  required?: boolean;
  defaultValue?: any;
  accept?: string; // pour les fichiers (ex: 'image/*', 'video/*')
}

interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void> | void; // peut être FormData ou objet
  title: string;
  fields: Field[];
  initialData?: any;
  loading?: boolean;
}

export function ModalForm({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields,
  initialData,
  loading = false,
}: ModalFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [fileData, setFileData] = useState<{ [key: string]: File }>({});

  // Réinitialiser le formulaire à l'ouverture ou changement d'initialData
  useEffect(() => {
    if (initialData) {
      // Pour les champs de type 'file', on ne met pas le nom du fichier dans formData,
      // car on ne peut pas afficher le contenu d'un fichier. On garde un champ séparé.
      const initial: any = {};
      fields.forEach((f) => {
        if (f.type === 'file') {
          // On stocke l'ancien chemin ou nom pour l'affichage, mais on le met dans un champ spécial
          initial[f.name] = initialData[f.name] || '';
        } else {
          initial[f.name] = initialData[f.name] ?? f.defaultValue ?? '';
        }
      });
      setFormData(initial);
    } else {
      const defaultData: any = {};
      fields.forEach((f) => {
        defaultData[f.name] = f.defaultValue ?? '';
      });
      setFormData(defaultData);
    }
    setFileData({});
  }, [initialData, fields]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'file') {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        setFileData((prev) => ({ ...prev, [name]: file }));
        // On affiche le nom du fichier dans le champ textuel correspondant (optionnel)
        setFormData((prev: any) => ({ ...prev, [name]: file.name }));
      } else {
        // Si l'utilisateur annule la sélection, on retire le fichier
        setFileData((prev) => {
          const newFileData = { ...prev };
          delete newFileData[name];
          return newFileData;
        });
        setFormData((prev: any) => ({ ...prev, [name]: '' }));
      }
      return;
    }

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else if (type === 'number') {
      setFormData((prev: any) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (type === 'datetime-local') {
      setFormData((prev: any) => ({ ...prev, [name]: value || null }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier si on a des fichiers à uploader
    const hasFile = Object.keys(fileData).length > 0;

    if (hasFile) {
      const formDataObj = new FormData();

      // Ajouter tous les champs texte
      for (const key in formData) {
        // Ne pas ajouter les champs de type 'file' qui sont juste le nom du fichier,
        // car on va ajouter le fichier lui-même.
        const field = fields.find(f => f.name === key);
        if (field?.type === 'file') {
          // On ajoute le fichier depuis fileData
          if (fileData[key]) {
            formDataObj.append(key, fileData[key]);
          }
        } else {
          formDataObj.append(key, formData[key] ?? '');
        }
      }

      // Ajouter les fichiers qui n'ont pas été ajoutés (au cas où)
      for (const key in fileData) {
        if (!formDataObj.has(key)) {
          formDataObj.append(key, fileData[key]);
        }
      }

      await onSubmit(formDataObj);
    } else {
      // Pas de fichier, on envoie l'objet simple
      await onSubmit(formData);
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.name] ?? '';

    if (field.type === 'textarea') {
      return (
        <textarea
          name={field.name}
          value={value}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          required={field.required}
        />
      );
    }
    if (field.type === 'select') {
      return (
        <select
          name={field.name}
          value={value}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={field.required}
        >
          <option value="">Sélectionner</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          name={field.name}
          checked={!!value}
          onChange={handleChange}
          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      );
    }
    if (field.type === 'file') {
      return (
        <div>
          <input
            type="file"
            name={field.name}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            accept={field.accept || '*/*'}
          />
          {initialData?.[field.name] && !fileData[field.name] && (
            <div className="mt-1 text-sm text-gray-500">
              Fichier actuel : <a href={initialData[field.name]} target="_blank" className="text-blue-600 underline hover:text-blue-800">{initialData[field.name]}</a>
            </div>
          )}
          {fileData[field.name] && (
            <div className="mt-1 text-sm text-green-600">
              Nouveau fichier sélectionné : {fileData[field.name].name}
            </div>
          )}
        </div>
      );
    }
    if (field.type === 'datetime-local') {
      let val = value;
      if (val && typeof val === 'string' && !val.includes('T')) {
        val = val.replace(' ', 'T').slice(0, 16);
      } else if (val && typeof val === 'string') {
        val = val.slice(0, 16);
      }
      return (
        <input
          type="datetime-local"
          name={field.name}
          value={val || ''}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={field.required}
        />
      );
    }
    return (
      <input
        type={field.type || 'text'}
        name={field.name}
        value={value}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required={field.required}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            {fields.map((field) => (
              <div key={field.name} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
            <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}