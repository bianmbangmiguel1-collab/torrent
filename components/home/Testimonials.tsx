// components/home/Testimonials.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote, User } from 'lucide-react';

interface Testimonial {
  id: string | number;
  name: string;
  role: string;
  avatar?: string;
  content: string;
  rating: number;
  date?: string;
  verified?: boolean;
}

interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  testimonials?: Testimonial[];
  autoplayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  variant?: 'grid' | 'carousel' | 'masonry';
  className?: string;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Jean Dupont',
    role: 'Développeur Full Stack',
    content: 'TorrentTwist m\'a permis de trouver des ressources de qualité pour mes projets. La plateforme est intuitive et les produits sont toujours à jour.',
    rating: 5,
    date: 'Il y a 2 jours',
    verified: true,
  },
  {
    id: 2,
    name: 'Marie Kone',
    role: 'Designer UX/UI',
    content: 'Je recommande vivement TorrentTwist ! Les templates et éléments graphiques que j\'ai achetés ont considérablement amélioré mon workflow.',
    rating: 5,
    date: 'Il y a 1 semaine',
    verified: true,
  },
  {
    id: 3,
    name: 'Paul Tchoumi',
    role: 'Entrepreneur',
    content: 'Excellente plateforme ! J\'ai trouvé tout ce dont j\'avais besoin pour lancer ma startup. Le support client est réactif et professionnel.',
    rating: 4,
    date: 'Il y a 2 semaines',
    verified: false,
  },
  {
    id: 4,
    name: 'Sophie Ngono',
    role: 'Chef de projet',
    content: 'Les formations disponibles sur TorrentTwist m\'ont permis de monter en compétences rapidement. Un véritable atout pour ma carrière.',
    rating: 5,
    date: 'Il y a 3 semaines',
    verified: true,
  },
  {
    id: 5,
    name: 'David Essomba',
    role: 'Data Analyst',
    content: 'La bibliothèque de ressources est impressionnante. Je trouve toujours ce dont j\'ai besoin pour mes analyses de données.',
    rating: 4,
    date: 'Il y a 1 mois',
    verified: false,
  },
  {
    id: 6,
    name: 'Laura Mendouga',
    role: 'Community Manager',
    content: 'TorrentTwist a révolutionné ma façon de travailler. Les outils de marketing digital m\'ont fait gagner un temps précieux.',
    rating: 5,
    date: 'Il y a 1 mois',
    verified: true,
  },
];

export default function Testimonials({
  title = 'Ce que disent nos clients',
  subtitle = 'Des milliers de clients satisfaits font confiance à TorrentTwist',
  testimonials = defaultTestimonials,
  autoplayInterval = 5,
  showControls = true,
  showIndicators = true,
  variant = 'carousel',
  className = '',
}: TestimonialsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(0);

  const totalItems = testimonials.length;
  const itemsPerView = variant === 'grid' ? Math.min(3, totalItems) : 1;

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + itemsPerView) % totalItems);
  }, [itemsPerView, totalItems]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - itemsPerView + totalItems) % totalItems);
  }, [itemsPerView, totalItems]);

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Autoplay
  useEffect(() => {
    if (variant !== 'carousel' || isPaused || totalItems <= 1) return;
    const interval = setInterval(goToNext, autoplayInterval * 1000);
    return () => clearInterval(interval);
  }, [goToNext, isPaused, autoplayInterval, variant, totalItems]);

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Render a single testimonial card
  const renderTestimonialCard = (testimonial: Testimonial, index: number) => {
    const initials = testimonial.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <motion.div
        key={testimonial.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 p-6 h-full flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-3">
          {/* Avatar */}
          {testimonial.avatar ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={testimonial.avatar}
                alt={testimonial.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm truncate">
              {testimonial.name}
            </h4>
            <p className="text-xs text-gray-400 truncate">{testimonial.role}</p>
          </div>
          {testimonial.verified && (
            <span className="flex-shrink-0 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Vérifié
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-2">
          {renderStars(testimonial.rating)}
          {testimonial.date && (
            <span className="text-xs text-gray-400">• {testimonial.date}</span>
          )}
        </div>

        {/* Content */}
        <blockquote className="flex-1 text-sm text-gray-600 leading-relaxed relative pl-4 border-l-2 border-blue-200">
          <Quote className="absolute -left-2 -top-1 w-4 h-4 text-blue-400 opacity-50" />
          <p className="ml-2">"{testimonial.content}"</p>
        </blockquote>
      </motion.div>
    );
  };

  // Grid variant
  if (variant === 'grid') {
    return (
      <section className={`w-full ${className}`}>
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm md:text-base text-gray-500">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => renderTestimonialCard(testimonial, idx))}
        </div>
      </section>
    );
  }

  // Masonry variant
  if (variant === 'masonry') {
    return (
      <section className={`w-full ${className}`}>
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm md:text-base text-gray-500">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <div
              key={testimonial.id}
              className={`${idx % 3 === 1 ? 'md:mt-8' : ''} ${idx % 5 === 2 ? 'md:mt-12' : ''}`}
            >
              {renderTestimonialCard(testimonial, idx)}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Carousel variant (default)
  const visibleItems = testimonials.slice(currentIndex, currentIndex + itemsPerView);
  const remaining = itemsPerView - visibleItems.length;
  const itemsToShow = [...visibleItems, ...testimonials.slice(0, remaining)];

  return (
    <section
      className={`w-full ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-2 text-sm md:text-base text-gray-500">{subtitle}</p>}
      </div>

      {/* Carousel */}
      <div className="relative">
        <div className="overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {itemsToShow.slice(0, 3).map((testimonial, idx) =>
                renderTestimonialCard(testimonial, idx)
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        {showControls && totalItems > itemsPerView && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2.5 shadow-lg hover:bg-blue-50 hover:border-blue-200 transition-all"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2.5 shadow-lg hover:bg-blue-50 hover:border-blue-200 transition-all"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Indicators */}
        {showIndicators && totalItems > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: Math.ceil(totalItems / itemsPerView) }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx * itemsPerView)}
                className={`h-1.5 rounded-full transition-all ${
                  Math.floor(currentIndex / itemsPerView) === idx
                    ? 'w-8 bg-blue-600'
                    : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Page ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}