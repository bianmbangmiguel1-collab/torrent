// components/admin/security/SecurityUsersTable.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Clock,
  UserX,
  UserCheck,
  Shield,
  Loader2,
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: number;
  banned: number;
  banned_reason: string | null;
  banned_at: string | null;
  suspended: number;
  suspended_until: string | null;
  suspension_reason: string | null;
  created_at: string;
  banned_by_name: string | null;
  suspended_by_name: string | null;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export default function SecurityUsersTable({ users }: { users: User[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'suspend' | 'unban' | 'unsuspend' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(7);

  const handleAction = async (
    userId: number,
    action: 'ban' | 'unban' | 'suspend' | 'unsuspend',
    reason?: string,
    durationDays?: number
  ) => {
    setLoading(userId);
    try {
      const res = await fetch('/api/admin/security/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          action,
          reason,
          duration: durationDays,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiErrorResponse;
        alert(err.error || 'Erreur');
        return;
      }

      router.refresh();
      setSelectedUser(null);
      setReason('');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setLoading(null);
      setActionType(null);
    }
  };

  const openModal = (user: User, action: 'ban' | 'suspend' | 'unban' | 'unsuspend') => {
    setSelectedUser(user);
    setActionType(action);
    setReason('');
    setDuration(7);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActionType(null);
    setReason('');
  };

  const getStatusBadge = (user: User) => {
    if (user.banned === 1) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1"><Ban className="w-3 h-3" /> Banni</span>;
    }
    if (user.suspended === 1) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Suspendu</span>;
    }
    if (user.is_active === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactif</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Actif</span>;
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Utilisateur</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-600">{user.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">{getStatusBadge(user)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.banned === 1 && user.banned_reason && (
                      <div className="text-red-600">Motif: {user.banned_reason}</div>
                    )}
                    {user.suspended === 1 && user.suspension_reason && (
                      <div className="text-yellow-600">
                        Motif: {user.suspension_reason}
                        {user.suspended_until && (
                          <div className="text-gray-500">
                            Jusqu'au: {new Date(user.suspended_until).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.banned === 0 && user.suspended === 0 && (
                        <>
                          <button
                            onClick={() => openModal(user, 'ban')}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                          >
                            Bannir
                          </button>
                          <button
                            onClick={() => openModal(user, 'suspend')}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                          >
                            Suspendre
                          </button>
                        </>
                      )}
                      {user.banned === 1 && (
                        <button
                          onClick={() => openModal(user, 'unban')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                        >
                          Débannir
                        </button>
                      )}
                      {user.suspended === 1 && (
                        <button
                          onClick={() => openModal(user, 'unsuspend')}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          Lever suspension
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'action */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              {actionType === 'ban' && <Ban className="w-5 h-5 text-red-600" />}
              {actionType === 'suspend' && <Clock className="w-5 h-5 text-yellow-600" />}
              {actionType === 'unban' && <UserCheck className="w-5 h-5 text-green-600" />}
              {actionType === 'unsuspend' && <UserCheck className="w-5 h-5 text-blue-600" />}
              {actionType === 'ban' && 'Bannir l\'utilisateur'}
              {actionType === 'suspend' && 'Suspendre l\'utilisateur'}
              {actionType === 'unban' && 'Débannir l\'utilisateur'}
              {actionType === 'unsuspend' && 'Lever la suspension'}
            </h3>

            <p className="text-gray-600 mb-4">
              {actionType === 'ban' && `Bannir définitivement ${selectedUser.name} ? Il ne pourra plus accéder à son compte.`}
              {actionType === 'suspend' && `Suspendre temporairement ${selectedUser.name} ?`}
              {actionType === 'unban' && `Débannir ${selectedUser.name} ? Il pourra à nouveau accéder à son compte.`}
              {actionType === 'unsuspend' && `Lever la suspension de ${selectedUser.name} ?`}
            </p>

            {(actionType === 'ban' || actionType === 'suspend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif {actionType === 'suspend' && '(obligatoire)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Expliquez la raison..."
                />
              </div>
            )}

            {actionType === 'suspend' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée (en jours)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1 jour</option>
                  <option value={3}>3 jours</option>
                  <option value={7}>7 jours</option>
                  <option value={14}>14 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={90}>90 jours</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if ((actionType === 'ban' || actionType === 'suspend') && !reason.trim()) {
                    alert('Veuillez indiquer un motif');
                    return;
                  }
                  handleAction(
                    selectedUser.id,
                    actionType,
                    reason,
                    actionType === 'suspend' ? duration : undefined
                  );
                }}
                disabled={loading === selectedUser.id}
                className={`px-4 py-2 rounded-lg text-white transition flex items-center gap-2 ${
                  actionType === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                  actionType === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {loading === selectedUser.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}