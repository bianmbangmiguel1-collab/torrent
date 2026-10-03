// components/home/CategoryShowcase.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Code,
  Music,
  Video,
  BookOpen,
  ShoppingBag,
  Camera,
  PenTool,
  Heart,
  Coffee,
  Briefcase,
  Smartphone,
  Gamepad2,
  Sparkles,
  Zap,
  Award,
  Globe,
  Compass,
  ChefHat,
  Dumbbell,
  Sparkle,
  Crown,
  Users,
  GraduationCap,
  Laptop,
  Palette,
  Microscope,
  Stethoscope,
  Car,
  Plane,
  Utensils,
  Sun,
  Cloud,
  Moon,
  Shield,        // ✅ ajouté
  BarChart,      // ✅ ajouté
  Search,        // ✅ ajouté
} from 'lucide-react';

// 👇 Import des données statiques
import { categories, getCategoriesByParent, type Category } from '@/app/data/categoriesData';

interface CategoryShowcaseProps {
  /** Liste de catégories (si non fournie, on utilise les données statiques) */
  categories?: Category[];
  /** Filtrer par parentId (null pour les parents, ou un nombre) */
  parentId?: number | null;
  /** Titre de la section */
  title?: string;
  /** Sous‑titre */
  subtitle?: string;
  /** Nombre d’éléments par ligne (responsive) */
  itemsPerRow?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Variante d’affichage */
  variant?: 'default' | 'compact' | 'featured';
  /** Classe CSS additionnelle */
  className?: string;
  /** Callback au clic */
  onCategoryClick?: (category: Category) => void;
}

// Mapping des icônes enrichi (slug → icône)
const iconMap: Record<string, any> = {
  // Familles principales
  ebooks: BookOpen,
  romans: BookOpen,
  'developpement-personnel': Sparkles,
  formations: GraduationCap,
  business: Briefcase,
  technologies: Laptop,
  sante: Stethoscope,
  sciences: Microscope,
  'arts-culture': Palette,
  voyage: Plane,
  cuisine: Utensils,
  sports: Dumbbell,
  jeunesse: Users,
  bd: BookOpen,
  'policier-thriller': Crown,
  'science-fiction': Cloud,
  romance: Heart,
  historique: Compass,
  'litterature-etrangere': Globe,
  poesie: PenTool,
  theatre: Video,
  biographies: Users,
  essais: PenTool,
  spiritualite: Sun,
  'bien-etre': Heart,
  // Sous-catégories fréquentes
  'front-end': Code,
  'back-end': Code,
  'full-stack': Code,
  mobile: Smartphone,
  devops: Zap,
  cloud: Cloud,
  cybersecurite: Shield,
  'machine-learning': Sparkle,
  'deep-learning': Sparkle,
  'data-analytics': BarChart,
  seo: Search,
  'ux-ui': Palette,
  photographie: Camera,
  video: Video,
  musique: Music,
  guitare: Music,
  piano: Music,
  // etc. (ajoutez au besoin)
};

// Couleurs par défaut (dégradés) en fonction du slug
const colorMap: Record<string, string> = {
  ebooks: 'from-blue-500 to-cyan-400',
  romans: 'from-indigo-500 to-purple-400',
  'developpement-personnel': 'from-purple-500 to-pink-400',
  formations: 'from-green-500 to-emerald-400',
  business: 'from-gray-700 to-gray-600',
  technologies: 'from-blue-600 to-indigo-400',
  sante: 'from-red-500 to-rose-400',
  sciences: 'from-cyan-500 to-blue-400',
  'arts-culture': 'from-amber-500 to-orange-400',
  voyage: 'from-sky-500 to-blue-400',
  cuisine: 'from-orange-500 to-yellow-400',
  sports: 'from-lime-500 to-green-400',
  jeunesse: 'from-pink-400 to-rose-300',
  bd: 'from-violet-500 to-purple-400',
  'policier-thriller': 'from-red-600 to-rose-500',
  'science-fiction': 'from-indigo-600 to-blue-500',
  romance: 'from-pink-500 to-rose-400',
  historique: 'from-amber-600 to-yellow-500',
  'litterature-etrangere': 'from-teal-500 to-cyan-400',
  poesie: 'from-rose-400 to-pink-300',
  theatre: 'from-purple-600 to-violet-400',
  biographies: 'from-slate-500 to-gray-400',
  essais: 'from-stone-500 to-amber-300',
  spiritualite: 'from-amber-400 to-yellow-300',
  'bien-etre': 'from-emerald-400 to-green-300',
};

// Liste des couleurs de secours
const fallbackColors = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-red-500 to-orange-400',
  'from-green-500 to-emerald-400',
  'from-indigo-500 to-blue-400',
  'from-yellow-500 to-amber-400',
  'from-rose-500 to-red-400',
  'from-pink-500 to-rose-400',
  'from-amber-500 to-orange-400',
  'from-gray-700 to-gray-600',
  'from-blue-600 to-indigo-400',
  'from-violet-500 to-purple-400',
  'from-cyan-500 to-blue-400',
  'from-yellow-500 to-orange-400',
  'from-amber-500 to-yellow-400',
];

export default function CategoryShowcase({
  categories: propsCategories,
  parentId = null,
  title = 'Catégories',
  subtitle = 'Explorez nos catégories',
  itemsPerRow = { mobile: 2, tablet: 3, desktop: 6 },
  variant = 'default',
  className = '',
  onCategoryClick,
}: CategoryShowcaseProps) {
  // Déterminer les catégories à afficher
  let displayCategories: Category[] = [];

  if (propsCategories && propsCategories.length > 0) {
    displayCategories = propsCategories;
  } else {
    // Utiliser les données statiques avec filtre parentId
    if (parentId !== undefined) {
      displayCategories = getCategoriesByParent(parentId);
    } else {
      // Par défaut : afficher les catégories parentes (niveau 1)
      displayCategories = getCategoriesByParent(null);
    }
  }

  if (displayCategories.length === 0) {
    return (
      <div className="relative py-12 text-center border-2 border-dashed border-gray-200 rounded-3xl">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <span className="text-5xl">📁</span>
          <h3 className="text-lg font-medium text-gray-600">Aucune catégorie</h3>
          <p className="text-sm">Ajoutez des catégories pour organiser vos produits.</p>
        </div>
      </div>
    );
  }

  const getGridCols = () => {
    const cols = itemsPerRow.desktop || 6;
    if (cols >= 6) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
    if (cols === 4) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    if (cols === 3) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2';
  };

  // Variant styles
  const variantStyles = {
    default: {
      container: 'gap-4',
      card: 'bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 p-6 text-center',
      icon: 'w-12 h-12 rounded-xl flex items-center justify-center',
      title: 'font-semibold text-gray-800 text-sm',
      count: 'text-xs text-gray-400',
    },
    compact: {
      container: 'gap-2',
      card: 'bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 p-4 text-center',
      icon: 'w-8 h-8 rounded-lg flex items-center justify-center',
      title: 'font-medium text-gray-700 text-xs',
      count: 'text-[10px] text-gray-400',
    },
    featured: {
      container: 'gap-5',
      card: 'bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-md hover:shadow-xl transition-all border border-gray-200 p-7 text-center hover:scale-[1.02]',
      icon: 'w-16 h-16 rounded-2xl flex items-center justify-center',
      title: 'font-semibold text-gray-800 text-base',
      count: 'text-xs text-gray-400',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  // Obtenir l'icône pour une catégorie
  const getIcon = (category: Category) => {
    // 1. Utiliser le slug pour trouver une icône dans le map
    const slug = category.slug;
    if (slug && iconMap[slug]) {
      return iconMap[slug];
    }
    // 2. Sinon, utiliser une icône par défaut selon l'index
    const fallbackIcons = [
      Code, Music, Video, BookOpen, ShoppingBag, Camera,
      PenTool, Heart, Coffee, Briefcase, Smartphone, Gamepad2,
      Sparkles, Zap, Award
    ];
    const idx = displayCategories.indexOf(category) % fallbackIcons.length;
    return fallbackIcons[idx] || Sparkles;
  };

  // Obtenir le dégradé de couleur pour une catégorie
  const getColor = (category: Category) => {
    const slug = category.slug;
    if (slug && colorMap[slug]) {
      return colorMap[slug];
    }
    const idx = displayCategories.indexOf(category) % fallbackColors.length;
    return fallbackColors[idx] || 'from-blue-500 to-cyan-400';
  };

  return (
    <div className={`mb-12 ${className}`}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            {title && (
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {title}
                {displayCategories.length > 0 && (
                  <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {displayCategories.length}
                  </span>
                )}
              </h2>
            )}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <Link
            href="/categories"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            Voir toutes les catégories
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Categories grid */}
      <div className={`grid ${getGridCols()} ${style.container}`}>
        {displayCategories.map((category, index) => {
          const Icon = getIcon(category);
          const color = getColor(category);
          const isFeatured = variant === 'featured';

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{
                y: isFeatured ? -6 : -4,
                transition: { duration: 0.2 },
              }}
            >
              <Link
                href={`/category/${category.slug}`}
                className={`block h-full ${style.card}`}
                onClick={() => onCategoryClick?.(category)}
              >
                {/* Icon */}
                <div className={`${style.icon} bg-gradient-to-br ${color} text-white mx-auto`}>
                  <Icon className={`${isFeatured ? 'w-8 h-8' : 'w-6 h-6'}`} />
                </div>

                {/* Name */}
                <h3 className={`${style.title} mt-${isFeatured ? '3' : '2'} group-hover:text-blue-600 transition`}>
                  {category.name}
                </h3>

                {/* Product count (si disponible) */}
                {category.product_count !== undefined && (
                  <p className={`${style.count} mt-1`}>
                    {category.product_count} {category.product_count > 1 ? 'produits' : 'produit'}
                  </p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}