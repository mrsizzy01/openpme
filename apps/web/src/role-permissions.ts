export const ROLE_ACCESS_BY_PATH: Record<string, readonly string[]> = {
  '/': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
  '/sales': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'CASHIER', 'SALES_REP'],
  '/products': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'INVENTORY_MANAGER', 'ACCOUNTANT'],
  '/invoices': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'],
  '/finances': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'],
  '/customers': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER', 'SALES_REP'],
  '/suppliers': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'ACCOUNTANT', 'INVENTORY_MANAGER', 'PURCHASER'],
  '/anomalies': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER', 'AUDITOR'],
  '/users': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER'],
  '/terminals': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER'],
  '/settings': ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER'],
};

export function hasPathAccess(path: string, role?: string): boolean {
  const allowedRoles = ROLE_ACCESS_BY_PATH[path];
  return Boolean(role && allowedRoles?.includes(role));
}

export function getFirstAllowedPath(role?: string): string {
  return Object.entries(ROLE_ACCESS_BY_PATH).find(([, roles]) => role && roles.includes(role))?.[0] ?? '/login';
}
