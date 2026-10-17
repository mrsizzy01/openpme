import React, { useEffect, useState } from 'react';
import { Wallet, DollarSign, Plus, Wifi, WifiOff, RefreshCw, Edit3, X, Check, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { offlineSync } from '../services/offlineSync';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSaleClick?: () => void;
  activeSession?: any;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewSaleClick,
  activeSession,
  onOpenCommandPalette,
}) => {
  const { organization, user, updateExchangeRate } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(offlineSync.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRateInput, setNewRateInput] = useState('');
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  const [calcUsd, setCalcUsd] = useState<string>('10');
  const [calcCdf, setCalcCdf] = useState<string>('');

  const canManageRate = user?.role === 'ORG_OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineSync.subscribe(() => {
      setPendingSyncCount(offlineSync.getPendingCount());
    });

    return () => {
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
      setPendingSyncCount(offlineSync.getPendingCount());
    }
  };

  const exchangeRate = Number(organization?.settings?.exchangeRateUsdToCdf) || 2850;

  const handleOpenRateModal = () => {
    setNewRateInput(exchangeRate.toString());
    setCalcUsd('10');
    setCalcCdf((10 * exchangeRate).toLocaleString('fr-FR'));
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
          {/* Raccourci Palette de Commandes (Ctrl+K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Ouvrir la palette de commandes (Ctrl + K)"
            >
              <Search size={13} color="#64748B" />
              <span style={{ fontWeight: 500 }}>Recherche...</span>
              <kbd
                style={{
                  fontSize: '10px',
                  background: '#E2E8F0',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                Ctrl K
              </kbd>
            </button>
          )}

          {/* Statut Réseau & Synchro Offline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: isOnline ? (pendingSyncCount > 0 ? '#FEF3C7' : '#F0FDF4') : '#FEF2F2',
              border: `1px solid ${isOnline ? (pendingSyncCount > 0 ? '#FCD34D' : '#DCFCE7') : '#FECACA'}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: isOnline ? (pendingSyncCount > 0 ? '#92400E' : '#166534') : '#991B1B',
              fontWeight: 500,
            }}
          >
            {isOnline ? (
              <Wifi size={13} color={pendingSyncCount > 0 ? '#D97706' : '#16A34A'} />
            ) : (
              <WifiOff size={13} color="#DC2626" />
            )}
            <span>
              {!isOnline
                ? `Hors-ligne (${pendingSyncCount} en attente)`
                : pendingSyncCount > 0
                ? `${pendingSyncCount} à synchroniser`
                : 'Connecté (Synchro auto)'}
            </span>
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

          {/* Taux de change avec synchronisation en direct & convertisseur */}
          <div
            onClick={handleOpenRateModal}
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
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Cliquer pour ouvrir le convertisseur express USD / CDF"
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
            <Edit3 size={11} color="#6B7280" style={{ marginLeft: '2px', opacity: 0.7 }} />
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
                  Convertisseur Express & Taux de Change
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

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Simulateur instantané */}
              <div
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                  🧮 Conversion Directe (Taux : {exchangeRate} CDF/USD)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                      Montant en USD ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={calcUsd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCalcUsd(val);
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          setCalcCdf(Math.round(num * exchangeRate).toLocaleString('fr-FR'));
                        } else {
                          setCalcCdf('');
                        }
                      }}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                      Équivalent en CDF (FC)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={calcCdf ? `${calcCdf} CDF` : ''}
                      style={{ background: '#E2E8F0', fontWeight: 600, color: '#0F172A' }}
                    />
                  </div>
                </div>
              </div>

              {canManageRate ? (
                <form onSubmit={handleSaveRate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      Modifier le Taux Officiel de l’Entreprise
                    </label>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#64748B' }}>
                      Ce taux sera répercuté immédiatement sur toutes les caisses et factures.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        step="1"
                        className="form-input"
                        style={{ fontSize: '1.1rem', fontWeight: 600, padding: '8px 12px' }}
                        value={newRateInput}
                        onChange={(e) => setNewRateInput(e.target.value)}
                        placeholder="Ex: 2850"
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
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#334155',
                          fontWeight: 500,
                        }}
                      >
                        {preset.toLocaleString('fr-FR')} CDF
                      </button>
                    ))}
                  </div>

                  <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: 0, marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowRateModal(false)}
                    >
                      Fermer
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmittingRate}
                    >
                      <Check size={16} />
                      {isSubmittingRate ? 'Mise à jour...' : 'Appliquer le nouveau taux'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748B' }}>
                  ℹ️ Seuls les administrateurs et managers peuvent modifier le taux de change officiel.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

