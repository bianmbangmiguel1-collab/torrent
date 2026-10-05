/** @type {import('next').NextConfig} */
const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
const path = require('path');

// Initialise le contexte Cloudflare pour le développement local
initOpenNextCloudflareForDev();

// ============================================================
// UTILITAIRE POUR CONSTRUIRE LA CSP (PRODUCTION UNIQUEMENT)
// ============================================================
function buildCSP() {
  // ═══ LISTE CENTRALISÉE DES SOURCES AUTORISÉES ═══
  // Ajoute ici tous les domaines / sources que tu utilises
  const sources = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://leekpay.fr", "https://js.stripe.com"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    fontSrc: ["'self'", "data:"],
    mediaSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: [
      "'self'",
      "http://localhost:5000",
      "https://leekpay.fr",
      "https://api.leekpay.fr",
      "https://ipapi.co",
      "https://ipinfo.io",
      "https://api.ipapi.co",
      "https://js.stripe.com",
      "https://api.stripe.com",
    ],
    frameSrc: ["'self'", "https://leekpay.fr", "https://js.stripe.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
  };

  // Construire la chaîne CSP
  const directives = [
    `default-src ${sources.defaultSrc.join(' ')}`,
    `script-src ${sources.scriptSrc.join(' ')}`,
    `style-src ${sources.styleSrc.join(' ')}`,
    `img-src ${sources.imgSrc.join(' ')}`,
    `font-src ${sources.fontSrc.join(' ')}`,
    `media-src ${sources.mediaSrc.join(' ')}`,
    `connect-src ${sources.connectSrc.join(' ')}`,
    `frame-src ${sources.frameSrc.join(' ')}`,
    `object-src ${sources.objectSrc.join(' ')}`,
    `base-uri ${sources.baseUri.join(' ')}`,
    `form-action ${sources.formAction.join(' ')}`,
  ];

  return directives.join('; ');
}

// ============================================================
// CONFIGURATION PRINCIPALE
// ============================================================
const nextConfig = {
  // ============================================================
  // IMAGES
  // ============================================================
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost', port: '5000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '**' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // ============================================================
  // EXPERIMENTAL - Server Components External Packages
  // ============================================================
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },

  // ============================================================
  // WEBPACK - Configuration pour sqlite3
  // ============================================================
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        path: false,
        stream: false,
        crypto: false,
        os: false,
        http: false,
        https: false,
        zlib: false,
        ...config.resolve.fallback,
      };
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      'sqlite3': path.resolve(__dirname, 'node_modules/sqlite3/lib/sqlite3.js'),
    };

    return config;
  },

  // ============================================================
  // HEADERS - CSP DÉSACTIVÉ EN DEV, STRICT EN PROD
  // ============================================================
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    // ═══ EN DÉVELOPPEMENT : PAS DE CSP ═══
    if (isDev) {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), payment=()' },
            { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
          ],
        },
      ];
    }

    // ═══ EN PRODUCTION : CSP STRICT ═══
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: buildCSP() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), payment=()' },
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },

  // ============================================================
  // REDIRECTS
  // ============================================================
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/signin', destination: '/login', permanent: true },
      { source: '/register', destination: '/signup', permanent: true },
    ];
  },

  // ============================================================
  // ENVIRONNEMENT
  // ============================================================
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production'
      ? 'https://api.torrenttwist.com'
      : 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: process.env.NODE_ENV === 'production'
      ? 'https://torrenttwist.com'
      : 'http://localhost:3000',
  },

  // ============================================================
  // AUTRES CONFIGURATIONS
  // ============================================================
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  trailingSlash: false,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

module.exports = nextConfig;