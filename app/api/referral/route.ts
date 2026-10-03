export const dynamic = 'force-dynamic';

// app/api/referral/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { randomBytes } from 'crypto'

// ============================================================
// TYPES
// ============================================================

interface UseReferralBody {
  referral_code: string
  user_id: number | string
}

interface ValidateRewardBody {
  transaction_id: number | string
}

// ============================================================
// GET : Récupérer les données de parrainage
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token invalide' 
      }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non identifié' 
      }, { status: 401 })
    }

    const db = await getDB()

    // 🔥 Récupérer l'utilisateur avec son code de parrainage
    const user = await db.get(`
      SELECT 
        id,
        name,
        email,
        referral_code,
        referred_by,
        referral_rewards,
        created_at
      FROM users
      WHERE id = ?
    `, [userId])

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 })
    }

    // 🔥 Générer un code de parrainage s'il n'existe pas
    if (!user.referral_code) {
      let code = 'REF-' + randomBytes(6).toString('hex').toUpperCase()
      // Vérifier l'unicité
      let exists = await db.get(
        'SELECT id FROM users WHERE referral_code = ?',
        [code]
      )
      while (exists) {
        code = 'REF-' + randomBytes(6).toString('hex').toUpperCase()
        exists = await db.get(
          'SELECT id FROM users WHERE referral_code = ?',
          [code]
        )
      }
      await db.run(
        'UPDATE users SET referral_code = ? WHERE id = ?',
        [code, userId]
      )
      user.referral_code = code
    }

    // 🔥 Compter les filleuls
    const referralsCount = await db.get(`
      SELECT COUNT(*) as count FROM users WHERE referred_by = ?
    `, [userId])

    // 🔥 Récupérer les filleuls avec leurs statistiques
    const referrals = await db.all(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.referral_rewards,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id AND status IN ('completed', 'paid')) as orders_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = u.id AND status IN ('completed', 'paid')) as total_spent,
        (SELECT created_at FROM orders WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_order_at
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `, [userId])

    // 🔥 Récupérer les transactions de récompenses
    const transactions = await db.all(`
      SELECT 
        id,
        referred_id,
        amount,
        status,
        created_at,
        (SELECT name FROM users WHERE id = referred_id) as referred_name
      FROM referral_transactions
      WHERE referrer_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId])

    // 🔥 Calculer les récompenses totales
    const totalRewards = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total FROM referral_transactions 
      WHERE referrer_id = ? AND status = 'completed'
    `, [userId])

    // 🔥 Déterminer le niveau
    const totalReferrals = referralsCount?.count || 0
    let level = 'Bronze'
    let nextLevel = 5
    let progress = 0

    if (totalReferrals >= 50) {
      level = 'Diamant'
      nextLevel = 0
      progress = 100
    } else if (totalReferrals >= 25) {
      level = 'Platine'
      nextLevel = 50
      progress = (totalReferrals / 50) * 100
    } else if (totalReferrals >= 10) {
      level = 'Or'
      nextLevel = 25
      progress = (totalReferrals / 25) * 100
    } else if (totalReferrals >= 5) {
      level = 'Argent'
      nextLevel = 10
      progress = (totalReferrals / 10) * 100
    } else {
      level = 'Bronze'
      nextLevel = 5
      progress = (totalReferrals / 5) * 100
    }

    // 🔥 Bonus par niveau
    const levelBonuses = {
      'Bronze': 500,
      'Argent': 1000,
      'Or': 2000,
      'Platine': 5000,
      'Diamant': 10000
    }

    return NextResponse.json({
      success: true,
      referral: {
        code: user.referral_code,
        total_referrals: totalReferrals,
        total_rewards: totalRewards?.total || 0,
        level: level,
        next_level: nextLevel,
        progress: Math.min(progress, 100),
        bonus_per_referral: 500,
        level_bonus: levelBonuses[level as keyof typeof levelBonuses] || 500,
        referrals: referrals || [],
        transactions: transactions || [],
        share_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?ref=${user.referral_code}`
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/referral:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
}

// ============================================================
// POST : Utiliser un code de parrainage (inscription)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UseReferralBody
    const { referral_code, user_id } = body

    if (!referral_code || !user_id) {
      return NextResponse.json({ 
        error: 'Code de parrainage et ID utilisateur requis' 
      }, { status: 400 })
    }

    const db = await getDB()

    // Vérifier si l'utilisateur existe
    const user = await db.get(
      'SELECT id, referred_by FROM users WHERE id = ?',
      [user_id]
    )

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (user.referred_by) {
      return NextResponse.json({ 
        error: 'Vous avez déjà un parrain' 
      }, { status: 400 })
    }

    // Trouver le parrain
    const referrer = await db.get(
      'SELECT id, name, email FROM users WHERE referral_code = ?',
      [referral_code]
    )

    if (!referrer) {
      return NextResponse.json({ 
        error: 'Code de parrainage invalide' 
      }, { status: 404 })
    }

    if (referrer.id === user_id) {
      return NextResponse.json({ 
        error: 'Vous ne pouvez pas vous parrainer vous-même' 
      }, { status: 400 })
    }

    // 🔥 Mettre à jour l'utilisateur
    await db.run(
      'UPDATE users SET referred_by = ? WHERE id = ?',
      [referrer.id, user_id]
    )

    // 🔥 Créer une transaction de récompense
    const bonusAmount = 500 // 500 FCFA par filleul
    await db.run(`
      INSERT INTO referral_transactions (referrer_id, referred_id, amount, status)
      VALUES (?, ?, ?, 'pending')
    `, [referrer.id, user_id, bonusAmount])

    // 🔥 Ajouter une notification au parrain
    await db.run(`
      INSERT INTO notifications (user_id, type, title, message, created_at)
      VALUES (?, 'referral', '🎉 Nouveau filleul !', 
        '${user.name || 'Un utilisateur'} s\'est inscrit avec votre code de parrainage. Vous recevrez ${bonusAmount} FCFA après sa première commande.',
        CURRENT_TIMESTAMP)
    `, [referrer.id])

    return NextResponse.json({
      success: true,
      message: 'Code de parrainage appliqué avec succès !',
      referrer: {
        id: referrer.id,
        name: referrer.name,
        email: referrer.email
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur POST /api/referral:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH : Valider une récompense (après commande)
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = (await request.json()) as ValidateRewardBody
    const { transaction_id } = body

    if (!transaction_id) {
      return NextResponse.json({ error: 'ID transaction requis' }, { status: 400 })
    }

    const db = await getDB()

    // Vérifier la transaction
    const transaction = await db.get(`
      SELECT * FROM referral_transactions WHERE id = ?
    `, [transaction_id])

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 })
    }

    if (transaction.status === 'completed') {
      return NextResponse.json({ error: 'Transaction déjà validée' }, { status: 400 })
    }

    // 🔥 Valider la transaction
    await db.run(`
      UPDATE referral_transactions SET status = 'completed' WHERE id = ?
    `, [transaction_id])

    // 🔥 Mettre à jour les récompenses du parrain
    await db.run(`
      UPDATE users SET referral_rewards = referral_rewards + ? WHERE id = ?
    `, [transaction.amount, transaction.referrer_id])

    return NextResponse.json({
      success: true,
      message: 'Récompense validée avec succès'
    })
    
  } catch (error) {
    console.error('❌ Erreur PATCH /api/referral:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS : CORS
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}