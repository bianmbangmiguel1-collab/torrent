export const dynamic = 'force-dynamic';

// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, verifyToken } from '@/lib/auth';
import { getUsers, getUserById, createUser, updateUser, deleteUser, getCountries } from '@/lib/services/users';
import { getDB } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ============================================================
// Types
// ============================================================
interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
  is_admin?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  phone?: string;
  country?: string;
  city?: string;
  timezone?: string;
  language?: string;
  currency?: string;
}

interface UpdateUserBody {
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
  is_admin?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  phone?: string;
  country?: string;
  city?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  whatsapp_opt_in?: boolean;
  password?: string;
}

// ============================================================
// GET : Liste des utilisateurs, détail d'un utilisateur, ou liste des pays
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // ✅ Récupération de la liste des pays
    if (action === 'countries') {
      const countries = await getCountries();
      return NextResponse.json({ success: true, countries });
    }

    const id = searchParams.get('id');
    if (id) {
      const userId = Number(id);
      if (isNaN(userId) || userId <= 0) {
        return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
      }
      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
      }
      return NextResponse.json({ success: true, user });
    }

    // Liste paginée
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') as 'admin' | 'user' | 'all' || 'all';
    const status = searchParams.get('status') as 'active' | 'inactive' | 'all' || 'all';
    const country = searchParams.get('country') || '';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

    const data = await getUsers({ search, role, status, country, page, limit });
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// POST : Créer un utilisateur
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body: CreateUserBody = await request.json();
    const { name, email, password, role, is_admin, is_active, is_verified, phone, country, city, timezone, language, currency } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
    }

    const db = await getDB();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });
    }

    const user = await createUser({ name, email, password, role, is_admin, is_active, is_verified, phone, country, city, timezone, language, currency });
    revalidatePath('/admin/users');
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// PUT : Mettre à jour un utilisateur (avec logging adminId)
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // ✅ Récupérer l'ID de l'admin connecté pour le logging
    const payload = await verifyToken(token);
    const rawAdminId = payload?.userId ?? payload?.id ?? payload?.sub ?? null;
    const parsedAdminId = rawAdminId == null ? null : Number(rawAdminId);
    const adminId: number | null = parsedAdminId == null || Number.isNaN(parsedAdminId) ? null : parsedAdminId;

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID manquant (paramètre ?id=...)' }, { status: 400 });
    }
    const userId = Number(id);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const body: UpdateUserBody = await request.json();
    const { name, email, role, is_admin, is_active, is_verified, phone, country, city, timezone, language, currency, whatsapp_opt_in, password } = body;

    const existing = await getUserById(userId);
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    if (email && email !== existing.email) {
      const db = await getDB();
      const conflict = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (conflict) {
        return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });
      }
    }

    // ✅ Appel de updateUser avec adminId
    const updated = await updateUser(
      userId,
      {
        name,
        email,
        role,
        is_admin,
        is_active,
        is_verified,
        phone,
        country,
        city,
        timezone,
        language,
        currency,
        whatsapp_opt_in,
        password,
      },
      adminId
    );

    if (!updated) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
    }

    revalidatePath('/admin/users');
    const user = await getUserById(userId);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('PUT /api/admin/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// DELETE : Supprimer un utilisateur
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID manquant (paramètre ?id=...)' }, { status: 400 });
    }
    const userId = Number(id);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const payload = await verifyToken(token);
    const rawCurrentUserId = payload?.userId ?? payload?.id ?? payload?.sub ?? null;
    const currentUserId = rawCurrentUserId === null ? null : Number(rawCurrentUserId);
    if (currentUserId && currentUserId === userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
    }

    const deleted = await deleteUser(userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    revalidatePath('/admin/users');
    return NextResponse.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('DELETE /api/admin/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}