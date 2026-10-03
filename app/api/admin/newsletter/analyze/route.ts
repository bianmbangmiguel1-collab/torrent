// app/api/admin/newsletter/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================
// Types
// ============================================================
interface AnalyzeRequestBody {
  subscriberIds?: number[];
}

interface OpenRouterAnalysisResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { subscriberIds }: AnalyzeRequestBody = await request.json();
    const db = await getDB();

    let subscribers;
    if (subscriberIds && subscriberIds.length > 0) {
      const placeholders = subscriberIds.map(() => '?').join(',');
      subscribers = await db.all(
        `SELECT * FROM newsletter_subscribers WHERE id IN (${placeholders})`,
        subscriberIds
      );
    } else {
      subscribers = await db.all(
        `SELECT * FROM newsletter_subscribers WHERE status = 'active' AND analysis IS NULL`
      );
    }

    let analyzed = 0;

    for (const subscriber of subscribers) {
      const analysisData = {
        email: subscriber.email,
        name: subscriber.name || '',
        country: subscriber.country || '',
        source: subscriber.source || '',
        subscribed_at: subscriber.subscribed_at
      };

      const analysisPrompt = `
Analyse ce profil d'abonné newsletter en moins de 30KB.

Données:
${JSON.stringify(analysisData, null, 2)}

Génère:
1. 3-5 intérêts probables basés sur son pays et sa source
2. Un score d'engagement estimé (0-100)
3. Un profil de personnalité (2-3 traits)
4. Recommandations de contenu

Format JSON uniquement:
{
  "interests": ["interet1", "interet2", ...],
  "engagement_score": 75,
  "personality": ["curieux", "actif"],
  "content_recommendations": ["livres", "formations", "articles"]
}
`;

      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://torrenttwist.com',
            'X-Title': 'TorrentTwist Analytics'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'Tu es un expert en analyse de données marketing.'
              },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.5,
            max_tokens: 300,
            response_format: { type: 'json_object' }
          })
        });

        const data: OpenRouterAnalysisResponse = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (content) {
          const analysis = JSON.parse(content);

          await db.run(
            `UPDATE newsletter_subscribers 
             SET analysis = ?,
                 engagement_score = ?,
                 interests = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              JSON.stringify(analysis),
              analysis.engagement_score || 50,
              JSON.stringify(analysis.interests || []),
              subscriber.id
            ]
          );

          analyzed++;
        }
      } catch (error) {
        console.error(`Erreur analyse pour ${subscriber.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      analyzed,
      total: subscribers.length
    });

  } catch (error) {
    console.error('Erreur analyse:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}