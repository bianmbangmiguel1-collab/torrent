export const dynamic = 'force-dynamic';

// app/api/admin/roles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getRoleById, updateRole, deleteRole, setRolePermissions } from '@/lib/services/roles';
import { revalidatePath } from 'next/cache';

interface UpdateRoleBody {
  name?: string
  slug?: string
  description?: string
  permissionIds?: Array<number | string>
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = Number(params.id);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const role = await getRoleById(id);
    if (!role) {
      return NextResponse.json({ error: 'Rôle non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('GET /api/admin/roles/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = Number(params.id);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateRoleBody;
    const { name, slug, description, permissionIds } = body;

    // Mettre à jour le rôle
    if (name || slug || description !== undefined) {
      await updateRole(id, { name, slug, description });
    }

    // Mettre à jour les permissions
    if (permissionIds && Array.isArray(permissionIds)) {
      const permissionIdsNum = permissionIds.map(Number)

      await setRolePermissions(id, permissionIdsNum)
    }

    const role = await getRoleById(id);
    revalidatePath('/admin/roles');
    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('PUT /api/admin/roles/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = Number(params.id);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const deleted = await deleteRole(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Rôle non trouvé' }, { status: 404 });
    }

    revalidatePath('/admin/roles');
    return NextResponse.json({ success: true, message: 'Rôle supprimé' });
  } catch (error) {
    console.error('DELETE /api/admin/roles/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}