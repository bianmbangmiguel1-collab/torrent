// components/home/CarouselHero.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Slide } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CarouselHeroProps {
  slides: Slide[];
  autoplayInterval?: number;
  className?: string;
}

export default function CarouselHero({
  slides,
  autoplayInterval = 5,
  className = '',
}: CarouselHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(0); // -1 left, 1 right

  const totalSlides = slides.length;

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex((index + totalSlides) % totalSlides);
  }, [currentIndex, totalSlides]);

  const goToPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Autoplay
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;
    const interval = setInterval(goToNext, autoplayInterval * 1000);
    return () => clearInterval(interval);
  }, [totalSlides, isPaused, autoplayInterval, goToNext]);

  if (totalSlides === 0) return null;

  const slide = slides[currentIndex];

  // Helper to render slide content
  const renderSlideContent = (slide: Slide) => {
    const slideTitle = slide.title || 'Sans titre';
    const slideDescription = slide.description || '';
    const slideLink = slide.link_url || '#';
    const safeTitle = slide.title ?? 'Sans titre';
    const safeMediaUrl = slide.media_url ?? '';
    const safeVideoUrl = slide.video_url ?? '';
    const safeAlt = slide.title ?? safeTitle;

    if (slide.type === 'campaign' && slide.campaign_slides && slide.campaign_slides.length > 0) {
      // For campaign, we show the first campaign slide (or we could embed a mini-carousel)
      const first = slide.campaign_slides[0];
      return (
        <div className="relative w-full h-full">
          {first.media_url && (
            <img
              src={first.media_url}
              alt={first.title || slide.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center px-8 md:px-16">
            <div className="text-white max-w-xl">
              <h2 className="text-3xl md:text-5xl font-bold">{first.title || slideTitle}</h2>
              {first.subtitle && <p className="mt-2 text-gray-200 text-sm md:text-base">{first.subtitle}</p>}
              {first.cta_text && (
                <a
                  href={first.cta_value || '#'}
                  className="mt-4 inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 transition rounded-lg text-sm font-medium"
                >
                  {first.cta_text}
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === 'video' || slide.type === 'youtube') {
      return (
        <div className="relative w-full h-full bg-black">
          {slide.type === 'youtube' ? (
            <iframe
              src={safeVideoUrl.replace('watch?v=', 'embed/') || ''}
              className="w-full h-full object-cover"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={safeTitle}
            />
          ) : (
            <video
              src={safeMediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center px-8 md:px-16">
            <div className="text-white max-w-xl">
              <span className="inline-block px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold mb-3">
                {slide.type === 'video' ? 'Vidéo' : 'YouTube'}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold">{slideTitle}</h2>
              {slideDescription && <p className="mt-2 text-gray-200 text-sm md:text-base">{slideDescription}</p>}
              {slide.link_url && (
                <a
                  href={slideLink}
                  className="mt-4 inline-block px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 transition rounded-lg text-sm font-medium"
                >
                  Découvrir
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Default: image
    return (
      <div className="relative w-full h-full">
        <img
          src={safeMediaUrl}
          alt={safeAlt}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center px-8 md:px-16">
          <div className="text-white max-w-xl">
            <h2 className="text-3xl md:text-5xl font-bold">{slideTitle}</h2>
            {slideDescription && <p className="mt-2 text-gray-200 text-sm md:text-base">{slideDescription}</p>}
            {slide.link_url && (
              <a
                href={slideLink}
                className="mt-4 inline-block px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 transition rounded-lg text-sm font-medium"
              >
                Découvrir
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl shadow-2xl ${className}`}
      style={{ aspectRatio: '16/7' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.4 },
          }}
          className="absolute inset-0 w-full h-full"
        >
          {renderSlideContent(slide)}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition z-10 backdrop-blur-sm"
            aria-label="Slide précédent"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition z-10 backdrop-blur-sm"
            aria-label="Slide suivant"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicators */}
      {totalSlides > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Aller au slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}