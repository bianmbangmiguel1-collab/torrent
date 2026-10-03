// app/api/agent/daily-recommendation/route.ts
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
      content?: string;
    };
  }>;
}

interface DailyRecommendationRequest {
  email?: string;
}

interface DuckDuckGoResponse {
  AbstractText?: string;
  Infobox?: {
    content?: Array<{
      label?: string;
      value?: string;
    }>;
  };
  RelatedTopics?: Array<{
    Text?: string;
  }>;
}

// 🔥 Fonction de recherche internet (DuckDuckGo)
async function searchInternet(query: string): Promise<string> {
  try {
    // Utiliser DuckDuckGo Instant Answer API
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TorrentTwistBot/1.0)'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ DuckDuckGo API error: ${response.status}`);
      return '';
    }
    
    const data = (await response.json()) as DuckDuckGoResponse;
    
    // Récupérer l'abstract (résumé)
    let result = '';
    
    if (data.AbstractText) {
      result += data.AbstractText + ' ';
    }
    
    // Récupérer les infobox (informations structurées)
    if (data.Infobox && data.Infobox.content) {
      const infoboxText = data.Infobox.content
        .filter((item) => item.label && item.value)
        .map((item) => `${item.label}: ${item.value}`)
        .join(' ');
      result += infoboxText + ' ';
    }
    
    // Récupérer les related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const relatedTexts = data.RelatedTopics
        .filter((topic) => topic.Text)
        .slice(0, 3)
        .map((topic) => topic.Text)
        .join(' ');
      result += relatedTexts + ' ';
    }
    
    // Si pas de résultat, essayer une recherche web simplifiée
    if (!result.trim()) {
      const webSearchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' résumé')}&format=json&no_html=1`;
      const webResponse = await fetch(webSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TorrentTwistBot/1.0)'
        }
      });
      
      if (webResponse.ok) {
        const webData = (await webResponse.json()) as DuckDuckGoResponse;
        if (webData.AbstractText) {
          result = webData.AbstractText;
        }
      }
    }
    
    // Nettoyer le résultat
    result = result.replace(/\s+/g, ' ').trim();
    
    // Limiter la longueur
    if (result.length > 1000) {
      result = result.substring(0, 1000) + '...';
    }
    
    console.log(`🔍 Recherche internet pour "${query}": ${result.length} caractères trouvés`);
    return result;
    
  } catch (error) {
    console.error('❌ Erreur recherche internet:', error);
    return '';
  }
}

// 🔥 Fonction pour enrichir avec une recherche ciblée
async function enrichWithInternetSearch(title: string, type: string): Promise<{
  searchResult: string;
  additionalInfo: string;
}> {
  const searchTerms = [
    `${title} ${type} résumé`,
    `${title} ${type} avis`,
    `${title} ${type} description`,
    `${title} ${type} critique`
  ];
  
  let combinedResult = '';
  
  for (const term of searchTerms) {
    const result = await searchInternet(term);
    if (result && result.length > 20) {
      combinedResult += result + ' ';
      // Si on a déjà assez d'infos, on s'arrête
      if (combinedResult.length > 500) break;
    }
    // Petit délai pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Si on a trouvé des infos, on les nettoie et on les formate
  let additionalInfo = '';
  if (combinedResult.trim()) {
    additionalInfo = `🔎 **Informations trouvées sur internet** :\n${combinedResult.trim()}`;
  }
  
  return {
    searchResult: combinedResult.trim(),
    additionalInfo
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as DailyRecommendationRequest;
    const db = await getDB();

    // 🔥 Récupérer UNIQUEMENT les produits de type 'file'
    const products = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.description,
        p.content,
        p.type,
        p.category_id,
        c.name as category_name,
        pi.url as image,
        p.created_at,
        p.slug,
        p.author,
        p.published_at,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') as avg_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
      WHERE p.status = 'published'
        AND p.type = 'file'
      ORDER BY p.created_at DESC
    `);

    console.log(`📚 ${products.length} produits de type 'file' trouvés`);

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        error: '📚 Aucun fichier disponible pour le moment. Revenez plus tard !',
        agent_message: '📚 Je suis désolé, mais je n\'ai trouvé aucun fichier à vous recommander aujourd\'hui. Revenez demain !'
      });
    }

    // Sélectionner un produit pour aujourd'hui (basé sur l'email)
    const today = new Date().toDateString();
    const seed = (email || 'guest') + today;
    const seedHash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedIndex = seedHash % products.length;
    const selectedProduct = products[selectedIndex];

    // Déterminer le type de produit
    const productType = selectedProduct.type || 'file';
    const typeLabel = 'fichier';
    
    // 🔥 RECHERCHE INTERNET
    console.log(`🔍 Recherche internet pour: "${selectedProduct.title}" (${typeLabel})`);
    
    const internetSearchResult = await enrichWithInternetSearch(
      selectedProduct.title,
      typeLabel
    );
    
    console.log(`✅ Recherche internet: ${internetSearchResult.searchResult.length} caractères`);

    // Contenu à analyser (priorité: description > content > titre)
    const content = selectedProduct.description || selectedProduct.content || selectedProduct.title;
    const excerpt = content.length > 800 
      ? content.substring(0, 800) + '...' 
      : content;

    let analysis = '';
    let teaser = '';
    let explanation = '';
    let questions: string[] = [];
    let funFact = '';
    let similarProducts: string[] = [];

    if (OPENROUTER_API_KEY) {
      try {
        // 🔥 Construction du prompt enrichi avec les recherches internet
        let enrichedContext = `Titre : "${selectedProduct.title}"`;
        
        if (selectedProduct.description) {
          enrichedContext += `\nDescription : ${selectedProduct.description}`;
        }
        
        if (selectedProduct.author) {
          enrichedContext += `\nAuteur : ${selectedProduct.author}`;
        }
        
        if (selectedProduct.category_name) {
          enrichedContext += `\nCatégorie : ${selectedProduct.category_name}`;
        }
        
        // 🔥 Ajouter les résultats de recherche internet si disponibles
        if (internetSearchResult.searchResult) {
          enrichedContext += `\n\n🔎 **Résultats de recherche** :\n${internetSearchResult.searchResult}`;
        }
        
        // Si on a très peu d'infos, on génère des infos fictives mais crédibles
        if (!selectedProduct.description && !internetSearchResult.searchResult) {
          enrichedContext += `\n\n(Note: Pas d'information disponible, utilise ta créativité pour décrire ce ${typeLabel} de manière intéressante)`;
        }

        // 🔥 Analyse enrichie
        const analysisPrompt = `
Tu es un bibliothécaire passionné.

Voici un ${typeLabel} :
${enrichedContext}

Fais une ANALYSE captivante de ce ${typeLabel} en français en 100-150 mots.
1. Présente ce ${typeLabel} de manière intrigante
2. Explique ce qu'il apporte et à qui il s'adresse
3. Pourquoi il est intéressant et unique
4. Si tu as des informations de recherche, utilise-les pour enrichir ta présentation

Sois chaleureux, enthousiaste et donne envie de le découvrir.
`;

        const analysisResponse = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://torrenttwist.com',
            'X-Title': 'TorrentTwist Newsletter Agent'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'Tu es un bibliothécaire passionné qui analyse des produits pour donner envie de les découvrir.'
              },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.8,
            max_tokens: 450,
          })
        });

        const analysisData = await analysisResponse.json() as OpenRouterResponse;
        if (analysisData.choices && analysisData.choices[0]) {
          analysis = analysisData.choices[0].message?.content?.trim() || '';
        }

        // 🔥 Teaser enrichi
        const teaserPrompt = `
Génère un TEASER de 25-35 mots en français pour ce ${typeLabel} :
Titre : "${selectedProduct.title}"
${internetSearchResult.searchResult ? `\nInformations : ${internetSearchResult.searchResult.substring(0, 200)}` : ''}
Sois intrigant et donne envie de le découvrir.
`;

        const teaserResponse = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://torrenttwist.com',
            'X-Title': 'TorrentTwist Newsletter Agent'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'Tu es un expert en marketing. Tu crées des accroches irrésistibles.'
              },
              { role: 'user', content: teaserPrompt }
            ],
            temperature: 0.9,
            max_tokens: 100,
          })
        });

        const teaserData = await teaserResponse.json() as OpenRouterResponse;
        if (teaserData.choices && teaserData.choices[0]) {
          teaser = teaserData.choices[0].message?.content?.trim() || '';
        }

        // 🔥 Explication enrichie
        const explanationPrompt = `
Explique en 50-70 mots en français ce ${typeLabel} à un ami.
Titre : "${selectedProduct.title}"
${internetSearchResult.searchResult ? `\nInfos disponibles : ${internetSearchResult.searchResult.substring(0, 150)}` : ''}
Sois clair, intéressant et donne envie d'en savoir plus.
`;

        const explanationResponse = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://torrenttwist.com',
            'X-Title': 'TorrentTwist Newsletter Agent'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'Tu es un bibliothécaire passionné.'
              },
              { role: 'user', content: explanationPrompt }
            ],
            temperature: 0.8,
            max_tokens: 150,
          })
        });

        const explanationData = await explanationResponse.json() as OpenRouterResponse;
        if (explanationData.choices && explanationData.choices[0]) {
          explanation = explanationData.choices[0].message?.content?.trim() || '';
        }

        // 🔥 Questions enrichies
        const questionsPrompt = `
Génère 3 questions intrigantes sur ce ${typeLabel} pour engager une discussion.
Titre : "${selectedProduct.title}"
${internetSearchResult.searchResult ? `\nContexte : ${internetSearchResult.searchResult.substring(0, 150)}` : ''}

Format : une question par ligne.
`;

        const questionsResponse = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://torrenttwist.com',
            'X-Title': 'TorrentTwist Newsletter Agent'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'Tu poses des questions qui font réfléchir.'
              },
              { role: 'user', content: questionsPrompt }
            ],
            temperature: 0.9,
            max_tokens: 200,
          })
        });

        const questionsData = await questionsResponse.json() as OpenRouterResponse;
        if (questionsData.choices && questionsData.choices[0]) {
          const qText = questionsData.choices[0].message?.content?.trim() || '';
          questions = qText.split('\n').filter((q: string) => q.trim().length > 10);
          if (questions.length === 0) {
            questions = [
              `Qu'est-ce qui rend "${selectedProduct.title}" si intéressant ?`,
              `À qui ce ${typeLabel} est-il destiné ?`,
              `En quoi ce ${typeLabel} est-il différent ?`
            ];
          }
        }

        // 🔥 Fun Fact enrichi
        const funFactPrompt = `
Donne un FUN FACT (anecdote intéressante) sur ce ${typeLabel} :
Titre : "${selectedProduct.title}"
${internetSearchResult.searchResult ? `\nInspiration : ${internetSearchResult.searchResult.substring(0, 100)}` : ''}
15-20 mots maximum.
`;

        const funFactResponse = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://torrenttwist.com',
            'X-Title': 'TorrentTwist Newsletter Agent'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'Tu connais des anecdotes fascinantes.'
              },
              { role: 'user', content: funFactPrompt }
            ],
            temperature: 0.9,
            max_tokens: 60,
          })
        });

        const funFactData = await funFactResponse.json() as OpenRouterResponse;
        if (funFactData.choices && funFactData.choices[0]) {
          funFact = funFactData.choices[0].message?.content?.trim() || '';
        }

        // 🔥 Produits similaires enrichis
        const similarPrompt = `
Donne 2-3 titres de ${typeLabel}s similaires à "${selectedProduct.title}" :
${internetSearchResult.searchResult ? `\nContexte : ${internetSearchResult.searchResult.substring(0, 100)}` : ''}
Format : titres séparés par des virgules.
`;

        const similarResponse = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://torrenttwist.com',
            'X-Title': 'TorrentTwist Newsletter Agent'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'Tu connais les produits similaires.'
              },
              { role: 'user', content: similarPrompt }
            ],
            temperature: 0.7,
            max_tokens: 60,
          })
        });

        const similarData = await similarResponse.json() as OpenRouterResponse;
        if (similarData.choices && similarData.choices[0]) {
          const sText = similarData.choices[0].message?.content?.trim() || '';
          similarProducts = sText.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 2);
        }

      } catch (aiError) {
        console.error('Erreur OpenRouter:', aiError);
        // 🔥 Fallback avec les informations de recherche
        const fallbackInfo = internetSearchResult.searchResult || `"${selectedProduct.title}" est un ${typeLabel} fascinant à découvrir.`;
        
        analysis = fallbackInfo.length > 100 ? fallbackInfo.substring(0, 300) : `"${selectedProduct.title}" est un ${typeLabel} fascinant à découvrir.`;
        teaser = `"${selectedProduct.title}" : un ${typeLabel} qui va vous être utile !`;
        explanation = `Ce ${typeLabel} offre des fonctionnalités intéressantes.`;
        questions = [
          `Qu'est-ce qui rend "${selectedProduct.title}" si spécial ?`,
          `À qui ce ${typeLabel} est-il destiné ?`,
          `Pourquoi ce ${typeLabel} est-il intéressant ?`
        ];
        funFact = `Un ${typeLabel} qui a reçu des retours positifs.`;
        similarProducts = ['Autres fichiers de la même catégorie'];
      }
    } else {
      // 🔥 Pas de clé API - utiliser les résultats de recherche
      const fallbackInfo = internetSearchResult.searchResult || `"${selectedProduct.title}" est un ${typeLabel} exceptionnel à découvrir.`;
      
      analysis = fallbackInfo.length > 100 ? fallbackInfo.substring(0, 300) : `"${selectedProduct.title}" est un ${typeLabel} exceptionnel à découvrir.`;
      teaser = `Découvrez "${selectedProduct.title}", un ${typeLabel} qui vous sera utile.`;
      explanation = `Un ${typeLabel} captivant qui mérite toute votre attention.`;
      questions = [
        `Pourquoi ce ${typeLabel} est-il unique ?`,
        `Quelle est son utilité principale ?`,
        `En quoi ce ${typeLabel} est-il différent ?`
      ];
      funFact = `Un ${typeLabel} qui a reçu des critiques élogieuses.`;
      similarProducts = ['Autres fichiers de la même catégorie'];
    }

    // Messages personnalisés
    const agentMessages = [
      `📚 Aujourd'hui, je vous invite à découvrir un ${typeLabel} fascinant : "${selectedProduct.title}". Laissez-moi vous en parler...`,
      `✨ J'ai trouvé une pépite ! "${selectedProduct.title}" est un véritable bijou.`,
      `🌟 Ma découverte du jour : "${selectedProduct.title}". Ce ${typeLabel} est une source d'inspiration incroyable !`,
      `📖 Je suis tombé amoureux de ce ${typeLabel} ! "${selectedProduct.title}" m'a tellement marqué...`,
      `🔥 Coup de cœur du jour ! "${selectedProduct.title}" m'a emballé. Voici ce que j'en pense...`
    ];

    const agentMessage = agentMessages[selectedIndex % agentMessages.length];

    // 🔥 Ajouter des informations sur la recherche internet
    const searchInfo = internetSearchResult.searchResult ? {
      internet_search_used: true,
      search_result_length: internetSearchResult.searchResult.length,
      search_snippet: internetSearchResult.searchResult.substring(0, 200) + '...'
    } : {
      internet_search_used: false,
      search_result_length: 0,
      search_snippet: null
    };

    return NextResponse.json({
      success: true,
      recommendation: {
        id: selectedProduct.id,
        title: selectedProduct.title,
        description: selectedProduct.description || `Un ${typeLabel} captivant à découvrir`,
        author: selectedProduct.author || null,
        category: selectedProduct.category_name || 'Fichier',
        image: selectedProduct.image,
        content_excerpt: excerpt || selectedProduct.title,
        ai_explanation: analysis,
        teaser: teaser,
        questions: questions,
        slug: selectedProduct.slug,
        fun_fact: funFact || null,
        similar_products: similarProducts,
        type: selectedProduct.type || 'file',
        stats: {
          review_count: selectedProduct.review_count || 0,
          avg_rating: selectedProduct.avg_rating ? Number(selectedProduct.avg_rating).toFixed(1) : null,
          published_at: selectedProduct.published_at || null
        },
        analysis_ready: true,
        analysis_date: new Date().toISOString(),
        // 🔥 Ajout des infos de recherche
        internet_search: searchInfo
      },
      agent_message: agentMessage,
      product_count: products.length,
      analysis_info: {
        done: true,
        date: new Date().toISOString(),
        next_analysis: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_new_release: selectedProduct.created_at ? 
          new Date(selectedProduct.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false,
        internet_search_used: !!internetSearchResult.searchResult
      }
    });

  } catch (error) {
    console.error('❌ Erreur recommandation:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la génération de la recommandation',
      agent_message: '😅 Oups ! Une erreur est survenue. Veuillez réessayer.'
    }, { status: 500 });
  }
}