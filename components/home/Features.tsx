// components/home/Features.tsx
'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Truck,
  Headphones,
  CreditCard,
  Award,
  Zap,
  Wallet,
  RefreshCw,
  Lock,
  Smartphone,
  Cloud, // ✅ Ajout de l'icône Cloud
  Gift,
  Clock,
  Star,
  ThumbsUp,
  Package,
  Users,
} from 'lucide-react';

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

interface FeaturesProps {
  title?: string;
  subtitle?: string;
  features?: Feature[];
  columns?: 3 | 4 | 5 | 6;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const defaultFeatures: Feature[] = [
  {
    icon: Shield,
    title: 'Paiement sécurisé',
    description: 'Transactions 100% sécurisées avec cryptage SSL',
    color: 'blue',
  },
  {
    icon: Truck,
    title: 'Livraison instantanée',
    description: 'Accès immédiat après confirmation de paiement',
    color: 'green',
  },
  {
    icon: Headphones,
    title: 'Support 24/7',
    description: 'Une équipe à votre écoute pour vous assister',
    color: 'purple',
  },
  {
    icon: CreditCard,
    title: 'Paiement mobile',
    description: 'Paiement via Orange Money, MTN Mobile Money',
    color: 'orange',
  },
  {
    icon: Award,
    title: 'Qualité garantie',
    description: 'Produits vérifiés, testés et certifiés',
    color: 'yellow',
  },
  {
    icon: Zap,
    title: 'Accès illimité',
    description: 'Téléchargez vos achats à tout moment',
    color: 'red',
  },
];

const colorVariants = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    iconBg: 'bg-blue-100',
    hover: 'hover:bg-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    iconBg: 'bg-green-100',
    hover: 'hover:bg-green-100',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    iconBg: 'bg-purple-100',
    hover: 'hover:bg-purple-100',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    iconBg: 'bg-orange-100',
    hover: 'hover:bg-orange-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    hover: 'hover:bg-yellow-100',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    iconBg: 'bg-red-100',
    hover: 'hover:bg-red-100',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    iconBg: 'bg-pink-100',
    hover: 'hover:bg-pink-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    hover: 'hover:bg-indigo-100',
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    iconBg: 'bg-teal-100',
    hover: 'hover:bg-teal-100',
  },
};

const iconSize = {
  default: 'w-8 h-8',
  compact: 'w-6 h-6',
  detailed: 'w-10 h-10',
};

const textSize = {
  default: { title: 'text-base', desc: 'text-sm' },
  compact: { title: 'text-sm', desc: 'text-xs' },
  detailed: { title: 'text-lg', desc: 'text-base' },
};

const getColorVariant = (color: string) => {
  return colorVariants[color as keyof typeof colorVariants] || colorVariants.blue;
};

export default function Features({
  title = 'Pourquoi choisir TorrentTwist ?',
  subtitle = 'Des fonctionnalités conçues pour vous offrir la meilleure expérience',
  features = defaultFeatures,
  columns = 4,
  variant = 'default',
  className = '',
}: FeaturesProps) {
  const getColumns = () => {
    if (columns === 6) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6';
    if (columns === 5) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';
    if (columns === 3) return 'grid-cols-1 sm:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-4';
  };

  const getPadding = () => {
    if (variant === 'compact') return 'p-4 md:p-6';
    if (variant === 'detailed') return 'p-6 md:p-10';
    return 'p-6 md:p-8';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className={`w-full ${className}`}>
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900"
        >
          {title}
        </motion.h2>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-2 text-sm md:text-base text-gray-500 max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Features Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`grid ${getColumns()} gap-4 md:gap-6`}
      >
        {features.map((feature, index) => {
          const colors = getColorVariant(feature.color);
          const IconComponent = feature.icon;
          const sizes = textSize[variant] || textSize.default;
          const padding = getPadding();

          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                y: -4,
                transition: { duration: 0.2 },
              }}
              className={`group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 ${padding}`}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-transparent group-hover:from-blue-50/50 group-hover:to-purple-50/50 transition duration-500 pointer-events-none" />

              <div className="relative z-10 flex flex-col items-start gap-3">
                {/* Icon */}
                <div
                  className={`p-3 rounded-xl ${colors.iconBg} transition-colors duration-300 group-hover:scale-110 group-hover:${colors.bg}`}
                >
                  <IconComponent
                    className={`${iconSize[variant] || iconSize.default} ${colors.text}`}
                    strokeWidth={1.75}
                  />
                </div>

                {/* Content */}
                <div>
                  <h3 className={`font-semibold text-gray-800 ${sizes.title}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-gray-500 ${sizes.desc} mt-1 leading-relaxed`}>
                    {feature.description}
                  </p>
                </div>

                {/* Decorative dot on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className={`block w-1.5 h-1.5 rounded-full ${colors.text} animate-pulse`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Trust badge footer */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50/80 backdrop-blur-sm rounded-full border border-gray-100 text-xs text-gray-500">
          <Lock className="w-3.5 h-3.5 text-green-500" />
          <span>100% sécurisé</span>
          <span className="w-px h-3 bg-gray-200" />
          <Users className="w-3.5 h-3.5 text-blue-500" />
          <span>+1 000 clients satisfaits</span>
          <span className="w-px h-3 bg-gray-200" />
          <Star className="w-3.5 h-3.5 text-yellow-500" />
          <span>4.8/5 étoiles</span>
        </div>
      </div>
    </section>
  );
}

// Export des features par défaut pour réutilisation
export const featureSets = {
  ecommerce: [
    { icon: Shield, title: 'Paiement sécurisé', description: 'Transactions 100% sécurisées', color: 'blue' },
    { icon: Truck, title: 'Livraison instantanée', description: 'Accès immédiat après paiement', color: 'green' },
    { icon: Headphones, title: 'Support 24/7', description: 'Une équipe à votre écoute', color: 'purple' },
    { icon: CreditCard, title: 'Paiement mobile', description: 'Orange Money, MTN Mobile', color: 'orange' },
  ],
  marketplace: [
    { icon: Shield, title: 'Garantie client', description: 'Satisfait ou remboursé', color: 'blue' },
    { icon: RefreshCw, title: 'Retours faciles', description: 'Sous 14 jours', color: 'green' },
    { icon: Award, title: 'Vendeurs vérifiés', description: 'Tous certifiés', color: 'purple' },
    { icon: Wallet, title: 'Paiement sécurisé', description: 'Transactions protégées', color: 'orange' },
  ],
  digital: [
    { icon: Zap, title: 'Accès instantané', description: 'Téléchargez immédiatement', color: 'blue' },
    { icon: Smartphone, title: 'Multi-plateforme', description: 'PC, tablette, mobile', color: 'green' },
    { icon: Lock, title: 'DRM intégré', description: 'Protection des contenus', color: 'purple' },
    { icon: Cloud, title: 'Stockage cloud', description: 'Vos achats en ligne', color: 'orange' },
  ],
};