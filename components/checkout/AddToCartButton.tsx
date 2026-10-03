'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, CheckCircle, Loader2 } from 'lucide-react';

interface AddToCartButtonProps {
  productId: number;
  className?: string;
  children?: React.ReactNode;
  quantity?: number;
}

interface CartApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
  totalItems?: number;
}

export default function AddToCartButton({
  productId,
  className = '',
  children,
  quantity = 1,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setIsSuccess(false);

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      // Vérifier si la réponse est JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Erreur serveur');
      }

      const data = (await response.json()) as CartApiResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout au panier');
      }

      setIsSuccess(true);
      router.refresh();

      setTimeout(() => {
        setIsSuccess(false);
      }, 2000);

    } catch (error: any) {
      console.error('Erreur addToCart:', error);
      alert(error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={isLoading || isSuccess}
      className={`group flex w-full items-center justify-center gap-3 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          <span className="text-xs sm:text-sm">Ajout en cours...</span>
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Ajouté au panier !</span>
        </>
      ) : (
        <>
          {children || (
            <>
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 transition group-hover:scale-110" />
              <span className="text-xs sm:text-sm">Ajouter au panier</span>
            </>
          )}
        </>
      )}
    </button>
  );
}