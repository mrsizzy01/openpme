import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { Currency, formatCurrency } from '@smart-pme/shared';
import {
  TrendingUp,
  Receipt,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Package,
  ShoppingCart,
  ExternalLink,
  RefreshCw,
  Monitor,
  FileDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusLabel: Record<string, string> = {
  COMPLETED: 'Complétée',
  PENDING: 'En attente',
  CANCELLED: 'Annulée',
  PARTIAL: 'Partielle',
};

const statusClass: Record<string, string> = {
  COMPLETED: 'badge-success',
  PENDING: 'badge-warning',
  CANCELLED: 'badge-danger',
  PARTIAL: 'badge-info',
};

const severityClass: Record<string, string> = {
  CRITICAL: 'badge-danger',
  HIGH: 'badge-danger',
  MEDIUM: 'badge-warning',
  LOW: 'badge-neutral',
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<Currency | undefined>();
  const [dossierMonths, setDossierMonths] = useState<6 | 12>(12);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadMetrics = async (currency = displayCurrency) => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.getDashboardMetrics(currency);
      setData(res);
      setDisplayCurrency(res.metrics.displayCurrency);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les indicateurs.');
    } finally {
      setLoading(false);
    }
  };

  const downloadBankDossier = async () => {
    try {
      setDossierLoading(true);
      setDossierError(null);
      const pdf = await ApiClient.downloadBankDossier(dossierMonths);
      const url = window.URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dossier-banque-${dossierMonths}-mois.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      setDossierError(err instanceof Error ? err.message : 'Impossible de générer le dossier bancaire.');
    } finally {
      setDossierLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Chargement des indicateurs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ marginBottom: 0 }}>
        <AlertTriangle size={16} className="alert-icon" />
        <div>
          <div className="alert-title">Erreur de chargement</div>
          <div className="alert-body">{error}</div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ marginTop: '8px' }}
            onClick={() => loadMetrics()}
          >
            <RefreshCw size={12} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, recentSales, recentAnomalies } = data;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
            Période du dossier
            <select
              className="input-field"
              style={{ width: '110px' }}
              value={dossierMonths}
              onChange={(event) => setDossierMonths(event.target.value === '6' ? 6 : 12)}
            >
              <option value={12}>12 mois</option>
              <option value={6}>6 mois</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadBankDossier}
            disabled={dossierLoading}
          >
            <FileDown size={15} /> {dossierLoading ? 'Génération...' : 'Dossier Banque'}
          </button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
          Devise d’affichage
          <select
            className="input-field"
            style={{ width: '130px' }}
            value={metrics.displayCurrency}
            onChange={(event) => {
              const currency = event.target.value === Currency.USD ? Currency.USD : Currency.CDF;
              setDisplayCurrency(currency);
              loadMetrics(currency);
            }}
          >
            <option value={Currency.CDF}>CDF</option>
            <option value={Currency.USD}>USD</option>
          </select>
        </label>
      </div>
      {dossierError && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '14px' }}>
          <AlertTriangle size={16} className="alert-icon" />
          <div className="alert-body">{dossierError}</div>
        </div>
      )}
      {/* Bandeau anomalies actives */}
      {metrics.activeAnomaliesCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          <ShieldAlert size={16} className="alert-icon" />
          <div style={{ flex: 1 }}>
            <div className="alert-title">
              {metrics.activeAnomaliesCount} anomalie(s) en attente de traitement
            </div>
            <div className="alert-body">
              Des anomalies ont été détectées automatiquement et nécessitent votre attention.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/anomalies')}
            style={{ flexShrink: 0, alignSelf: 'flex-start' }}
          >
            Voir les alertes <ExternalLink size={12} />
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>CA du jour</span>
            <TrendingUp size={15} color="#2563EB" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.todaySales, metrics.displayCurrency)}
          </div>
          <div className="kpi-sub">{metrics.todaySalesCount} vente(s) aujourd'hui</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Revenus du mois</span>
            <ShoppingCart size={15} color="#0891B2" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.monthlyRevenue, metrics.displayCurrency)}
          </div>
          <div className="kpi-sub">Période en cours (ventes & factures)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Marge nette</span>
            <ArrowUpRight size={15} color={metrics.netMargin >= 0 ? '#16A34A' : '#DC2626'} />
          </div>
          <div className="kpi-value" style={{ color: metrics.netMargin >= 0 ? '#16A34A' : '#DC2626' }}>
            {formatCurrency(metrics.netMargin, metrics.displayCurrency)}
          </div>
          <div className="kpi-sub">Dépenses : {formatCurrency(metrics.monthlyExpenses, metrics.displayCurrency)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Trésorerie</span>
            <Wallet size={15} color="#D97706" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.totalCashBalance, metrics.displayCurrency)}
          </div>
          <div className="kpi-sub">Caisses & comptes bancaires</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Créances clients</span>
            <Receipt size={15} color="#2563EB" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.totalReceivables, metrics.displayCurrency)}
          </div>
          <div className="kpi-sub" style={{ color: metrics.unpaidInvoicesCount > 0 ? '#D97706' : undefined }}>
            {metrics.unpaidInvoicesCount} facture(s) impayée(s)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Dettes fournisseurs</span>
            <ArrowDownRight size={15} color="#DC2626" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.totalPayables, metrics.displayCurrency)}
          </div>
          <div className="kpi-sub">Engagements achats à régulariser</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Stock critique</span>
            <Package size={15} color={metrics.lowStockItemsCount > 0 ? '#DC2626' : '#16A34A'} />
          </div>
          <div className="kpi-value" style={{ color: metrics.lowStockItemsCount > 0 ? '#DC2626' : '#16A34A' }}>
            {metrics.lowStockItemsCount}
          </div>
          <div className="kpi-sub">Articles sous le seuil d'alerte</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Anomalies actives</span>
            <ShieldAlert size={15} color={metrics.activeAnomaliesCount > 0 ? '#D97706' : '#16A34A'} />
          </div>
          <div className="kpi-value" style={{ color: metrics.activeAnomaliesCount > 0 ? '#D97706' : '#16A34A' }}>
            {metrics.activeAnomaliesCount}
          </div>
          <div className="kpi-sub">Détectées, en attente de résolution</div>
        </div>
      </div>

      {/* Barre d'état de contrôle à distance */}
      <div style={{
        background: 'linear-gradient(90deg, #1E293B 0%, #0F172A 100%)',
        color: '#F8FAFC',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '10px',
            borderRadius: '8px',
            color: '#60A5FA',
          }}>
            <Monitor size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Supervision en Direct & Contrôle à Distance des Postes</span>
              <span style={{
                background: '#10B981',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 700,
              }}>
                ACTIF
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '2px' }}>
              Surveillez les terminaux de caisse connectés, verrouillez les écrans ou déclenchez l'arrêt d'urgence à distance.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/terminals')}
          className="btn"
          style={{
            background: '#2563EB',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            fontSize: '13px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Monitor size={15} /> Gérer les Postes & Killswitch <ExternalLink size={13} />
        </button>
      </div>

      {/* Tableaux de bas de page */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
        {/* Ventes récentes */}
        <div className="table-wrapper">
          <div className="table-toolbar">
            <span className="table-toolbar-title">Dernières ventes</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => navigate('/sales')}
            >
              Voir tout <ExternalLink size={12} />
            </button>
          </div>
          <div className="table-container">
            {recentSales.length === 0 ? (
              <div className="table-empty">
                <ShoppingCart className="table-empty-icon" />
                <div className="table-empty-title">Aucune vente enregistrée</div>
                <div className="table-empty-sub">Les ventes apparaîtront ici après enregistrement.</div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/sales')}>
                  Enregistrer une vente
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Vente</th>
                    <th>Client</th>
                    <th>Articles</th>
                    <th className="col-amount">Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale: any) => (
                    <tr key={sale.id}>
                      <td className="col-mono">{sale.saleNumber}</td>
                      <td>{sale.customer?.name || 'Client comptant'}</td>
                      <td>{sale.items?.length || 0}</td>
                      <td className="col-amount">{formatCurrency(Number(sale.total), sale.currency)}</td>
                      <td>
                        <span className={`badge ${statusClass[sale.status] || 'badge-neutral'}`}>
                          {statusLabel[sale.status] || sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Anomalies récentes */}
        <div className="table-wrapper">
          <div className="table-toolbar">
            <span className="table-toolbar-title">Anomalies récentes</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => navigate('/anomalies')}
            >
              Centre d'alertes <ExternalLink size={12} />
            </button>
          </div>
          {recentAnomalies.length === 0 ? (
            <div className="table-empty">
              <ShieldAlert className="table-empty-icon" />
              <div className="table-empty-title">Aucune anomalie détectée</div>
              <div className="table-empty-sub">Le système surveille les opérations en continu.</div>
            </div>
          ) : (
            <div style={{ padding: '4px 0' }}>
              {recentAnomalies.map((anom: any) => (
                <div
                  key={anom.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px 16px',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  <AlertTriangle
                    size={15}
                    style={{ flexShrink: 0, marginTop: '1px' }}
                    color={anom.severity === 'CRITICAL' || anom.severity === 'HIGH' ? '#DC2626' : '#D97706'}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {anom.title}
                      </span>
                      <span className={`badge ${severityClass[anom.severity] || 'badge-neutral'}`} style={{ flexShrink: 0 }}>
                        {anom.severity}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {anom.explanation}
                    </p>
                    <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '3px' }}>
                      Valeur observée : <strong style={{ color: '#D97706' }}>{anom.observedValue}</strong>
                      &nbsp;·&nbsp;{new Date(anom.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bouton actualiser */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => loadMetrics()}>
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>
    </div>
  );
};
