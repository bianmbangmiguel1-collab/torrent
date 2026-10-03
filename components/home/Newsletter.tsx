// components/home/Newsletter.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  CheckCircle,
  XCircle,
  Mail,
  User,
  Sparkles,
  Lock,
} from 'lucide-react';

interface NewsletterProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
  successMessage?: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'branded';
}

interface NewsletterResponse {
  message?: string;
  error?: string;
}

export default function Newsletter({
  title = 'Ne manquez rien !',
  subtitle = 'Recevez nos meilleures offres, promotions et nouveautés directement dans votre boîte mail.',
  placeholder = 'Votre adresse email',
  buttonText = "S'inscrire",
  successMessage = 'Merci pour votre inscription ! 🎉',
  className = '',
  variant = 'default',
}: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'success') {
      setEmail('');
      setName('');

      const timer = setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !validateEmail(email)) {
      setStatus('error');
      setMessage('Veuillez entrer une adresse email valide.');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      // 🔥 Appel DIRECT à l'API
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          source: 'website',
        }),
      });

      const data = (await response.json()) as NewsletterResponse;

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || successMessage);
        console.log('✅ Inscription réussie !', data);
      } else {
        setStatus('error');
        setMessage(
          data.error || 'Une erreur est survenue. Veuillez réessayer.'
        );
        console.error('❌ Erreur inscription:', data);
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      setStatus('error');
      setMessage('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8';

      case 'branded':
        return 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 md:p-12 text-white';

      default:
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12';
    }
  };

  const getTitleColor = () => {
    if (variant === 'branded') return 'text-white';
    return 'text-gray-800';
  };

  const getSubtitleColor = () => {
    if (variant === 'branded') return 'text-blue-100';
    return 'text-gray-500';
  };

  const getInputClasses = () => {
    if (variant === 'branded') {
      return 'flex-1 px-4 py-3 rounded-xl text-gray-800 placeholder-gray-400 bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm';
    }

    return 'flex-1 px-4 py-3 rounded-xl text-gray-800 placeholder-gray-400 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  };

  const getButtonClasses = () => {
    if (variant === 'branded') {
      return 'bg-white text-blue-600 hover:bg-gray-100 transition flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
    }

    return 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed';
  };

  return (
    <section className={`w-full ${className}`}>
      <div className={getContainerClasses()}>
        <div className="max-w-2xl mx-auto text-center">
          {variant !== 'minimal' && (
            <div
              className={`inline-flex p-3 rounded-full mb-4 ${
                variant === 'branded' ? 'bg-white/20' : 'bg-blue-100'
              }`}
            >
              <Mail
                className={`w-8 h-8 ${
                  variant === 'branded' ? 'text-white' : 'text-blue-600'
                }`}
              />
            </div>
          )}

          <h2 className={`text-2xl md:text-3xl font-bold ${getTitleColor()}`}>
            {title}
          </h2>

          <p className={`mt-2 text-sm md:text-base ${getSubtitleColor()}`}>
            {subtitle}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {variant !== 'minimal' && (
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Votre prénom (optionnel)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${getInputClasses()} pl-10`}
                    disabled={isLoading || status === 'success'}
                  />
                </div>
              )}
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="email"
                  placeholder={placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${getInputClasses()} pl-10`}
                  required
                  disabled={isLoading || status === 'success'}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || status === 'success'}
                className={getButtonClasses()}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-t-transparent border-current rounded-full"
                  />
                ) : status === 'success' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Inscrit !
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {buttonText}
                  </>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{message}</span>
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-2">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-green-500" />
                Sécurisé
              </span>
              <span className="w-px h-3 bg-gray-200" />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Zéro spam
              </span>
              <span className="w-px h-3 bg-gray-200" />
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Désabonnement facile
              </span>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}