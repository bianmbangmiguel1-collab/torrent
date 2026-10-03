// app/api/admin/newsletter/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// 🔥 Modèle FREE OpenRouter - Routeur automatique
const FREE_MODEL = 'openrouter/free';

// ============================================================
// Types
// ============================================================
interface SendNewsletterBody {
  templateId?: number;
  subscriberIds?: number[];
  personalization?: boolean;
  subject?: string;
  content?: string;
  recipientType?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface DbRunResult {
  lastID?: number;
  changes?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendNewsletterBody;
    const { 
      templateId, 
      subscriberIds, 
      personalization = true,
      subject: customSubject,
      content: customContent,
      recipientType = 'all'
    } = body;

    console.log('📨 Envoi newsletter - Paramètres reçus:', { 
      templateId, 
      subscriberIds: subscriberIds?.length || 0, 
      personalization,
      recipientType,
      hasCustomSubject: !!customSubject,
      hasCustomContent: !!customContent
    });

    const db = await getDB();

    // 🔥 Récupérer le template
    let template = null;
    let subject = customSubject || '';
    let content = customContent || '';

    if (templateId) {
      template = await db.get(
        'SELECT * FROM newsletter_templates WHERE id = ?',
        [templateId]
      );

      if (!template) {
        return NextResponse.json({ 
          success: false,
          error: 'Template non trouvé' 
        }, { status: 404 });
      }

      subject = subject || template.subject;
      content = content || template.content;
    }

    if (!subject || !content) {
      return NextResponse.json({ 
        success: false,
        error: 'Sujet et contenu requis (template ou personnalisé)' 
      }, { status: 400 });
    }

    // 🔥 Récupérer les destinataires
    let recipients = [];

    if (recipientType === 'all') {
      // Tous les abonnés actifs
      recipients = await db.all(`
        SELECT id, email, name, analysis, engagement_score 
        FROM newsletter_subscribers 
        WHERE status = 'active'
      `);
    } else if (recipientType === 'specific' && subscriberIds && subscriberIds.length > 0) {
      // Destinataires spécifiques
      const placeholders = subscriberIds.map(() => '?').join(',');
      recipients = await db.all(`
        SELECT id, email, name, analysis, engagement_score 
        FROM newsletter_subscribers 
        WHERE id IN (${placeholders}) AND status = 'active'
      `, subscriberIds);
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Aucun destinataire sélectionné' 
      }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Aucun destinataire trouvé' 
      }, { status: 404 });
    }

    console.log(`📨 Envoi de "${subject}" à ${recipients.length} destinataires`);

    let sentCount = 0;
    const results: Array<{
      id?: number;
      email: string;
      status: string;
      error?: string;
    }> = [];

    // 🔥 Envoyer à chaque destinataire
    for (const recipient of recipients) {
      try {
        let personalizedSubject = subject;
        let personalizedContent = content;

        // 🔥 Personnalisation avec IA si activée
        if (personalization && template && (template.type === 'ai' || template.type === 'both')) {
          try {
            const prompt = `
Tu es un agent IA spécialisé dans la personnalisation de messages.

Template: "${template.name}"
Sujet original: "${subject}"
Contenu original: "${content}"

Abonné:
- Nom: ${recipient.name || 'Cher client'}
- Email: ${recipient.email}
- Intérêts: ${recipient.analysis || 'Non analysé'}
- Engagement: ${recipient.engagement_score || 0}%

Personnalise le message pour cet abonné. 
Règles:
1. Garde la structure du message
2. Adapte le ton en fonction du niveau d'engagement
3. Utilise le nom de l'abonné
4. Reste professionnel et chaleureux

Réponds au format JSON: {"subject": "sujet personnalisé", "content": "contenu personnalisé"}
`;

            const response = await fetch(OPENROUTER_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://torrenttwist.com',
                'X-Title': 'TorrentTwist Newsletter'
              },
              body: JSON.stringify({
                model: FREE_MODEL, // 🔥 Routeur automatique
                messages: [
                  {
                    role: 'system',
                    content: 'Tu es un expert en personnalisation de messages marketing. Tu réponds toujours en JSON.'
                  },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500,
              })
            });

            const data = (await response.json()) as OpenRouterResponse;
            if (data.choices && data.choices[0]) {
              try {
                const contentStr = data.choices[0].message?.content;
                if (!contentStr) throw new Error('Content manquant');
                const personalized = JSON.parse(contentStr);
                if (personalized.subject) personalizedSubject = personalized.subject;
                if (personalized.content) personalizedContent = personalized.content;
                console.log(`✅ Personnalisation IA réussie pour ${recipient.email}`);
              } catch (parseError) {
                console.warn('⚠️ Réponse IA non-JSON, utilisation du template original');
              }
            }
          } catch (error) {
            console.error('❌ Erreur personnalisation IA:', error);
          }
        }

        // 🔥 Remplacer les variables
        const variables: Record<string, string> = {
          nom: recipient.name || 'Cher client',
          name: recipient.name || 'Cher client',
          email: recipient.email,
          interet: recipient.analysis || 'nos produits',
          engagement: `${recipient.engagement_score || 0}%`,
          date: new Date().toLocaleDateString('fr-FR')
        };

        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedSubject = personalizedSubject.replace(regex, value);
          personalizedContent = personalizedContent.replace(regex, value);
        }

        // 🔥 SAUVEGARDER LE MESSAGE DANS LA BASE
        const result = (await db.run(`
          INSERT INTO newsletter_messages (
            subscriber_id, 
            template_id,
            subject, 
            content, 
            sent_at, 
            status
          ) VALUES (?, ?, ?, ?, datetime('now'), 'sent')
        `, [
          recipient.id, 
          templateId || null, 
          personalizedSubject, 
          personalizedContent
        ])) as DbRunResult;

        // Mettre à jour le dernier envoi
        await db.run(`
          UPDATE newsletter_subscribers 
          SET last_sent_at = datetime('now') 
          WHERE id = ?
        `, [recipient.id]);

        sentCount++;
        results.push({ 
          id: result.lastID,
          email: recipient.email, 
          status: 'sent' 
        });

        console.log(`✅ Message envoyé à ${recipient.email} (ID: ${result.lastID})`);

      } catch (error) {
        console.error(`❌ Erreur envoi à ${recipient.email}:`, error);
        results.push({ 
          email: recipient.email, 
          status: 'failed', 
          error: String(error) 
        });
      }
    }

    // 🔥 Mettre à jour le template si utilisé
    if (templateId) {
      await db.run(`
        UPDATE newsletter_templates 
        SET usage_count = usage_count + 1,
            updated_at = datetime('now')
        WHERE id = ?
      `, [templateId]);
    }

    return NextResponse.json({
      success: true,
      message: `Lettre envoyée à ${sentCount} destinataires sur ${recipients.length}`,
      data: {
        total: recipients.length,
        sent: sentCount,
        failed: recipients.length - sentCount,
        results
      }
    });

  } catch (error) {
    console.error('❌ Erreur envoi campagne:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur lors de l\'envoi' 
    }, { status: 500 });
  }
}