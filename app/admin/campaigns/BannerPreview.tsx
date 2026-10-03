// app/admin/campaigns/BannerPreview.tsx
'use client';

import type { Slide } from '@/lib/types';

interface BannerPreviewProps {
  slides: Slide[];
  currentIndex: number;
  device: 'desktop' | 'tablet' | 'mobile';
  showControls?: boolean;
  onSlideChange?: (index: number) => void;
}

export function BannerPreview({
  slides,
  currentIndex,
  device,
  showControls = false,
  onSlideChange,
}: BannerPreviewProps) {
  const slide = slides[currentIndex] || {};

  // Sélectionner la bonne URL média selon l'appareil
  const getMediaUrl = () => {
    if (device === 'desktop' && slide.media_desktop) return slide.media_desktop;
    if (device === 'tablet' && slide.media_tablet) return slide.media_tablet;
    if (device === 'mobile' && slide.media_mobile) return slide.media_mobile;
    return slide.media_url || ''; // fallback
  };

  const mediaUrl = getMediaUrl();

  // Dimensions selon l'appareil
  const getDimensions = () => {
    switch (device) {
      case 'desktop':
        return { width: '100%', maxWidth: '100%', aspectRatio: '16/9' };
      case 'tablet':
        return { width: '768px', aspectRatio: '4/3' };
      case 'mobile':
        return { width: '375px', aspectRatio: '9/16' };
      default:
        return { width: '100%', aspectRatio: '16/9' };
    }
  };

  const dimensions = getDimensions();

  // Position du contenu
  const getPositionClasses = () => {
    const pos = slide.content_position || 'center';
    const align = slide.content_alignment || 'center';
    const posMap: Record<string, string> = {
      left: 'items-start',
      center: 'items-center',
      right: 'items-end',
    };
    const alignMap: Record<string, string> = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };
    return `${posMap[pos]} ${alignMap[align]}`;
  };

  // Opacité de l'overlay
  const overlayOpacity = slide.overlay_opacity !== undefined ? slide.overlay_opacity / 100 : 0.65;

  return (
    <div className="relative mx-auto overflow-hidden rounded-xl bg-gray-200 shadow-lg" style={dimensions}>
      {/* Média */}
      {mediaUrl ? (
        <div className="w-full h-full">
          <img
            src={mediaUrl}
            alt={slide.title || 'Aperçu de la campagne'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-image.png';
            }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="text-center text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Aucun média</p>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-center p-6 md:p-12"
        style={{
          backgroundColor: slide.background_color || 'rgba(0,0,0,0.5)',
          opacity: overlayOpacity,
        }}
      >
        <div className={`max-w-lg ${getPositionClasses()}`}>
          {slide.title && (
            <h2
              className="text-2xl md:text-4xl font-bold mb-2"
              style={{ color: slide.text_color || '#ffffff' }}
            >
              {slide.title}
            </h2>
          )}
          {slide.subtitle && (
            <p
              className="text-base md:text-xl mb-2"
              style={{ color: slide.text_color || '#ffffff' }}
            >
              {slide.subtitle}
            </p>
          )}
          {slide.description && (
            <p
              className="text-sm md:text-base mb-4 opacity-90"
              style={{ color: slide.text_color || '#ffffff' }}
            >
              {slide.description}
            </p>
          )}
          {slide.cta_text && (
            <button
              className="px-6 py-2.5 rounded-lg font-medium transition hover:opacity-90"
              style={{
                backgroundColor: slide.button_color || '#2563eb',
                color: '#ffffff',
              }}
            >
              {slide.cta_text}
            </button>
          )}
        </div>
      </div>

      {/* Indicateurs de slide (si carousel) */}
      {showControls && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSlideChange?.(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Aller au slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Flèches de navigation (si carousel) */}
      {showControls && slides.length > 1 && (
        <>
          <button
            onClick={() => onSlideChange?.((currentIndex - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition z-10"
            aria-label="Slide précédent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onSlideChange?.((currentIndex + 1) % slides.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition z-10"
            aria-label="Slide suivant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Badge appareil */}
      <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full z-10">
        {device === 'desktop' ? '💻 Desktop' : device === 'tablet' ? '📱 Tablet' : '📱 Mobile'}
      </div>
    </div>
  );
}

export default BannerPreview;