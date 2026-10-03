// lib/api.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include',
  });
  return response;
}

// ============================================================
// 🔥 Helper typé pour les réponses JSON
// ============================================================
/**
 * Effectue une requête `fetch` et retourne directement
 * le résultat du `.json()` typé en `T`.
 *
 * Utilisation :
 *   const data = await fetchJson<MyResponse>('/api/foo')
 *   // data est typé MyResponse (plus de 'unknown')
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  return (await response.json()) as T;
}

/**
 * Variante de `fetchJson` qui utilise `apiFetch` (préfixe API_URL + auth headers).
 */
export async function apiFetchJson<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(endpoint, options);
  return (await response.json()) as T;
}