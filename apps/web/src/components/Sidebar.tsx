import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LucideIcon,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  Users,
  Truck,
  ShieldAlert,
  UserCheck,
  Monitor,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_ACCESS_BY_PATH } from '../role-permissions';

interface SidebarProps {
  anomalyCount?: number;
  lowStockCount?: number;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badgeKey?: 'stock' | 'anomaly';
  roles?: readonly string[]; // Si vide, accessible à tous
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    exact: true,
    roles: ROLE_ACCESS_BY_PATH['/'],
  },
  {
    to: '/sales',
    label: 'Caisse & Ventes (POS)',
    icon: ShoppingCart,
    roles: ROLE_ACCESS_BY_PATH['/sales'],
  },
  {
    to: '/products',
    label: 'Produits & Stocks',
    icon: Package,
    badgeKey: 'stock',
    roles: ROLE_ACCESS_BY_PATH['/products'],
  },
  {
    to: '/invoices',
    label: 'Facturation & Devis',
    icon: Receipt,
    roles: ROLE_ACCESS_BY_PATH['/invoices'],
  },
  {
    to: '/finances',
    label: 'Trésorerie & Dépenses',
    icon: Wallet,
    roles: ROLE_ACCESS_BY_PATH['/finances'],
  },
  {
    to: '/customers',
    label: 'Clients',
    icon: Users,
    roles: ROLE_ACCESS_BY_PATH['/customers'],
  },
  {
    to: '/suppliers',
    label: 'Fournisseurs',
    icon: Truck,
    roles: ROLE_ACCESS_BY_PATH['/suppliers'],
  },
  {
    to: '/anomalies',
    label: 'Audit & Anomalies',
    icon: ShieldAlert,
    badgeKey: 'anomaly',
    roles: ROLE_ACCESS_BY_PATH['/anomalies'],
  },
  {
    to: '/users',
    label: 'Équipe & Rôles',
    icon: UserCheck,
    roles: ROLE_ACCESS_BY_PATH['/users'],
  },
  {
    to: '/terminals',
    label: 'Postes & Contrôle Distant',
    icon: Monitor,
    roles: ROLE_ACCESS_BY_PATH['/terminals'],
  },
  {
    to: '/settings',
    label: 'Paramètres PME',
    icon: Settings,
    roles: ROLE_ACCESS_BY_PATH['/settings'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ anomalyCount = 0, lowStockCount = 0 }) => {
  const { user, organization, logout } = useAuth();

  const userRole = user?.role || 'CASHIER';

  // Filtrage strict par RBAC
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(userRole);
  });

  const getBadge = (item: NavItem) => {
    if (item.badgeKey === 'anomaly' && anomalyCount > 0) return { count: anomalyCount, type: '' };
    if (item.badgeKey === 'stock' && lowStockCount > 0) return { count: lowStockCount, type: 'warning' };
    return null;
  };

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') || '?';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <Building2 size={18} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="sidebar-brand-name">{organization?.name || 'Smart PME'}</div>
          <div className="sidebar-org">
            {organization?.country || 'RDC'} · {organization?.settings?.primaryCurrency || 'CDF'}
          </div>
        </div>
      </div>

      {/* Navigation filtrée par rôle */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu Principal</div>
        {visibleNavItems.map((item) => {
          const badge = getBadge(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <item.icon className="sidebar-link-icon" size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge && (
                <span className={`sidebar-link-badge${badge.type ? ` ${badge.type}` : ''}`}>
                  {badge.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Pied : utilisateur avec badge de rôle */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="sidebar-user-role" style={{ color: '#38BDF8', fontWeight: 600 }}>
              {userRole}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn-logout"
            title="Se déconnecter"
            type="button"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
