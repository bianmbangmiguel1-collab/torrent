// components/home/SearchBar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface SearchProduct {
  id: number;
  slug: string;
  title: string;
  price: number;
  main_image?: string | null;
}

interface SearchApiResponse {
  products?: SearchProduct[];
  error?: string;
  message?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as SearchApiResponse;
      setResults(data.products || []);
      setIsOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="flex items-center bg-white rounded-full shadow-md border border-gray-200 px-4 py-2 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={query}
          onChange={handleSearch}
          className="flex-1 ml-2 outline-none bg-transparent text-gray-700 placeholder-gray-400"
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
          {results.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b last:border-0"
            >
              <img
                src={product.main_image || '/placeholder.png'}
                alt={product.title}
                className="w-10 h-10 object-cover rounded"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{product.title}</p>
                <p className="text-xs text-gray-500">{product.price.toLocaleString()} FCFA</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}