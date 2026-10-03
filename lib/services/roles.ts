// lib/services/roles.ts
import { getDB } from '@/lib/db';

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  module: string | null;
  created_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  users_count: number;
}

// ============================================================
// LISTE DES RÔLES (avec nombre d'utilisateurs et permissions)
// ============================================================
export async function getRoles() {
  const db = await getDB();

  const roles = await db.all<Role>(`
    SELECT r.*,
      (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) as users_count
    FROM roles r
    ORDER BY r.id ASC
  `);

  // Récupérer les permissions pour chaque rôle
  for (const role of roles) {
    const permissions = await db.all<Permission>(`
      SELECT p.*
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ?
      ORDER BY p.module ASC, p.name ASC
    `, [role.id]);
    (role as RoleWithPermissions).permissions = permissions;
  }

  return roles as RoleWithPermissions[];
}

// ============================================================
// DÉTAIL D'UN RÔLE (avec ses permissions)
// ============================================================
export async function getRoleById(id: number): Promise<RoleWithPermissions | null> {
  const db = await getDB();

  const role = await db.get<Role>(`
    SELECT r.*,
      (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) as users_count
    FROM roles r
    WHERE r.id = ?
  `, [id]);

  if (!role) return null;

  const permissions = await db.all<Permission>(`
    SELECT p.*
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = ?
    ORDER BY p.module ASC, p.name ASC
  `, [id]);

  return {
    ...role,
    permissions,
    users_count: (role as any).users_count || 0,
  };
}

// ============================================================
// CRÉER UN RÔLE
// ============================================================
export async function createRole(data: { name: string; slug: string; description?: string }) {
  const db = await getDB();
  const result = await db.run(
    `INSERT INTO roles (name, slug, description, created_at, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [data.name, data.slug, data.description || null]
  );
  return await getRoleById(Number(result.lastID ?? 0));
}

// ============================================================
// MODIFIER UN RÔLE
// ============================================================
export async function updateRole(id: number, data: { name?: string; slug?: string; description?: string }) {
  const db = await getDB();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.slug !== undefined) { updates.push('slug = ?'); values.push(data.slug); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }

  if (updates.length === 0) return null;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await db.run(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, values);
  return await getRoleById(id);
}

// ============================================================
// SUPPRIMER UN RÔLE
// ============================================================
export async function deleteRole(id: number): Promise<boolean> {
  const db = await getDB();
  const result = await db.run('DELETE FROM roles WHERE id = ?', [id]);
  return Number(result.changes ?? 0) > 0;
}

// ============================================================
// GÉRER LES PERMISSIONS D'UN RÔLE
// ============================================================
export async function setRolePermissions(roleId: number, permissionIds: number[]) {
  const db = await getDB();

  // Supprimer les anciennes permissions
  await db.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

  // Insérer les nouvelles
  for (const permId of permissionIds) {
    await db.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
  }

  return await getRoleById(roleId);
}

// ============================================================
// LISTE DES PERMISSIONS (groupées par module)
// ============================================================
export async function getAllPermissions() {
  const db = await getDB();
  const permissions = await db.all<Permission>(`
    SELECT * FROM permissions ORDER BY module ASC, name ASC
  `);

  // Grouper par module
  const grouped: Record<string, Permission[]> = {};
  for (const p of permissions) {
    const module = p.module || 'Autres';
    if (!grouped[module]) grouped[module] = [];
    grouped[module].push(p);
  }
  return grouped;
}