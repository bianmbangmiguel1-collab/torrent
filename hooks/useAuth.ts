// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthMeResponse {
  user?: User | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    if (storedToken) {
      setToken(storedToken);

      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Erreur d'authentification: ${res.status}`);
          }

          return (await res.json()) as AuthMeResponse;
        })
        .then((data) => {
          if (data.user) {
            setUser(data.user);
          }
        })
        .catch((error: unknown) => {
          console.error('Erreur lors de la récupération de l’utilisateur:', error);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    document.cookie =
      'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    setUser(null);
    setToken(null);

    router.push('/');
  };

  return {
    user,
    token,
    loading,
    logout,
  };
}