// app/api/payments/chariow/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { extractToken, verifyToken } from '@/lib/auth'
import dns from 'dns'

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first')
}

// ============================================================
// TYPES
// ============================================================

interface ChariowCreateBody {
  orderId?: number | string
}

// ============================================================
// CHARIOW CONFIG
// ============================================================

const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY
const CHARIOW_API_URL =
  process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1'

// ============================================================
// HELPERS : EXTRACT product_id FROM ANY FORMAT
// ============================================================

function extractProductId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null

  const match = trimmed.match(/prd_[a-zA-Z0-9]+/)
  if (match) return match[0]

  try {
    const url = new URL(trimmed)
    const last = url.pathname.split('/').filter(Boolean).pop()
    if (last) return last
  } catch {
    // not a URL
  }

  return trimmed
}

// ============================================================
// COUNTRY MAPPING : NAME → ISO 2-LETTER CODE
// ============================================================

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  // Africa
  'benin': 'BJ', 'bénin': 'BJ',
  'cameroon': 'CM', 'cameroun': 'CM',
  'ivory coast': 'CI', "côte d'ivoire": 'CI', 'cote d ivoire': 'CI',
  'senegal': 'SN', 'sénégal': 'SN',
  'togo': 'TG', 'burkina faso': 'BF', 'mali': 'ML', 'niger': 'NE',
  'guinea': 'GN', 'guinée': 'GN', 'ghana': 'GH', 'nigeria': 'NG',
  'chad': 'TD', 'tchad': 'TD', 'central african republic': 'CF',
  'gabon': 'GA', 'congo': 'CG', 'congo brazzaville': 'CG',
  'democratic republic of the congo': 'CD', 'rdc': 'CD',
  'equatorial guinea': 'GQ', 'kenya': 'KE', 'tanzania': 'TZ',
  'uganda': 'UG', 'rwanda': 'RW', 'south africa': 'ZA', 'afrique du sud': 'ZA',
  'morocco': 'MA', 'maroc': 'MA', 'algeria': 'DZ', 'algérie': 'DZ',
  'tunisia': 'TN', 'tunisie': 'TN', 'egypt': 'EG', 'égypte': 'EG',

  // Europe
  'france': 'FR', 'belgium': 'BE', 'belgique': 'BE',
  'germany': 'DE', 'allemagne': 'DE', 'spain': 'ES', 'espagne': 'ES',
  'italy': 'IT', 'italie': 'IT', 'portugal': 'PT',
  'netherlands': 'NL', 'pays-bas': 'NL',
  'united kingdom': 'GB', 'royaume-uni': 'GB', 'uk': 'GB',
  'switzerland': 'CH', 'suisse': 'CH', 'sweden': 'SE', 'suède': 'SE',
  'norway': 'NO', 'norvège': 'NO', 'denmark': 'DK', 'danemark': 'DK',
  'ireland': 'IE', 'irlande': 'IE', 'poland': 'PL', 'pologne': 'PL',

  // Americas
  'united states': 'US', 'états-unis': 'US', 'usa': 'US', 'canada': 'CA',
  'brazil': 'BR', 'brésil': 'BR', 'mexico': 'MX', 'mexique': 'MX',
  'argentina': 'AR', 'argentine': 'AR', 'chile': 'CL', 'chili': 'CL',
  'colombia': 'CO', 'colombie': 'CO',

  // Asia
  'china': 'CN', 'chine': 'CN', 'india': 'IN', 'inde': 'IN',
  'japan': 'JP', 'japon': 'JP', 'south korea': 'KR', 'corée du sud': 'KR',
  'singapore': 'SG', 'singapour': 'SG', 'malaysia': 'MY', 'malaisie': 'MY',
  'thailand': 'TH', 'thaïlande': 'TH', 'vietnam': 'VN',
  'indonesia': 'ID', 'indonésie': 'ID', 'philippines': 'PH',
  'turkey': 'TR', 'turquie': 'TR',
  'united arab emirates': 'AE', 'émirats arabes unis': 'AE', 'uae': 'AE',
  'saudi arabia': 'SA', 'arabie saoudite': 'SA',

  // Oceania
  'australia': 'AU', 'australie': 'AU',
  'new zealand': 'NZ', 'nouvelle-zélande': 'NZ',
}

function toIsoCountry(value: string | null | undefined): string {
  if (!value) return 'BJ'
  const trimmed = String(value).trim()
  if (!trimmed) return 'BJ'

  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()

  const key = trimmed.toLowerCase()
  if (COUNTRY_NAME_TO_ISO[key]) return COUNTRY_NAME_TO_ISO[key]

  const normalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (COUNTRY_NAME_TO_ISO[normalized]) return COUNTRY_NAME_TO_ISO[normalized]

  console.warn(`⚠️ Unknown country "${value}" → fallback to BJ`)
  return 'BJ'
}

// ============================================================
// PHONE NUMBER MAPPING : DIAL CODE → ISO
// ============================================================

const DIAL_CODE_TO_ISO: Record<string, string> = {
  // Africa
  '213': 'DZ', '216': 'TN', '218': 'LY',
  '220': 'GM', '221': 'SN', '222': 'MR', '223': 'ML', '224': 'GN',
  '225': 'CI', '226': 'BF', '227': 'NE', '228': 'TG', '229': 'BJ',
  '230': 'MU', '231': 'LR', '232': 'SL', '233': 'GH', '234': 'NG',
  '235': 'TD', '236': 'CF', '237': 'CM', '238': 'CV', '239': 'ST',
  '240': 'GQ', '241': 'GA', '242': 'CG', '243': 'CD', '244': 'AO',
  '245': 'GW', '246': 'IO', '247': 'AC', '248': 'SC', '249': 'SD',
  '250': 'RW', '251': 'ET', '252': 'SO', '253': 'DJ', '254': 'KE',
  '255': 'TZ', '256': 'UG', '257': 'BI', '258': 'MZ', '260': 'ZM',
  '261': 'MG', '262': 'RE', '263': 'ZW', '264': 'NA', '265': 'MW',
  '266': 'LS', '267': 'BW', '268': 'SZ', '269': 'KM',
  '27': 'ZA', '290': 'SH', '291': 'ER', '297': 'AW', '298': 'FO', '299': 'GL',

  // North America & Caribbean
  '1': 'US',
  '1242': 'BS', '1246': 'BB', '1264': 'AI', '1268': 'AG', '1284': 'VG',
  '1340': 'VI', '1345': 'KY', '1441': 'BM', '1473': 'GD', '1649': 'TC',
  '1658': 'JM', '1664': 'MS', '1670': 'MP', '1671': 'GU', '1684': 'AS',
  '1721': 'SX', '1758': 'LC', '1767': 'DM', '1784': 'VC', '1787': 'PR',
  '1809': 'DO', '1829': 'DO', '1849': 'DO', '1868': 'TT', '1869': 'KN', '1876': 'JM',

  // South America
  '51': 'PE', '52': 'MX', '53': 'CU', '54': 'AR', '55': 'BR', '56': 'CL',
  '57': 'CO', '58': 'VE', '590': 'GP', '591': 'BO', '592': 'GY', '593': 'EC',
  '594': 'GF', '595': 'PY', '596': 'MQ', '597': 'SR', '598': 'UY', '599': 'CW',

  // Europe
  '30': 'GR', '31': 'NL', '32': 'BE', '33': 'FR', '34': 'ES', '36': 'HU',
  '39': 'IT', '40': 'RO', '41': 'CH', '43': 'AT', '44': 'GB', '45': 'DK',
  '46': 'SE', '47': 'NO', '48': 'PL', '49': 'DE',
  '350': 'GI', '351': 'PT', '352': 'LU', '353': 'IE', '354': 'IS', '355': 'AL',
  '356': 'MT', '357': 'CY', '358': 'FI', '359': 'BG',
  '370': 'LT', '371': 'LV', '372': 'EE', '373': 'MD', '374': 'AM', '375': 'BY',
  '376': 'AD', '377': 'MC', '378': 'SM', '379': 'VA', '380': 'UA', '381': 'RS',
  '382': 'ME', '383': 'XK', '385': 'HR', '386': 'SI', '387': 'BA', '389': 'MK',
  '420': 'CZ', '421': 'SK', '423': 'LI',

  // Asia
  '60': 'MY', '61': 'AU', '62': 'ID', '63': 'PH', '64': 'NZ', '65': 'SG',
  '66': 'TH', '81': 'JP', '82': 'KR', '84': 'VN', '86': 'CN', '90': 'TR',
  '91': 'IN', '92': 'PK', '93': 'AF', '94': 'LK', '95': 'MM', '98': 'IR',
  '670': 'TL', '673': 'BN', '674': 'NR', '675': 'PG', '676': 'TO', '677': 'SB',
  '678': 'VU', '679': 'FJ', '680': 'PW', '681': 'WF', '682': 'CK', '683': 'NU',
  '685': 'WS', '686': 'KI', '687': 'NC', '688': 'TV', '689': 'PF', '690': 'TK',
  '691': 'FM', '692': 'MH', '850': 'KP', '852': 'HK', '853': 'MO', '855': 'KH',
  '856': 'LA', '880': 'BD', '886': 'TW',
  '960': 'MV', '961': 'LB', '962': 'JO', '963': 'SY', '964': 'IQ', '965': 'KW',
  '966': 'SA', '967': 'YE', '968': 'OM', '970': 'PS', '971': 'AE', '972': 'IL',
  '973': 'BH', '974': 'QA', '975': 'BT', '976': 'MN', '977': 'NP',
  '992': 'TJ', '993': 'TM', '994': 'AZ', '995': 'GE', '996': 'KG', '998': 'UZ',

  // Russia & ex-USSR
  '7': 'RU',
}

const DIAL_CODES_SORTED = Object.keys(DIAL_CODE_TO_ISO).sort(
  (a, b) => b.length - a.length,
)

function detectCountryFromPhone(phone: string | null | undefined): string {
  if (!phone) return 'BJ'
  const cleaned = phone.replace(/[^\d]/g, '')
  if (!cleaned) return 'BJ'

  for (const dialCode of DIAL_CODES_SORTED) {
    if (cleaned.startsWith(dialCode)) return DIAL_CODE_TO_ISO[dialCode]
  }
  return 'BJ'
}

// ============================================================
// INDICATIF PAYS : ISO → DIAL CODE (pour reconstruire E.164)
// ============================================================

const ISO_TO_DIAL_CODE: Record<string, string> = {
  // Africa
  DZ: '213', TN: '216', LY: '218', GM: '220', SN: '221', MR: '222',
  ML: '223', GN: '224', CI: '225', BF: '226', NE: '227', TG: '228',
  BJ: '229', MU: '230', LR: '231', SL: '232', GH: '233', NG: '234',
  TD: '235', CF: '236', CM: '237', CV: '238', ST: '239', GQ: '240',
  GA: '241', CG: '242', CD: '243', AO: '244', GW: '245', SC: '248',
  SD: '249', RW: '250', ET: '251', SO: '252', DJ: '253', KE: '254',
  TZ: '255', UG: '256', BI: '257', MZ: '258', ZM: '260', MG: '261',
  RE: '262', ZW: '263', NA: '264', MW: '265', LS: '266', BW: '267',
  SZ: '268', KM: '269', ZA: '27', SH: '290', ER: '291', AW: '297',
  FO: '298', GL: '299',

  // Americas
  US: '1', CA: '1', BS: '1242', BB: '1246', AI: '1264', AG: '1268',
  VG: '1284', VI: '1340', KY: '1345', BM: '1441', GD: '1473',
  TC: '1649', JM: '1658', MS: '1664', MP: '1670', GU: '1671',
  AS: '1684', SX: '1721', LC: '1758', DM: '1767', VC: '1784',
  PR: '1787', DO: '1809', TT: '1868', KN: '1869', PE: '51', MX: '52',
  CU: '53', AR: '54', BR: '55', CL: '56', CO: '57', VE: '58',
  GP: '590', BO: '591', GY: '592', EC: '593', GF: '594', PY: '595',
  MQ: '596', SR: '597', UY: '598', CW: '599',

  // Europe
  GR: '30', NL: '31', BE: '32', FR: '33', ES: '34', HU: '36',
  IT: '39', RO: '40', CH: '41', AT: '43', GB: '44', DK: '45',
  SE: '46', NO: '47', PL: '48', DE: '49', GI: '350', PT: '351',
  LU: '352', IE: '353', IS: '354', AL: '355', MT: '356', CY: '357',
  FI: '358', BG: '359', LT: '370', LV: '371', EE: '372', MD: '373',
  AM: '374', BY: '375', AD: '376', MC: '377', SM: '378', UA: '380',
  RS: '381', ME: '382', XK: '383', HR: '385', SI: '386', BA: '387',
  MK: '389', CZ: '420', SK: '421', LI: '423',

  // Asia
  MY: '60', AU: '61', ID: '62', PH: '63', NZ: '64', SG: '65',
  TH: '66', JP: '81', KR: '82', VN: '84', CN: '86', TR: '90',
  IN: '91', PK: '92', AF: '93', LK: '94', MM: '95', IR: '98',
  TL: '670', BN: '673', NR: '674', PG: '675', TO: '676', SB: '677',
  VU: '678', FJ: '679', PW: '680', WF: '681', CK: '682', NU: '683',
  WS: '685', KI: '686', NC: '687', TV: '688', PF: '689', TK: '690',
  FM: '691', MH: '692', KP: '850', HK: '852', MO: '853', KH: '855',
  LA: '856', BD: '880', TW: '886', MV: '960', LB: '961', JO: '962',
  SY: '963', IQ: '964', KW: '965', SA: '966', YE: '967', OM: '968',
  PS: '970', AE: '971', IL: '972', BH: '973', QA: '974', BT: '975',
  MN: '976', NP: '977', TJ: '992', TM: '993', AZ: '994', GE: '995',
  KG: '996', UZ: '998',

  // Russia
  RU: '7',
}

// ============================================================
// NORMALISATION DU NUMÉRO EN E.164
// ============================================================

/**
 * Normalise un numéro de téléphone au format E.164 (+indicatif + numéro local).
 *
 * Exemples :
 *   "+237675832091"  → "+237675832091"   (déjà E.164)
 *   "237675832091"   → "+237675832091"   (ajoute le +)
 *   "675832091"      → "+237675832091"   (ajoute indicatif CM)
 *   "0675832091"     → "+237675832091"   (enlève le 0 initial, ajoute indicatif CM)
 */
function normalizeToE164(
  rawPhone: string,
  countryHint?: string | null,
): { phoneNumber: string; countryCode: string; dialCode: string } {
  const digitsOnly = rawPhone.replace(/\D/g, '')

  // Détermine le country code (ISO 2 lettres)
  // Priorité : détection depuis le numéro, sinon depuis countryHint
  let countryCode = detectCountryFromPhone(rawPhone)

  // Si le numéro ne contient pas d'indicatif, on utilise le pays du profil
  // (car detectCountryFromPhone retombe sur BJ par défaut)
  if (!rawPhone.trim().startsWith('+') && digitsOnly.length <= 10 && countryHint) {
    const hintIso = toIsoCountry(countryHint)
    if (hintIso) countryCode = hintIso
  }

  const dialCode = ISO_TO_DIAL_CODE[countryCode] || '229'

  // Cas 1 : commence par +
  if (rawPhone.trim().startsWith('+')) {
    return {
      phoneNumber: `+${digitsOnly}`,
      countryCode,
      dialCode,
    }
  }

  // Cas 2 : commence par l'indicatif pays (sans +)
  if (digitsOnly.startsWith(dialCode) && digitsOnly.length > dialCode.length + 5) {
    return {
      phoneNumber: `+${digitsOnly}`,
      countryCode,
      dialCode,
    }
  }

  // Cas 3 : commence par 0 (format local, ex: "0675832091")
  let localDigits = digitsOnly
  if (localDigits.startsWith('0')) {
    localDigits = localDigits.slice(1)
  }

  // Cas 4 : numéro local sans indicatif → ajoute l'indicatif
  return {
    phoneNumber: `+${dialCode}${localDigits}`,
    countryCode,
    dialCode,
  }
}

// ============================================================
// ROBUST FETCH (retry + timeout)
// ============================================================

const FETCH_TIMEOUT_MS = 30_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function chariowFetch(
  endpoint: string,
  body: any,
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const url = `${CHARIOW_API_URL}${endpoint}`
  let lastError: any = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const startTime = Date.now()

    try {
      console.log(`📡 Chariow [${attempt}/${MAX_RETRIES}] → POST ${endpoint}`)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHARIOW_API_KEY}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timer)
      const elapsed = Date.now() - startTime

      const rawBody = await res.text()
      let data: any = null
      try {
        data = rawBody ? JSON.parse(rawBody) : null
      } catch {
        data = { raw: rawBody }
      }

      if (res.ok) {
        console.log(`✅ Chariow ${res.status} in ${elapsed}ms`)
        return { ok: true, status: res.status, data }
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        console.warn(`⚠️ Chariow ${res.status} (retry in ${RETRY_DELAY_MS * attempt}ms)`)
        lastError = { status: res.status, data }
        await sleep(RETRY_DELAY_MS * attempt)
        continue
      }

      console.error(`❌ Chariow ${res.status} in ${elapsed}ms`)
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.message || data?.error || `HTTP ${res.status}`,
      }
    } catch (err: any) {
      clearTimeout(timer)
      const elapsed = Date.now() - startTime
      lastError = err

      const isTimeout =
        err.name === 'AbortError' ||
        err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err.message?.includes('timeout')

      console.warn(
        `⚠️ Chariow attempt ${attempt}/${MAX_RETRIES} failed in ${elapsed}ms :`,
        isTimeout ? 'TIMEOUT' : err.message,
      )

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt)
        continue
      }
    }
  }

  return {
    ok: false,
    status: 0,
    data: null,
    error: lastError?.message || 'Chariow network error',
  }
}

// ============================================================
// POST /api/payments/chariow/create
// ============================================================

export async function POST(req: NextRequest) {
  try {
    console.log('========================================')
    console.log('🛒 CHARIOW - PAYMENT INITIALIZATION')
    console.log('========================================')

    // ─── Auth ───
    const token = extractToken(req)
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'AUTH_TOKEN_MISSING' },
        { status: 401 },
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token', code: 'AUTH_TOKEN_INVALID' },
        { status: 401 },
      )
    }

    console.log('👤 User:', user.id, user.email)

    // ─── Body ───
    let body: ChariowCreateBody
    try {
      body = (await req.json()) as ChariowCreateBody
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 },
      )
    }

    const orderId = Number(body?.orderId)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: 'Invalid orderId', code: 'INVALID_ORDER_ID' },
        { status: 400 },
      )
    }

    console.log('📦 Order ID:', orderId)

    // ─── DB ───
    const db = await getDB()

    const order = await db.get<any>(
      `SELECT
         o.id, o.order_number, o.user_id, o.total, o.product_id,
         o.payment_status, o.user_email, o.user_name,
         u.phone AS user_phone,
         u.country AS user_country,
         p.title AS product_title, p.chariow_product_id
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = ? AND o.user_id = ?`,
      [orderId, user.id],
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 },
      )
    }

    if (String(order.payment_status || '').toLowerCase() === 'paid') {
      return NextResponse.json(
        { error: 'Order already paid', code: 'ORDER_ALREADY_PAID' },
        { status: 409 },
      )
    }

    // ─── API key ───
    if (!CHARIOW_API_KEY) {
      return NextResponse.json(
        {
          error: 'Chariow configuration unavailable',
          code: 'PAYMENT_CONFIGURATION_ERROR',
        },
        { status: 500 },
      )
    }

    // ─── Callback URL ───
    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://torrentwist.com'

    const callbackUrl = `${origin}/payment/success?provider=chariow&orderId=${order.id}`

    // ─── Name / First name ───
    const fullName = (order.user_name || user.name || 'Customer').trim()
    const parts = fullName.split(' ').filter(Boolean)
    const firstName = parts[0] || 'Customer'
    const lastName = parts.slice(1).join(' ') || parts[0] || 'Customer'

    // ═══════════════════════════════════════════════════════════════
    // 📞 PHONE — NORMALISATION EN E.164
    // ═══════════════════════════════════════════════════════════════
    // Chariow attend le numéro COMPLET au format international E.164 (+237...).
    // Le numéro en D1 peut être stocké SANS indicatif (ex: "675832091").
    // On le normalise donc en ajoutant l'indicatif pays.
    const rawPhone = (order.user_phone || (user as any).phone || '').trim()

    if (!rawPhone) {
      console.error('❌ No phone number for user:', user.id)
      return NextResponse.json(
        {
          error:
            'Numéro de téléphone manquant. Ajoutez-le dans votre profil avant de payer.',
          code: 'PHONE_MISSING',
        },
        { status: 400 },
      )
    }

    const { phoneNumber, countryCode, dialCode } = normalizeToE164(
      rawPhone,
      order.user_country || (user as any).country,
    )

    // Validation : doit faire au moins 8 chiffres au total (indicatif + local)
    const totalDigits = phoneNumber.replace(/\D/g, '')
    if (!totalDigits || totalDigits.length < 8) {
      console.error('❌ Invalid phone number:', rawPhone, '→', phoneNumber)
      return NextResponse.json(
        {
          error:
            'Numéro de téléphone invalide. Vérifiez le format (indicatif pays inclus).',
          code: 'PHONE_INVALID',
        },
        { status: 400 },
      )
    }

    console.log('📞 Phone:', {
      raw: rawPhone,
      cleaned: phoneNumber,
      country: countryCode,
      dialCode,
    })

    // ─── Pick product_id ───
    const genericProductId = process.env.CHARIOW_GENERIC_PRODUCT_ID
    const rawProductId = order.chariow_product_id || genericProductId
    const productIdToUse = extractProductId(rawProductId)

    if (!productIdToUse) {
      console.error('❌ No product_id available')
      return NextResponse.json(
        {
          error: 'No Chariow product configured',
          code: 'CHARIOW_PRODUCT_NOT_CONFIGURED',
        },
        { status: 400 },
      )
    }

    if (order.chariow_product_id) {
      console.log('📎 Mode A: specific Chariow product')
    } else {
      console.log('💰 Mode B: generic product')
    }
    console.log('   raw  =', rawProductId)
    console.log('   used =', productIdToUse)

    // ─── Payload ───
    const payload: any = {
      product_id: productIdToUse,
      email: order.user_email || user.email,
      first_name: firstName,
      last_name: lastName,
      phone: {
        number: phoneNumber,       // → "+237675832091"
        country_code: countryCode, // → "CM"
      },
      country: countryCode,
      redirect_url: callbackUrl,
      custom_metadata: {
        orderId: String(order.id),
        orderNumber: order.order_number || `ORD-${order.id}`,
        userId: String(user.id),
        productTitle: order.product_title || '',
        realAmount: String(order.total),
      },
    }

    console.log('📦 Chariow payload:', JSON.stringify(payload, null, 2))

    // ─── Chariow API call ───
    const endpoint = '/checkout'
    const result = await chariowFetch(endpoint, payload)

    if (!result.ok) {
      console.error('❌ Chariow failed:', result.error)

      const isRetryable =
        result.error?.includes('unreachable') ||
        result.error?.includes('timeout') ||
        result.error?.includes('network')

      return NextResponse.json(
        {
          error: result.error || 'Error creating Chariow payment',
          code: isRetryable ? 'CHARIOW_TIMEOUT' : 'CHARIOW_CHECKOUT_ERROR',
          retryable: isRetryable,
          raw: result.data,
        },
        { status: isRetryable ? 503 : result.status >= 400 ? result.status : 502 },
      )
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔑 DEEP PARSING — Chariow nests everything in data.data
    // ═══════════════════════════════════════════════════════════════
    const data = result.data

    console.log('📨 Raw Chariow response:', JSON.stringify(data, null, 2))

    const inner = data.data || data
    const purchase = inner.purchase || data.purchase || {}
    const payment = inner.payment || data.payment || {}

    // Checkout ID : purchase.id en priorité
    const checkoutId =
      purchase.id ||
      payment.transaction_id ||
      inner.purchase_id ||
      data.sale_id ||
      null

    // Checkout URL : à plusieurs niveaux possibles
    const checkoutUrl =
      payment.checkout_url ||
      payment.payment_url ||
      payment.url ||
      inner.checkout_url ||
      inner.payment_url ||
      data.checkout_url ||
      data.url ||
      purchase.checkout_url ||
      null

    console.log('✅ Chariow checkout created:', checkoutId)
    console.log('🔗 URL:', checkoutUrl)

    if (!checkoutUrl) {
      console.error('❌ No Chariow URL in response:', JSON.stringify(data, null, 2))
      return NextResponse.json(
        {
          error: 'Chariow payment URL not found',
          code: 'CHARIOW_URL_MISSING',
          raw: data,
        },
        { status: 502 },
      )
    }

    // ─── Update order ───
    await db.run(
      `UPDATE orders
       SET payment_method = 'chariow',
           payment_id = ?,
           transaction_id = ?,
           payment_status = 'pending',
           updated_at = datetime('now')
       WHERE id = ?`,
      [String(checkoutId || ''), String(checkoutId || ''), order.id],
    )

    // ─── Log payment ───
    try {
      await db.run(
        `INSERT INTO payment_logs (user_id, order_id, amount, method, status, reference, metadata)
         VALUES (?, ?, ?, 'chariow', 'pending', ?, ?)`,
        [
          user.id,
          order.id,
          order.total,
          String(checkoutId || ''),
          JSON.stringify({
            checkout_url: checkoutUrl,
            mode: order.chariow_product_id ? 'product' : 'generic',
            product_id_used: productIdToUse,
            phone_sent: phoneNumber,
            country_sent: countryCode,
          }),
        ],
      )
    } catch (e) {
      console.warn('⚠️ payment_logs insert:', e)
    }

    // ─── Response ───
    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      checkoutId,
      checkoutUrl,
      url: checkoutUrl,
      paymentUrl: checkoutUrl,
      mode: order.chariow_product_id ? 'product' : 'generic',
    })

  } catch (error: any) {
    console.error('❌ CRITICAL CHARIOW ERROR:', error)
    return NextResponse.json(
      {
        error: 'Internal error during Chariow payment initialization',
        code: 'PAYMENT_INTERNAL_ERROR',
      },
      { status: 500 },
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'