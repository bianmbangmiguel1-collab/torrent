// lib/geo.ts

export interface GeoData {
  country: string
  countryCode: string
  city: string
  timezone: string
  currency: string
  continent?: string
  region?: string
}

// ============================================================
// Types
// ============================================================
interface IpApiResponse {
  status: 'success' | 'fail'
  country?: string
  countryCode?: string
  city?: string
  timezone?: string
  currency?: string
  continent?: string
  region?: string
}

/**
 * Convertit un code pays (ex: "FR", "CM") en emoji de drapeau.
 * @param countryCode - Code pays ISO 3166-1 alpha-2 (ex: "FR", "CM", "US").
 * @returns Emoji du drapeau correspondant, ou "🌍" si le code est invalide.
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode) return '🌍'
  const code = countryCode.toUpperCase()
  if (code.length !== 2) return '🌍'
  const offset = 127397
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset)
}

/**
 * Détecte la géolocalisation à partir d'une adresse IP
 * Utilise ip-api.com (gratuit, sans clé API)
 * @param ip - Adresse IP (ex: '8.8.8.8')
 * @returns GeoData ou null en cas d'échec
 */
export async function detectGeo(ip: string): Promise<GeoData | null> {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    // En développement, on simule les données
    return getFallbackGeo()
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,timezone,currency,region,continent`)
    if (!response.ok) {
      console.warn(`⚠️ ip-api.com a répondu avec un statut ${response.status}`)
      return getFallbackGeo()
    }

    const data: IpApiResponse = await response.json()

    if (data.status === 'fail') {
      console.warn(`⚠️ ip-api.com n'a pas trouvé de données pour ${ip}`)
      return getFallbackGeo()
    }

    return {
      country: data.country || 'Cameroun',
      countryCode: data.countryCode || 'CM',
      city: data.city || 'Douala',
      timezone: data.timezone || 'Africa/Douala',
      currency: getCurrencyFromCountry(data.countryCode || 'CM'),
      continent: data.continent || 'Africa',
      region: data.region || '',
    }
  } catch (error) {
    console.warn(`⚠️ Erreur lors de la géolocalisation pour ${ip}:`, error)
    return getFallbackGeo()
  }
}

/**
 * Devise par défaut selon le pays (pour les pays africains principalement)
 */
function getCurrencyFromCountry(countryCode: string): string {
  const currencyMap: Record<string, string> = {
    CM: 'XAF',
    CF: 'XAF',
    CG: 'XAF',
    GA: 'XAF',
    GQ: 'XAF',
    TD: 'XAF',
    BJ: 'XOF',
    BF: 'XOF',
    CI: 'XOF',
    GN: 'XOF',
    ML: 'XOF',
    NE: 'XOF',
    SN: 'XOF',
    TG: 'XOF',
    NG: 'NGN',
    GH: 'GHS',
    KE: 'KES',
    ZA: 'ZAR',
    RW: 'RWF',
    UG: 'UGX',
    TZ: 'TZS',
    FR: 'EUR',
    US: 'USD',
    GB: 'GBP',
  }
  return currencyMap[countryCode] || 'XAF'
}

/**
 * Données de repli pour le développement local
 */
function getFallbackGeo(): GeoData {
  return {
    country: 'Cameroun',
    countryCode: 'CM',
    city: 'Douala',
    timezone: 'Africa/Douala',
    currency: 'XAF',
    continent: 'Africa',
    region: 'Littoral',
  }
}

/**
 * Récupère la liste des pays à partir des utilisateurs existants
 * @param db - Instance de la base de données
 * @returns Tableau des noms de pays
 */
export async function getCountriesFromDB(db: any): Promise<string[]> {
  try {
    const rows = await db.all(
      'SELECT DISTINCT country FROM users WHERE country IS NOT NULL AND country != "" ORDER BY country'
    ) as Array<{ country: string }>
    return rows.map((row: { country: string }) => row.country)
  } catch (error) {
    console.warn('⚠️ Erreur lors de la récupération des pays:', error)
    return []
  }
}

/**
 * Formate une adresse IP pour l'affichage
 * @param ip - Adresse IP
 * @returns IP formatée ou 'Inconnue'
 */
export function formatIp(ip: string | null): string {
  if (!ip) return 'Inconnue'
  if (ip === '::1' || ip === '127.0.0.1') return 'Localhost'
  return ip
}

/**
 * Obtient le nom complet du pays à partir d'un code pays
 * @param countryCode - Code pays ISO 3166-1 alpha-2
 * @returns Nom du pays ou le code si non trouvé
 */
export function getCountryName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    CM: 'Cameroun',
    FR: 'France',
    US: 'États-Unis',
    GB: 'Royaume-Uni',
    DE: 'Allemagne',
    IT: 'Italie',
    ES: 'Espagne',
    PT: 'Portugal',
    BE: 'Belgique',
    CH: 'Suisse',
    CA: 'Canada',
    NG: 'Nigeria',
    GH: 'Ghana',
    KE: 'Kenya',
    ZA: 'Afrique du Sud',
    RW: 'Rwanda',
    UG: 'Ouganda',
    TZ: 'Tanzanie',
    CI: 'Côte d\'Ivoire',
    SN: 'Sénégal',
    ML: 'Mali',
    BF: 'Burkina Faso',
    BJ: 'Bénin',
    TG: 'Togo',
    GN: 'Guinée',
    NE: 'Niger',
    TD: 'Tchad',
    CF: 'République centrafricaine',
    CG: 'Congo',
    GQ: 'Guinée équatoriale',
    GA: 'Gabon',
  }
  return countryMap[countryCode.toUpperCase()] || countryCode
}