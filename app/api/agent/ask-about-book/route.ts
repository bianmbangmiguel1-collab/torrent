// app/api/agent/ask-about-book/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// 🔥 MODÈLE FREE OPENROUTER - Routeur automatique vers les meilleurs modèles gratuits
const FREE_MODEL = 'openrouter/free';

interface AskAboutBookBody {
  bookId?: number | string
  bookTitle?: string
  question: string
  email?: string
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookId, bookTitle, question, email } =
      (await request.json()) as AskAboutBookBody;

    console.log('📝 Question reçue:', { bookId, bookTitle, question, email });

    if (!question) {
      return NextResponse.json({
        success: false,
        error: 'Question requise'
      }, { status: 400 });
    }

    // 🔥 Récupérer le produit par ID ou par TITRE
    const db = await getDB();
    
    let product = null;
    
    // Essayer d'abord par ID
    if (bookId) {
      product = await db.get(`
        SELECT 
          p.id,
          p.title,
          p.description,
          p.content,
          p.type,
          p.file_path,
          p.category_id,
          c.name as category_name,
          p.author,
          p.slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `, [bookId]);
    }
    
    // Si pas trouvé par ID, essayer par titre
    if (!product && bookTitle) {
      product = await db.get(`
        SELECT 
          p.id,
          p.title,
          p.description,
          p.content,
          p.type,
          p.file_path,
          p.category_id,
          c.name as category_name,
          p.author,
          p.slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.title LIKE ?
      `, [`%${bookTitle}%`]);
    }

    console.log('📦 Produit trouvé:', product ? product.title : 'Aucun');

    // 🔥 Construire le contexte pour l'IA
    let context = '';
    const typeLabel = product?.type === 'file' ? 'fichier' : 'livre';

    if (product) {
      context = `
Titre : "${product.title}"
Type : ${typeLabel}
${product.author ? `Auteur : ${product.author}` : ''}
${product.category_name ? `Catégorie : ${product.category_name}` : ''}
${product.description ? `Description : ${product.description}` : ''}
${product.content ? `Contenu : ${product.content.substring(0, 500)}` : ''}
`;
    } else {
      // Si le produit n'est pas trouvé en base, on utilise juste le titre
      context = `
Titre : "${bookTitle || 'Inconnu'}"
Type : livre
`;
      console.log('⚠️ Produit non trouvé en base, utilisation du titre uniquement');
    }

    console.log('📝 Contexte construit:', context.substring(0, 200) + '...');

    // 🔥 Vérifier la clé API
    if (!OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY non configurée');
      return NextResponse.json({
        success: false,
        error: 'API non configurée',
        answer: 'L\'agent n\'est pas configuré correctement. Veuillez contacter l\'administrateur.'
      }, { status: 500 });
    }

    console.log(`🤖 Modèle OpenRouter FREE: ${FREE_MODEL} (routeur automatique)`);

    // 🔥 Construire le prompt pour OpenRouter
    const prompt = `
Tu es un bibliothécaire passionné et expert en recommandations de livres.

Voici le contexte :
${context}

L'utilisateur pose la question suivante :
"${question}"

Règles de réponse :
1. Réponds en français
2. Sois chaleureux, enthousiaste et encourageant
3. Utilise les informations du contexte si disponibles
4. Si c'est une salutation (bonjour, salut, coucou, etc.), réponds de manière amicale
5. Si tu ne connais pas la réponse, propose des pistes de réflexion
6. Donne envie de découvrir ce livre/fichier

Réponds de manière naturelle et engageante.
`;

    console.log('🤖 Appel OpenRouter FREE avec routeur automatique...');

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://torrenttwist.com',
        'X-Title': 'TorrentTwist Newsletter Agent'
      },
      body: JSON.stringify({
        model: FREE_MODEL, // 🔥 openrouter/free - Routeur automatique
        messages: [
          {
            role: 'system',
            content: 'Tu es un bibliothécaire passionné qui répond aux questions sur les livres et les fichiers.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 500,
      })
    });

    const data = (await response.json()) as OpenRouterResponse;
    console.log('📨 Réponse OpenRouter reçue');

    let answer = '';
    if (data.choices?.[0]?.message?.content) {
      answer = data.choices[0].message.content.trim();
      console.log('✅ Réponse générée:', answer.substring(0, 100) + '...');
    } else {
      console.error('❌ Pas de réponse OpenRouter:', data);

      if (data.error) {
        answer = `⚠️ Erreur OpenRouter: ${data.error.message || 'Erreur inconnue'}. Veuillez réessayer.`;
      } else {
        answer = `Je suis désolé, je n'ai pas pu traiter votre question sur "${bookTitle || 'ce livre'}". Pouvez-vous la reformuler ?`;
      }
    }

    // 🔥 Sauvegarder la conversation (optionnel)
    try {
      await db.run(`
        INSERT INTO agent_conversations (user_email, product_id, question, answer, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [
        email || 'guest', 
        product?.id || null, 
        question, 
        answer
      ]);
      console.log('✅ Conversation sauvegardée');
    } catch (dbError) {
      console.warn('⚠️ Impossible de sauvegarder la conversation:', dbError);
    }

    return NextResponse.json({
      success: true,
      answer: answer,
      product: product ? {
        id: product.id,
        title: product.title
      } : null
    });

  } catch (error) {
    console.error('❌ Erreur question:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du traitement de la question',
      answer: '😅 Oups ! Une erreur est survenue. Veuillez réessayer.'
    }, { status: 500 });
  }
}