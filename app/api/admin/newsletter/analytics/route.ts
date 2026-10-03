// app/api/admin/newsletter/analytics/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================
// Types
// ============================================================
interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30days';
    const db = await getDB();

    // Calculer la date de début
    let startDate = new Date();
    if (period === '30days') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90days') startDate.setDate(startDate.getDate() - 90);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString();

    // 1. Vue d'ensemble
    const overview = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM newsletter_subscribers) as total_subscribers,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active' AND opt_in = 1) as active_subscribers,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'inactive' OR opt_in = 0) as inactive_subscribers,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE created_at >= ?) as new_subscribers,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE unsubscribed_at >= ?) as unsubscribes,
        ROUND(
          ((SELECT COUNT(*) FROM newsletter_subscribers WHERE created_at >= ?) * 100.0) / 
          NULLIF((SELECT COUNT(*) FROM newsletter_subscribers), 0)
        , 1) as growth_rate
    `, [startDateStr, startDateStr, startDateStr]);

    // 2. Campagnes
    const campaigns = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        ROUND(AVG(CASE WHEN recipients_count > 0 THEN (opens_count * 100.0 / recipients_count) END), 1) as average_open_rate,
        ROUND(AVG(CASE WHEN recipients_count > 0 THEN (clicks_count * 100.0 / recipients_count) END), 1) as average_click_rate
      FROM newsletter_campaigns
      WHERE created_at >= ?
    `, [startDateStr]);

    // 3. Engagement
    const engagement = await db.get(`
      SELECT 
        SUM(opens_count) as total_opens,
        SUM(clicks_count) as total_clicks,
        SUM(unsubscribes_count) as total_unsubscribes,
        ROUND(
          (SUM(opens_count) * 100.0) / NULLIF(SUM(recipients_count), 0)
        , 1) as open_rate,
        ROUND(
          (SUM(clicks_count) * 100.0) / NULLIF(SUM(recipients_count), 0)
        , 1) as click_rate,
        ROUND(
          (SUM(unsubscribes_count) * 100.0) / NULLIF(SUM(recipients_count), 0)
        , 1) as unsubscribe_rate
      FROM newsletter_campaigns
      WHERE status = 'sent' AND created_at >= ?
    `, [startDateStr]);

    // 4. Top campagnes
    const topCampaigns = await db.all(`
      SELECT 
        id, name, subject, sent_at, 
        recipients_count as recipients,
        opens_count as opens,
        clicks_count as clicks,
        ROUND((opens_count * 100.0) / NULLIF(recipients_count, 0), 1) as open_rate,
        ROUND((clicks_count * 100.0) / NULLIF(recipients_count, 0), 1) as click_rate
      FROM newsletter_campaigns
      WHERE status = 'sent'
      ORDER BY open_rate DESC
      LIMIT 5
    `);

    // 5. Tendances (par jour)
    const dailyTrends = await db.all(`
      SELECT 
        date(sent_at) as date,
        SUM(opens_count) as opens,
        SUM(clicks_count) as clicks,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE date(created_at) = date(sent_at)) as subscribers
      FROM newsletter_campaigns
      WHERE status = 'sent' AND sent_at >= ?
      GROUP BY date(sent_at)
      ORDER BY date(sent_at) DESC
      LIMIT 30
    `, [startDateStr]);

    // 6. AI Insights
    let aiInsights = {
      best_time_to_send: '10h-12h',
      best_day: 'Mardi',
      most_engaged_segment: 'Actifs',
      recommendation: 'Augmentez la fréquence d\'envoi pour les abonnés engagés',
      engagement_score: 0
    };

    if (OPENROUTER_API_KEY) {
      try {
        const prompt = `
Analyse ces données de newsletter et génère des insights en français:

Données:
- Total abonnés: ${overview.total_subscribers || 0}
- Actifs: ${overview.active_subscribers || 0}
- Taux d'ouverture: ${engagement?.open_rate || 0}%
- Taux de clics: ${engagement?.click_rate || 0}%
- Taux de désabonnement: ${engagement?.unsubscribe_rate || 0}%
- Nombre de campagnes: ${campaigns?.total || 0}

Réponds au format JSON avec:
- best_time_to_send: meilleur moment pour envoyer
- best_day: meilleur jour
- most_engaged_segment: segment le plus engagé
- recommendation: recommandation stratégique
- engagement_score: score global (0-100)
`;

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
              { role: 'system', content: 'Tu es un expert en analyse de newsletters marketing.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.5,
            max_tokens: 300,
            response_format: { type: 'json_object' }
          })
        });

        const data = (await response.json()) as OpenRouterResponse;

        if (data.choices && data.choices[0]) {
          const parsed = JSON.parse(data.choices[0].message?.content || '{}');
          aiInsights = { ...aiInsights, ...parsed };
        }
      } catch (error) {
        console.error('Erreur AI insights:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          ...overview,
          growth_rate: overview?.growth_rate || 0
        },
        campaigns: {
          ...campaigns,
          total: campaigns?.total || 0,
          sent: campaigns?.sent || 0,
          scheduled: campaigns?.scheduled || 0,
          draft: campaigns?.draft || 0,
          failed: campaigns?.failed || 0,
          average_open_rate: campaigns?.average_open_rate || 0,
          average_click_rate: campaigns?.average_click_rate || 0
        },
        engagement: {
          ...engagement,
          open_rate: engagement?.open_rate || 0,
          click_rate: engagement?.click_rate || 0,
          unsubscribe_rate: engagement?.unsubscribe_rate || 0
        },
        top_campaigns: topCampaigns || [],
        trends: {
          daily: dailyTrends || []
        },
        ai_insights: aiInsights
      }
    });

  } catch (error) {
    console.error('Erreur analytics:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}