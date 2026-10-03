// lib/ai.ts
// ============================================================
// 🤖 Client OpenRouter autonome avec fallback multi-modèles
// ============================================================

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'google/gemma-2-9b-it:free',
]

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const AI_TIMEOUT_MS = 60_000

export interface LLMOptions {
  json?: boolean
  temperature?: number
  maxTokens?: number
  seed?: number
}

// ============================================================
// 📞 APPEL D'UN MODÈLE PRÉCIS
// ============================================================

async function callOpenRouterModel(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY manquante dans .env.local')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const systemMessage = options.json
      ? `${systemPrompt}\n\n⚠️ RÉPONDS UNIQUEMENT AVEC UN OBJET JSON VALIDE. AUCUN TEXTE AVANT OU APRÈS. AUCUN BACKTICK.`
      : systemPrompt

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.85,
      max_tokens: options.maxTokens ?? 3000,
      top_p: 0.95,
    }

    if (options.seed !== undefined) body.seed = options.seed

    // ⚠️ On NE met PAS response_format : la plupart des modèles free le rejettent
    // On compte sur extractJSON pour parser

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TorrentTwist',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`OpenRouter ${response.status}: ${responseText.slice(0, 400)}`)
    }

    let data: { choices?: Array<{ message?: { content?: string } }> }
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(`Réponse OpenRouter non-JSON: ${responseText.slice(0, 300)}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenRouter a retourné une réponse vide')

    return content
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================================
// 🔄 FALLBACK : essai en cascade
// ============================================================

export async function callLLMWithFallback(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {}
): Promise<string> {
  let lastError: unknown = null

  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      console.log(`🤖 OpenRouter → ${model}`)

      const result = await callOpenRouterModel(model, systemPrompt, userPrompt, options)

      console.log(`✅ Modèle utilisé : ${model}`)
      console.log(`📥 Réponse (200c) : ${result.slice(0, 200).replace(/\n/g, ' ')}`)

      return result
    } catch (error) {
      lastError = error
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`❌ ${model} → ${msg.slice(0, 200)}`)
      continue
    }
  }

  const finalMsg = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Tous les modèles OpenRouter ont échoué. Dernière erreur : ${finalMsg}`)
}

// ============================================================
// 🧰 EXTRACTION JSON ROBUSTE
// ============================================================

export function extractJSON<T>(raw: string): T | null {
  if (!raw) return null

  // 1. Essai direct
  try {
    return JSON.parse(raw)
  } catch {}

  // 2. Bloc de code ```json ... ```
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeMatch) {
    try {
      return JSON.parse(codeMatch[1].trim())
    } catch {}
  }

  // 3. Premier { ... } équilibré
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1))
    } catch {}
  }

  console.error('❌ extractJSON: impossible de parser :', raw.slice(0, 300))
  return null
}

// ============================================================
// 🩺 DIAGNOSTIC
// ============================================================

export function isAIConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

export function getAIConfigInfo(): string {
  if (!process.env.OPENROUTER_API_KEY) return 'OPENROUTER_API_KEY manquante'
  const key = process.env.OPENROUTER_API_KEY
  return `OpenRouter configuré (clé: ${key.slice(0, 12)}...)`
}