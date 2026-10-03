// components/home/ProductCard.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingBag, Heart, Eye, Check, Clock } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: number | string;
    slug: string;
    title: string;
    price: number;
    compare_price?: number;
    main_image?: string;
    avg_rating?: number;
    review_count?: number;
    sales_count?: number;
    is_new?: boolean;
    stock?: number;
    status?: string;
    [key: string]: any;
  };
  index?: number;
  onAddToCart?: (productId: number | string) => void;
}

export default function ProductCard({ product, index = 0, onAddToCart }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAdded, setShowAdded] = useState(false);

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  const isOutOfStock = (product.stock ?? 0) <= 0 && product.status !== 'published';
  const isAvailable = product.status === 'published' && (product.stock ?? 0) > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || !isAvailable) return;
    setIsAdding(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 600));
    if (onAddToCart) {
      onAddToCart(Number(product.id));
    }
    setShowAdded(true);
    setIsAdding(false);
    setTimeout(() => setShowAdded(false), 2000);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
    >
      <Link href={`/product/${product.slug}`} className="block h-full">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {product.main_image ? (
            <Image
              src={product.main_image}
              alt={product.title}
              fill
              className={`object-cover transition-transform duration-700 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-sm">Pas d'image</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {discount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
              >
                -{discount}%
              </motion.span>
            )}
            {product.is_new && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
              >
                Nouveau
              </motion.span>
            )}
            {(product.sales_count ?? 0) > 50 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
              >
                ⭐ Top vente
              </motion.span>
            )}
            {!isAvailable && product.status === 'published' && (
              <span className="bg-gray-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                Rupture
              </span>
            )}
          </div>

          {/* Quick actions overlay */}
          <AnimatePresence>
            {isHovered && isAvailable && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3 z-10"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition"
                  aria-label="Voir le produit"
                >
                  <Eye className="w-5 h-5 text-gray-700" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Favorite button */}
          <button
            onClick={handleLike}
            className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition"
            aria-label="Ajouter aux favoris"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </button>

          {/* Quick add to cart button */}
          {isAvailable && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleAddToCart}
              disabled={isAdding || showAdded}
              className={`absolute bottom-3 right-3 z-10 p-2.5 rounded-full shadow-lg transition ${
                showAdded
                  ? 'bg-green-500 text-white'
                  : 'bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700'
              }`}
              aria-label="Ajouter au panier"
            >
              {showAdded ? (
                <Check className="w-5 h-5" />
              ) : isAdding ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-t-transparent border-gray-700 rounded-full"
                />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </motion.button>
          )}

          {/* Stock indicator */}
          {isAvailable && product.stock !== undefined && product.stock < 10 && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-orange-50/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-orange-600 border border-orange-200">
              <Clock className="w-3 h-3" />
              <span>Plus que {product.stock}</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 group-hover:text-blue-600 transition min-h-[40px]">
            {product.title}
          </h3>

          {/* Rating */}
          {product.avg_rating !== undefined && product.avg_rating > 0 ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.avg_rating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : i < Math.ceil(product.avg_rating || 0)
                        ? 'fill-yellow-400 text-yellow-400 opacity-50'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-gray-700">
                {product.avg_rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-400">
                ({product.review_count || 0})
              </span>
            </div>
          ) : (
            <div className="h-5" /> // Placeholder pour aligner les prix
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-bold text-blue-600">
              {product.price.toLocaleString()} FCFA
            </span>
            {product.compare_price && (
              <span className="text-xs text-gray-400 line-through">
                {product.compare_price.toLocaleString()} FCFA
              </span>
            )}
          </div>

          {/* Sales count */}
          {((product.sales_count ?? 0) > 0) && (
            <p className="text-xs text-gray-400 mt-1">
              {product.sales_count ?? 0} {(product.sales_count ?? 0) > 1 ? 'ventes' : 'vente'}
            </p>
          )}
        </div>
      </Link>

      {/* Added to cart notification */}
      <AnimatePresence>
        {showAdded && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg z-20 whitespace-nowrap"
          >
            ✓ Ajouté au panier
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}