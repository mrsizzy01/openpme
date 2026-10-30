import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const statusLabels: Record<string, string> = {
  DETECTED: 'Détectée',
  UNDER_REVIEW: 'En examen',
  RESOLVED: 'Résolue',
  DISMISSED: 'Classée',
};

const statusClass: Record<string, string> = {
  DETECTED: 'badge-danger',
  UNDER_REVIEW: 'badge-warning',
  RESOLVED: 'badge-success',
  DISMISSED: 'badge-neutral',
};

const severityClass: Record<string, string> = {
  CRITICAL: 'badge-danger',
  HIGH: 'badge-danger',
  MEDIUM: 'badge-warning',
  LOW: 'badge-neutral',
};

const borderColor: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#DC2626',
  MEDIUM: '#D97706',
  LOW: '#94A3B8',
};

export const AnomaliesPage: React.FC = () => {
  const { user } = useAuth();
  const canManageAnomalies = user?.role !== 'AUDITOR';
  const { success, error: toastError } = useToast();
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Modal résolution
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const loadAnomalies = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await ApiClient.getAnomalies(statusFilter || undefined);
      setAnomalies(res);
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les anomalies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, [statusFilter]);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await ApiClient.scanAnomalies();
      const msg = `Scan terminé : ${res.newAlertsCount} nouvelle(s) anomalie(s) identifiée(s).`;
      setScanResult(msg);
      success(msg);
      loadAnomalies();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de l\'inspection des règles.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnomaly || !resolutionNote.trim()) return;
    setSubmittingResolve(true);
    try {
      await ApiClient.resolveAnomaly(selectedAnomaly.id, resolutionNote.trim());
      setSelectedAnomaly(null);
      setResolutionNote('');
      success('Anomalie régularisée et enregistrée.');
      loadAnomalies();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la résolution.');
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!window.confirm('Classer cette alerte sans suite ? Elle sera marquée comme non pertinente.')) return;
    try {
      await ApiClient.dismissAnomaly(id);
      success('Alerte classée sans suite.');
      loadAnomalies();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors du classement.');
    }
  };

  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'DETECTED').length;
  const highCount = anomalies.filter((a) => a.severity === 'HIGH' && a.status === 'DETECTED').length;
  const totalActive = anomalies.filter((a) => a.status === 'DETECTED' || a.status === 'UNDER_REVIEW').length;

  const filterOptions = [
    { value: '', label: 'Toutes' },
    { value: 'DETECTED', label: 'Détectées' },
    { value: 'UNDER_REVIEW', label: 'En examen' },
    { value: 'RESOLVED', label: 'Résolues' },
    { value: 'DISMISSED', label: 'Classées' },
  ];

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: `repeat(${canManageAnomalies ? 4 : 3}, 1fr)`, marginBottom: '20px' }}>
        <div className="kpi-card" style={{ borderTop: '3px solid #DC2626' }}>
          <div className="kpi-label">Critiques</div>
          <div className="kpi-value" style={{ color: criticalCount > 0 ? '#DC2626' : '#111827' }}>{criticalCount}</div>
          <div className="kpi-sub">Action immédiate requise</div>
        </div>
        <div className="kpi-card" style={{ borderTop: '3px solid #D97706' }}>
          <div className="kpi-label">Élevées</div>
          <div className="kpi-value" style={{ color: highCount > 0 ? '#D97706' : '#111827' }}>{highCount}</div>
          <div className="kpi-sub">Écarts & remises anormales</div>
        </div>
        <div className="kpi-card" style={{ borderTop: '3px solid #2563EB' }}>
          <div className="kpi-label">Total actives</div>
          <div className="kpi-value">{totalActive}</div>
          <div className="kpi-sub">À examiner</div>
        </div>
        {canManageAnomalies && (
          <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch' }}>
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {scanning ? (
                <>
                  <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Lancer le scan des règles
                </>
              )}
            </button>
            {scanResult && (
              <div style={{ fontSize: '0.6875rem', color: '#16A34A', marginTop: '6px', textAlign: 'center' }}>{scanResult}</div>
            )}
          </div>
        )}
      </div>

      {/* Filtres par statut */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <button type="button" className="btn btn-sm btn-secondary" onClick={loadAnomalies} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      {/* Liste anomalies */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Chargement...</span>
        </div>
      ) : loadError ? (
        <div className="alert alert-danger">
          <AlertTriangle size={15} className="alert-icon" />
          <div>
            <div className="alert-title">Erreur de chargement</div>
            <div className="alert-body">{loadError}</div>
            <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: '8px' }} onClick={loadAnomalies}>
              <RefreshCw size={12} /> Réessayer
            </button>
          </div>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="card">
          <div className="table-empty" style={{ padding: '60px 24px' }}>
            <CheckCircle className="table-empty-icon" style={{ color: '#16A34A' }} />
            <div className="table-empty-title">Aucune anomalie trouvée</div>
            <div className="table-empty-sub">
              {statusFilter
                ? `Aucune anomalie avec le statut « ${statusLabels[statusFilter] || statusFilter} ».`
                : 'Toutes les opérations sont conformes aux règles configurées.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {anomalies.map((a) => {
            const isResolved = a.status === 'RESOLVED' || a.status === 'DISMISSED';
            const bc = isResolved ? '#16A34A' : borderColor[a.severity] || '#94A3B8';

            return (
              <div
                key={a.id}
                className="card"
                style={{ borderLeft: `4px solid ${bc}` }}
              >
                <div className="card-body">
                  {/* En-tête */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldAlert size={18} color={bc} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>{a.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '1px' }}>
                          Règle : <strong>{a.ruleType}</strong> &nbsp;·&nbsp; {new Date(a.createdAt).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <span className={`badge ${severityClass[a.severity] || 'badge-neutral'}`}>{a.severity}</span>
                      <span className={`badge ${statusClass[a.status] || 'badge-neutral'}`}>{statusLabels[a.status] || a.status}</span>
                    </div>
                  </div>

                  {/* Explication */}
                  <p style={{ fontSize: '0.8125rem', color: '#374151', lineHeight: 1.55, marginBottom: '12px' }}>
                    {a.explanation}
                  </p>

                  {/* Valeurs observées */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    marginBottom: '12px',
                    fontSize: '0.8125rem',
                  }}>
                    <div>
                      <span style={{ color: '#6B7280' }}>Valeur observée : </span>
                      <strong style={{ color: '#DC2626' }}>{a.observedValue || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Seuil attendu : </span>
                      <strong style={{ color: '#16A34A' }}>{a.expectedThreshold || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Entité : </span>
                      <strong style={{ color: '#111827' }}>{a.entityType}</strong>
                    </div>
                  </div>

                  {/* Note de résolution */}
                  {isResolved && a.resolutionNote && (
                    <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                      <CheckCircle size={14} className="alert-icon" />
                      <div>
                        <strong>Résolution</strong>
                        {a.resolvedAt && ` (${new Date(a.resolvedAt).toLocaleDateString('fr-FR')})`} :&nbsp;
                        {a.resolutionNote}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!isResolved && canManageAnomalies && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDismiss(a.id)}
                      >
                        Classer sans suite
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedAnomaly(a);
                          setResolutionNote('');
                        }}
                      >
                        <Check size={13} />
                        Examiner & Régulariser
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal résolution */}
      {selectedAnomaly && canManageAnomalies && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Régularisation de l'anomalie</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedAnomaly(null)}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResolve}>
              <div className="modal-body">
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px', fontSize: '0.875rem' }}>
                    {selectedAnomaly.title}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6B7280', margin: 0 }}>
                    {selectedAnomaly.explanation}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="resolution-note">
                    Commentaire d'audit & mesure corrective <span className="required">*</span>
                  </label>
                  <textarea
                    id="resolution-note"
                    required
                    rows={4}
                    className="input-field"
                    placeholder="Décrivez la cause identifiée et la mesure corrective appliquée..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                  <div className="form-hint">Ce commentaire sera conservé dans le journal d'audit.</div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedAnomaly(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingResolve || !resolutionNote.trim()}
                  className="btn btn-primary"
                >
                  {submittingResolve ? (
                    <>
                      <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Enregistrer la régularisation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
