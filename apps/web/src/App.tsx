import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ApiClient } from './api/client';
import { getFirstAllowedPath, hasPathAccess } from './role-permissions';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { ProductsPage } from './pages/ProductsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { FinancesPage } from './pages/FinancesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { UsersPage } from './pages/UsersPage';
import { TerminalsPage } from './pages/TerminalsPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode; title: string; subtitle?: string }> = ({
  children,
  title,
  subtitle,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  useEffect(() => {
    if (isAuthenticated) {
      ApiClient.getCurrentCashSession().then(setActiveSession).catch(() => {});
      ApiClient.getAnomalies('DETECTED').then((res) => setAnomalyCount(res.length)).catch(() => {});
      ApiClient.getLowStock().then((res) => setLowStockCount(res.length)).catch(() => {});
    }
  }, [isAuthenticated, title]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F3F4F6',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Chargement de Smart PME Finance...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPathAccess(location.pathname, user?.role)) {
    return <Navigate to={getFirstAllowedPath(user?.role)} replace />;
  }

  const isPosCashier = new URLSearchParams(window.location.search).get('posMode') === 'cashier';

  if (isPosCashier) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1E293B',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#38BDF8' }}>
              SMART PME
            </span>
            <span style={{
              background: '#0284C7',
              color: 'white',
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              POSTE CAISSE ENREGISTREUSE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>
              Opérateur : <b style={{ color: '#F8FAFC' }}>{user?.firstName} {user?.lastName}</b>
            </span>
            <a
              href="/"
              style={{
                fontSize: '12px',
                color: '#94A3B8',
                textDecoration: 'none',
                background: '#1E293B',
                border: '1px solid #334155',
                padding: '5px 12px',
                borderRadius: '6px',
                fontWeight: 600
              }}
              title="Retourner vers le tableau de bord ERP complet"
            >
              Console ERP
            </a>
          </div>
        </header>

        <main style={{ flex: 1, padding: '16px' }}>{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar anomalyCount={anomalyCount} lowStockCount={lowStockCount} />
      <div className="main-content">
        <Header title={title} subtitle={subtitle} activeSession={activeSession} />
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedLayout
                title="Tableau de bord"
                subtitle="Vue d'ensemble des indicateurs financiers et opérationnels"
              >
                <DashboardPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/sales"
            element={
              <ProtectedLayout
                title="Ventes & Point de vente"
                subtitle="Enregistrement des ventes, facturation directe et gestion des stocks"
              >
                <SalesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedLayout
                title="Produits & Stocks"
                subtitle="Catalogue, prix d'achat/vente, marges et seuils d'alerte"
              >
                <ProductsPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedLayout
                title="Facturation"
                subtitle="Factures, règlements partiels et impression des pièces"
              >
                <InvoicesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/finances"
            element={
              <ProtectedLayout
                title="Caisse & Dépenses"
                subtitle="Gestion de caisse, dépenses et comptes financiers"
              >
                <FinancesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedLayout
                title="Clients"
                subtitle="Fiches clients, encours, limites de crédit et historique"
              >
                <CustomersPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/suppliers"
            element={
              <ProtectedLayout
                title="Fournisseurs"
                subtitle="Gestion des fournisseurs, dettes d'achats et réceptions"
              >
                <SuppliersPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedLayout
                title="Gestion des Rôles & Équipe"
                subtitle="Collaborateurs, attribution des permissions RBAC et accès"
              >
                <UsersPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/terminals"
            element={
              <ProtectedLayout
                title="Supervision & Contrôle à Distance"
                subtitle="Gestion des postes de travail connectés, verrouillage et fermeture forcée à distance"
              >
                <TerminalsPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/anomalies"
            element={
              <ProtectedLayout
                title="Détection des anomalies"
                subtitle="Inspection des anomalies financières, stocks et remises"
              >
                <AnomaliesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedLayout
                title="Paramètres"
                subtitle="Devise, fiscalité, mentions légales et seuils de contrôle"
              >
                <SettingsPage />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
