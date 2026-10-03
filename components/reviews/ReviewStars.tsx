'use client';

interface ReviewStarsProps {
  rating: number;
  max?: number;
  size?: number;
}

export default function ReviewStars({ rating, max = 5, size = 20 }: ReviewStarsProps) {
  const filled = Math.min(max, Math.max(0, rating));
  const empty = max - Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" style={{ fontSize: size }}>
      {Array.from({ length: Math.round(filled) }, (_, i) => (
        <span key={`filled-${i}`} className="text-yellow-400">★</span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`empty-${i}`} className="text-gray-300">★</span>
      ))}
    </div>
  );
}