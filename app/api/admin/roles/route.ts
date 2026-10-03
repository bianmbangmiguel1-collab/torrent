export const dynamic = 'force-dynamic';

// app/api/admin/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getRoles, createRole, getAllPermissions } from '@/lib/services/roles';
import { revalidatePath } from 'next/cache';

interface CreateRoleBody {
  name: string
  slug: string
  description?: string
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'roles';

    if (type === 'permissions') {
      const permissions = await getAllPermissions();
      return NextResponse.json({ success: true, permissions });
    }

    const roles = await getRoles();
    return NextResponse.json({ success: true, roles });
  } catch (error) {
    console.error('GET /api/admin/roles error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as CreateRoleBody;
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nom et slug requis' }, { status: 400 });
    }

    const role = await createRole({ name, slug, description });
    revalidatePath('/admin/roles');
    return NextResponse.json({ success: true, role }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/roles error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}