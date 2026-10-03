export const dynamic = 'force-dynamic';

// app/api/admin/security/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, verifyToken } from '@/lib/auth';
import { banUser, unbanUser, suspendUser, unsuspendUser } from '@/lib/services/security';

interface SecurityUserBody {
  userId: number | string
  action: 'ban' | 'unban' | 'suspend' | 'unsuspend'
  reason?: string
  duration?: number | string
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const rawAdminId = payload?.userId ?? payload?.id ?? payload?.sub ?? null;
    const adminId = rawAdminId === null ? NaN : Number(rawAdminId);

    if (!rawAdminId || Number.isNaN(adminId) || adminId <= 0) {
      return NextResponse.json({ error: 'Admin non identifié' }, { status: 401 });
    }

    const body = (await request.json()) as SecurityUserBody
    const { userId, action, reason, duration } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // 🔥 Convertir userId en number (l'API attend un number)
    const userIdNum = typeof userId === 'number' ? userId : parseInt(String(userId), 10)

    if (Number.isNaN(userIdNum) || userIdNum <= 0) {
      return NextResponse.json({ error: 'ID utilisateur invalide' }, { status: 400 });
    }

    switch (action) {
      case 'ban':
        if (!reason) return NextResponse.json({ error: 'Motif requis' }, { status: 400 });
        await banUser(userIdNum, reason, adminId);
        break;
      case 'unban':
        await unbanUser(userIdNum, adminId);
        break;
      case 'suspend': {
        if (!reason || !duration) {
          return NextResponse.json({ error: 'Motif et durée requis' }, { status: 400 });
        }

        // 🔥 Convertir duration en number
        const durationNum = typeof duration === 'number'
          ? duration
          : parseInt(String(duration), 10)

        if (Number.isNaN(durationNum) || durationNum <= 0) {
          return NextResponse.json({ error: 'Durée invalide' }, { status: 400 });
        }

        await suspendUser(userIdNum, reason, durationNum, adminId);
        break;
      }
      case 'unsuspend':
        await unsuspendUser(userIdNum, adminId);
        break;
      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Action effectuée avec succès' });
  } catch (error) {
    console.error('❌ Erreur security users:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}