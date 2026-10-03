// lib/services/rewards.ts
import { getDB } from '@/lib/db';

export interface UserReward {
  id: number;
  user_id: number;
  points: number;
  level: 'standard' | 'pro' | 'vip' | 'premium';
  total_points_earned: number;
  tier_benefits: string | null;
  updated_at: string;
}

// Niveaux et leurs seuils
export const TIER_THRESHOLDS = {
  standard: 0,
  pro: 500,
  vip: 1500,
  premium: 5000,
};

// Avantages par niveau
export const TIER_BENEFITS: Record<string, string> = {
  standard: 'Accès basique',
  pro: '⭐ Réduction 5%, Accès anticipé',
  vip: '⭐ Réduction 10%, Support prioritaire, Accès anticipé',
  premium: '⭐ Réduction 20%, Support VIP, Accès exclusif, Cadeaux',
};

export async function getUserRewards(userId: number): Promise<UserReward | null> {
  const db = await getDB();
  return await db.get<UserReward>(
    'SELECT * FROM user_rewards WHERE user_id = ?',
    [userId]
  ) || null;
}

export async function getOrCreateUserRewards(userId: number): Promise<UserReward> {
  const db = await getDB();
  let reward = await getUserRewards(userId);
  if (!reward) {
    await db.run(
      `INSERT INTO user_rewards (user_id, points, level, total_points_earned, updated_at)
       VALUES (?, 0, 'standard', 0, CURRENT_TIMESTAMP)`,
      [userId]
    );
    reward = await getUserRewards(userId) as UserReward;
  }
  return reward;
}

export async function addPoints(
  userId: number,
  points: number,
  type: string,
  reference: string,
  description: string
): Promise<UserReward> {
  const db = await getDB();
  const reward = await getOrCreateUserRewards(userId);

  // Ajouter la transaction
  await db.run(
    `INSERT INTO user_reward_transactions (user_id, points, type, reference, description, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, points, type, reference, description]
  );

  // Mettre à jour les points
  const newPoints = reward.points + points;
  const totalEarned = reward.total_points_earned + (points > 0 ? points : 0);

  // Déterminer le niveau
  let level: string = 'standard';
  if (newPoints >= TIER_THRESHOLDS.premium) level = 'premium';
  else if (newPoints >= TIER_THRESHOLDS.vip) level = 'vip';
  else if (newPoints >= TIER_THRESHOLDS.pro) level = 'pro';

  await db.run(
    `UPDATE user_rewards 
     SET points = ?, level = ?, total_points_earned = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [newPoints, level, totalEarned, userId]
  );

  return await getUserRewards(userId) as UserReward;
}

export async function getPointsHistory(userId: number, limit: number = 20) {
  const db = await getDB();
  return await db.all(
    `SELECT * FROM user_reward_transactions 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
    [userId, limit]
  );
}