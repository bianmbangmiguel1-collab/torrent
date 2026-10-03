// lib/security/permissions.ts

// ⭐ Rôles et permissions
export enum Role {
  SUPER_ADMIN = 'super_admin',
  PAYMENT_ADMIN = 'payment_admin',
  ORDER_MANAGER = 'order_manager',
  SUPPORT = 'support',
  ANALYST = 'analyst',
}

export enum Permission {
  // Paiements
  VIEW_PAYMENTS = 'view_payments',
  CONFIGURE_PAYMENTS = 'configure_payments',
  PROCESS_REFUNDS = 'process_refunds',
  
  // Commandes
  VIEW_ORDERS = 'view_orders',
  UPDATE_ORDERS = 'update_orders',
  CANCEL_ORDERS = 'cancel_orders',
  COMPLETE_ORDERS = 'complete_orders',
  
  // Utilisateurs
  VIEW_USERS = 'view_users',
  UPDATE_USERS = 'update_users',
  DELETE_USERS = 'delete_users',
  
  // Produits
  VIEW_PRODUCTS = 'view_products',
  UPDATE_PRODUCTS = 'update_products',
  
  // Configuration
  VIEW_CONFIG = 'view_config',
  UPDATE_CONFIG = 'update_config',
  
  // Secrets
  ACCESS_SECRETS = 'access_secrets',
  
  // Audit
  VIEW_AUDIT_LOGS = 'view_audit_logs',
}

// ⭐ Mapping des rôles vers les permissions
export const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    Permission.VIEW_PAYMENTS,
    Permission.CONFIGURE_PAYMENTS,
    Permission.PROCESS_REFUNDS,
    Permission.VIEW_ORDERS,
    Permission.UPDATE_ORDERS,
    Permission.CANCEL_ORDERS,
    Permission.COMPLETE_ORDERS,
    Permission.VIEW_USERS,
    Permission.UPDATE_USERS,
    Permission.DELETE_USERS,
    Permission.VIEW_PRODUCTS,
    Permission.UPDATE_PRODUCTS,
    Permission.VIEW_CONFIG,
    Permission.UPDATE_CONFIG,
    Permission.ACCESS_SECRETS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [Role.PAYMENT_ADMIN]: [
    Permission.VIEW_PAYMENTS,
    Permission.CONFIGURE_PAYMENTS,
    Permission.PROCESS_REFUNDS,
    Permission.VIEW_ORDERS,
    Permission.UPDATE_ORDERS,
    Permission.COMPLETE_ORDERS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [Role.ORDER_MANAGER]: [
    Permission.VIEW_ORDERS,
    Permission.UPDATE_ORDERS,
    Permission.CANCEL_ORDERS,
    Permission.COMPLETE_ORDERS,
  ],
  [Role.SUPPORT]: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_USERS,
  ],
  [Role.ANALYST]: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_PAYMENTS,
  ],
};

// ⭐ Vérifier si un utilisateur a une permission
export function hasPermission(
  role: Role | string,
  permission: Permission
): boolean {
  const permissions = rolePermissions[role as Role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

// ⭐ Vérifier si un rôle est supérieur ou égal à un autre
export function isRoleAtLeast(role: Role | string, minRole: Role): boolean {
  const roleHierarchy = [
    Role.ANALYST,
    Role.SUPPORT,
    Role.ORDER_MANAGER,
    Role.PAYMENT_ADMIN,
    Role.SUPER_ADMIN,
  ];
  
  const userRoleIndex = roleHierarchy.indexOf(role as Role);
  const minRoleIndex = roleHierarchy.indexOf(minRole);
  
  return userRoleIndex >= minRoleIndex;
}

// ⭐ Middleware de permission
export function requirePermission(permission: Permission) {
  return (role: Role | string): boolean => {
    return hasPermission(role, permission);
  };
}