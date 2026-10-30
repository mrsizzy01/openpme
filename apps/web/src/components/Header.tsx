import React, { useEffect, useState } from 'react';
import { Wallet, DollarSign, Plus, Wifi, WifiOff, RefreshCw, Edit3, X, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { offlineSync } from '../services/offlineSync';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSaleClick?: () => void;
  activeSession?: any;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewSaleClick,
  activeSession,
}) => {
  const { organization, user, updateExchangeRate } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [pendingSyncError, setPendingSyncError] = useState('');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reviewOperations, setReviewOperations] = useState<Awaited<ReturnType<typeof offlineSync.getReviewOperations>>>([]);
  const [conflictLog, setConflictLog] = useState<Awaited<ReturnType<typeof offlineSync.getConflictLog>>>([]);
  const [showOfflineReview, setShowOfflineReview] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRateInput, setNewRateInput] = useState('');
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  const canManageRate = user?.role === 'ORG_OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    let active = true;
    const refreshOfflineState = async () => {
      try {
        const snapshot = await offlineSync.getSnapshot();
        if (!active) return;
        setIsOnline(snapshot.isOnline);
        setPendingSyncCount(snapshot.pendingCount);
        setPendingReviewCount(snapshot.reviewCount);
        setIsSyncing(snapshot.status === 'syncing');
        setPendingSyncError(await offlineSync.getPendingSyncError());
      } catch (error) {
        if (active) setPendingSyncError(error instanceof Error ? error.message : 'État hors-ligne indisponible.');
      }
    };
    const handleOnline = () => void refreshOfflineState();
    const handleOffline = () => void refreshOfflineState();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineSync.subscribe(() => void refreshOfflineState());
    void refreshOfflineState();

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await offlineSync.syncPendingSales();
    } finally {
      setIsSyncing(false);
      const snapshot = await offlineSync.getSnapshot();
      setPendingSyncCount(snapshot.pendingCount);
      setPendingReviewCount(snapshot.reviewCount);
      setPendingSyncError(await offlineSync.getPendingSyncError());
    }
  };

  const openOfflineReview = async () => {
    const [operations, conflicts] = await Promise.all([
      offlineSync.getReviewOperations(),
      offlineSync.getConflictLog(),
    ]);
    setReviewOperations(operations);
    setConflictLog(conflicts);
    setShowOfflineReview(true);
  };

  const retryOfflineOperation = async (id: string) => {
    await offlineSync.retryOperation(id);
    setReviewOperations(await offlineSync.getReviewOperations());
    setConflictLog(await offlineSync.getConflictLog());
  };

  const archiveOfflineOperation = async (id: string) => {
    await offlineSync.archiveOperation(id);
    setReviewOperations(await offlineSync.getReviewOperations());
    setConflictLog(await offlineSync.getConflictLog());
  };

  const offlineStatusColor = pendingReviewCount > 0 || pendingSyncError
    ? { background: '#FEF2F2', border: '#FECACA', color: '#991B1B' }
    : !isOnline
      ? { background: '#FEF3C7', border: '#FCD34D', color: '#92400E' }
      : isSyncing
        ? { background: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' }
        : { background: '#F0FDF4', border: '#DCFCE7', color: '#166534' };

  const offlineStatusLabel = pendingReviewCount > 0
    ? `Erreur, ${pendingReviewCount} opérations à vérifier`
    : pendingSyncError
      ? 'Erreur, file hors-ligne à vérifier'
      : isSyncing
        ? 'Synchronisation en cours'
        : !isOnline && pendingSyncCount > 0
          ? `Hors ligne, ${pendingSyncCount} opérations en attente`
          : 'Synchronisé';

  const exchangeRate = Number(organization?.settings?.exchangeRateUsdToCdf) || 2850;

  const handleOpenRateModal = () => {
    if (!canManageRate) return;
    setNewRateInput(exchangeRate.toString());
    setShowRateModal(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newRateInput);
    if (!parsed || parsed <= 0) return;
    setIsSubmittingRate(true);
    try {
      await updateExchangeRate(parsed);
      setShowRateModal(false);
    } finally {
      setIsSubmittingRate(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-titles">
          <div className="page-header-title">{title}</div>
          {subtitle && <div className="page-header-sub">{subtitle}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Statut Réseau & Synchro Offline */}
          <div
            title={pendingSyncError || 'État de synchronisation des opérations commerciales'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: offlineStatusColor.background,
              border: `1px solid ${offlineStatusColor.border}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: offlineStatusColor.color,
              fontWeight: 500,
            }}
          >
            {pendingReviewCount > 0
              ? <AlertTriangle size={13} />
              : isOnline
                ? <Wifi size={13} />
                : <WifiOff size={13} />}
            {pendingReviewCount > 0 ? (
              <button
                type="button"
                onClick={openOfflineReview}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 0 }}
              >
                {offlineStatusLabel}
              </button>
            ) : <span>{offlineStatusLabel}</span>}
            {pendingSyncCount > 0 && isOnline && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 2px',
                  color: '#B45309',
                }}
                title="Synchroniser immédiatement"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {/* Taux de change avec synchronisation en direct */}
          <div
            onClick={canManageRate ? handleOpenRateModal : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#4B5563',
              cursor: canManageRate ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            title={canManageRate ? 'Cliquer pour ajuster le taux du jour (synchronisé automatiquement)' : 'Taux officiel appliqué'}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#16A34A',
                boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)',
                display: 'inline-block',
              }}
            />
            <DollarSign size={13} color="#16A34A" />
            <span>
              1 USD = <strong style={{ color: '#111827' }}>{exchangeRate.toLocaleString('fr-FR')} CDF</strong>
            </span>
            {canManageRate && (
              <Edit3 size={11} color="#6B7280" style={{ marginLeft: '2px', opacity: 0.7 }} />
            )}
          </div>

          {/* Statut caisse */}
          <button
            type="button"
            onClick={() => navigate('/finances')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              border: '1px solid',
              borderColor: activeSession ? '#BBF7D0' : '#FDE68A',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: activeSession ? '#F0FDF4' : '#FFFBEB',
              color: activeSession ? '#16A34A' : '#D97706',
              fontFamily: 'inherit',
            }}
          >
            {activeSession && <span className="session-dot" />}
            <Wallet size={13} />
            <span>{activeSession ? 'Caisse ouverte' : 'Caisse fermée'}</span>
          </button>

          {/* Nouvelle vente */}
          <button
            type="button"
            onClick={() => {
              if (onNewSaleClick) onNewSaleClick();
              else navigate('/sales');
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} />
            Nouvelle vente
          </button>
        </div>
      </header>

      {showOfflineReview && (
        <div className="modal-overlay" onClick={() => setShowOfflineReview(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Opérations à vérifier</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowOfflineReview(false)} aria-label="Fermer">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
              {reviewOperations.length === 0 ? (
                <p>Aucune opération à vérifier.</p>
              ) : reviewOperations.map((operation) => (
                <section key={operation.id} style={{ border: '1px solid #FECACA', borderRadius: '8px', padding: '12px' }}>
                  <strong>{operation.type}</strong>
                  <p style={{ margin: '6px 0', color: '#991B1B' }}>{operation.lastError}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => void retryOfflineOperation(operation.id)}>
                      Réessayer
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void archiveOfflineOperation(operation.id)}>
                      Archiver avec journal
                    </button>
                  </div>
                </section>
              ))}
              {conflictLog.length > 0 && (
                <section>
                  <h3>Journal des conflits</h3>
                  {conflictLog.map((conflict) => (
                    <div key={conflict.id} style={{ borderTop: '1px solid #E5E7EB', padding: '8px 0' }}>
                      <strong>{conflict.operationType}</strong>
                      <span style={{ marginLeft: '8px', color: '#6B7280' }}>
                        {new Date(conflict.occurredAt).toLocaleString('fr-FR')} · {
                          conflict.status === 'open' ? 'À vérifier' : conflict.status === 'resolved' ? 'Résolu' : 'Archivé'
                        }
                      </span>
                      <p style={{ margin: '4px 0' }}>{conflict.message}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajustement Rapide du Taux de Change */}
      {showRateModal && (
        <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} color="#16A34A" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                  Ajuster le Taux du Jour
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowRateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.4 }}>
                  Toute modification sera <strong>détectée et appliquée automatiquement</strong> en direct sur l'application Web, Desktop et tous les terminaux de caisse.
                </p>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Valeur de 1 USD en Francs Congolais (CDF)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      step="1"
                      className="form-input"
                      style={{ fontSize: '1.15rem', fontWeight: 600, padding: '8px 12px' }}
                      value={newRateInput}
                      onChange={(e) => setNewRateInput(e.target.value)}
                      placeholder="Ex: 2850"
                      autoFocus
                      required
                    />
                    <span style={{ fontWeight: 600, color: '#374151' }}>CDF</span>
                  </div>
                </div>

                {/* Boutons rapides usuels à Kinshasa / RDC */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[2800, 2850, 2860, 2870, 2900].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewRateInput(preset.toString())}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        background: '#F3F4F6',
                        border: '1px solid #E5E7EB',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      {preset.toLocaleString('fr-FR')} CDF
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRateModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingRate}
                >
                  <Check size={16} />
                  {isSubmittingRate ? 'Synchronisation...' : 'Appliquer partout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
