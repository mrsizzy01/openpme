import React, { useEffect, useState } from 'react';
import {
  Monitor,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  Shield,
  Laptop,
  Radio,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

interface Terminal {
  id: string;
  organizationId: string;
  userId?: string;
  userName: string;
  userRole: string;
  clientType: 'DESKTOP_PYQT' | 'WEB_POS' | 'BROWSER';
  ipAddress: string;
  lastPing: string;
  status: 'ONLINE' | 'LOCKED' | 'OFFLINE';
  lockReason?: string | null;
  commandAcknowledged?: boolean;
  stateVersion?: number;
  lastAcknowledgedAt?: string | null;
  tokenRevoked?: boolean;
  cashSessionId?: string;
}

export const TerminalsPage: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [actionType, setActionType] = useState<'LOCK' | 'UNLOCK' | 'REVOKE' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { success, error, warning } = useToast();

  const fetchTerminals = async () => {
    try {
      const data = await ApiClient.getTerminals();
      setTerminals(data);
    } catch (err: any) {
      // Ignorer les erreurs passagères de polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();

    if (!autoRefresh) return;
    const interval = setInterval(fetchTerminals, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleOpenActionModal = (term: Terminal, type: 'LOCK' | 'REVOKE' = 'LOCK') => {
    setSelectedTerminal(term);
    setActionType(type);
    setReason(type === 'LOCK'
      ? 'Poste temporairement verrouillé pour vérification.'
      : 'Révocation administrative du poste.');
  };

  const handleConfirmAction = async () => {
    if (!actionType || !selectedTerminal || !reason.trim()) return;
    setSubmitting(true);
    try {
      const result = actionType === 'LOCK'
        ? await ApiClient.lockTerminal(selectedTerminal.id, reason.trim())
        : actionType === 'UNLOCK'
          ? await ApiClient.unlockTerminal(selectedTerminal.id, reason.trim())
          : await ApiClient.revokeTerminal(selectedTerminal.id, reason.trim());
      const actionLabel = actionType === 'LOCK'
        ? 'Verrouillage'
        : actionType === 'UNLOCK' ? 'Déverrouillage' : 'Révocation';
      if (result.acknowledged) success(`${actionLabel} appliqué sur ${selectedTerminal.id}.`);
      else if (actionType === 'REVOKE') {
        warning(`Jeton de ${selectedTerminal.id} révoqué; le poste doit être réenrôlé pour se reconnecter.`);
      } else {
        warning(`${actionLabel} envoyé; application en attente de confirmation du poste.`);
      }
      setSelectedTerminal(null);
      setActionType(null);
      await fetchTerminals();
    } catch (err: any) {
      error(err.message || "Erreur lors de l'exécution de la commande à distance.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatLastPing = (dateStr?: string | null) => {
    if (!dateStr) return 'Aucun signal reçu';
    try {
      const ping = new Date(dateStr).getTime();
      const diffSec = Math.floor((Date.now() - ping) / 1000);
      if (diffSec < 3) return 'En direct (<3s)';
      if (diffSec < 60) return `Il y a ${diffSec}s`;
      return `Il y a ${Math.floor(diffSec / 60)} min`;
    } catch {
      return dateStr;
    }
  };

  const onlineTerminals = terminals.filter((t) => t.status === 'ONLINE');
  const lockedTerminals = terminals.filter((t) => t.status === 'LOCKED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Barre de contrôle supérieure */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Postes Actifs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: onlineTerminals.length > 0 ? '#10B981' : '#94A3B8',
              boxShadow: onlineTerminals.length > 0 ? '0 0 10px #10B981' : 'none'
            }} />
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Caisses En Ligne
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {onlineTerminals.length}
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: '#E2E8F0' }} />

          {/* Postes Verrouillés */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: lockedTerminals.length > 0 ? '#F59E0B' : '#CBD5E1',
            }} />
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Verrouillés
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {lockedTerminals.length}
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: '#E2E8F0' }} />

          {/* Synchronisation en temps réel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={16} color="#0284C7" className={autoRefresh ? 'spin' : ''} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369A1' }}>
              Supervision Directe (3s)
            </span>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="btn btn-secondary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={autoRefresh ? 'spin' : ''} />
            {autoRefresh ? 'Pause' : 'Activer Direct'}
          </button>

          <button
            onClick={fetchTerminals}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Guide clair */}
      <div style={{
        background: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#0369A1',
        fontSize: '13px',
      }}>
        <Shield size={20} color="#0284C7" style={{ flexShrink: 0 }} />
        <div>
          <b>Supervision & Contrôle à Distance :</b> Cet écran vous permet de surveiller en direct l'état des postes caisse Windows connectés.
          Vous pouvez verrouiller ou déverrouiller un poste sans arrêter l'application. Les commandes en attente affichent leur état d'acquittement.
        </div>
      </div>

      {/* Liste des postes de caisse */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead style={{ background: '#F8FAFC' }}>
            <tr>
              <th style={{ padding: '14px 18px' }}>Poste de Travail</th>
              <th>Type de Client</th>
              <th>Utilisateur & Rôle</th>
              <th>Adresse IP</th>
              <th>Dernier Signal</th>
              <th>État</th>
              <th style={{ textAlign: 'right', paddingRight: '18px' }}>Actions de Contrôle</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  Recherche des postes connectés...
                </td>
              </tr>
            ) : terminals.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                  <Monitor size={42} color="#94A3B8" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Aucune caisse connectée actuellement
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '500px', margin: '0 auto' }}>
                    Pour connecter un poste caisse, lancez le fichier <b>LANCER_DESKTOP.bat</b> sur la machine Windows.
                    Le poste s'affichera ici en direct avec son identifiant matériel.
                  </p>
                </td>
              </tr>
            ) : (
              terminals.map((term) => {
                const isOnline = term.status === 'ONLINE';
                const isLocked = term.status === 'LOCKED';

                return (
                  <tr
                    key={term.id}
                    style={{
                      background: isLocked ? '#FFFBEB' : undefined,
                      borderBottom: '1px solid #F1F5F9'
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          background: isOnline ? '#DCFCE7' : isLocked ? '#FEF3C7' : '#F1F5F9',
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Laptop size={18} color={isOnline ? '#16A34A' : isLocked ? '#D97706' : '#64748B'} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                            {term.id}
                          </div>
                          {term.cashSessionId ? (
                            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                              Caisse ouverte (#{term.cashSessionId.slice(0, 8)})
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              Prêt pour vente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#EEF2FF',
                        color: '#4338CA',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '12px'
                      }}>
                        {term.clientType === 'DESKTOP_PYQT' ? 'Windows Natif (PyQt6)' : 'Navigateur Web'}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>
                        {term.userName || 'Non assigné'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {term.userRole}
                      </div>
                    </td>

                    <td style={{ fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>
                      {term.ipAddress}
                    </td>

                    <td style={{ fontSize: '12px', color: '#475569' }}>
                      {formatLastPing(term.lastPing)}
                    </td>

                    <td>
                      {isOnline && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#166534',
                          background: '#DCFCE7',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                          En Ligne
                        </span>
                      )}
                      {isLocked && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#92400E',
                          background: '#FEF3C7',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}>
                          <Lock size={12} />
                          Verrouillé
                        </span>
                      )}
                      {!isOnline && !isLocked && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#475569',
                          background: '#F1F5F9',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          Déconnecté
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right', paddingRight: '18px' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {term.tokenRevoked ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#B91C1C' }}>
                            Jeton révoqué · réenrôlement requis
                          </span>
                        ) : isLocked ? (
                          <button
                            onClick={() => {
                              setSelectedTerminal(term);
                              setActionType('UNLOCK');
                              setReason('');
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#059669',
                              borderColor: '#A7F3D0',
                              background: '#ECFDF5'
                            }}
                          >
                            <Unlock size={14} /> Déverrouiller
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenActionModal(term)}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#D97706',
                              borderColor: '#FDE68A',
                              background: '#FFFBEB'
                            }}
                          >
                            <Lock size={14} /> Verrouiller
                          </button>
                        )}
                        {!term.tokenRevoked && (
                          <>
                            <button
                              onClick={() => handleOpenActionModal(term, 'REVOKE')}
                              className="btn btn-secondary"
                              style={{
                                padding: '6px 10px',
                                fontSize: '11px',
                                color: '#B91C1C',
                                borderColor: '#FECACA',
                              }}
                            >
                              Révoquer
                            </button>
                            <div style={{ fontSize: '11px', color: term.commandAcknowledged ? '#15803D' : '#B45309' }}>
                              {term.commandAcknowledged ? 'État appliqué' : 'En attente du poste'}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation de changement d'état */}
      {actionType && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                background: actionType === 'LOCK' ? '#FEF3C7' : actionType === 'UNLOCK' ? '#DCFCE7' : '#FEE2E2',
                padding: '10px',
                borderRadius: '50%',
                color: actionType === 'LOCK' ? '#D97706' : actionType === 'UNLOCK' ? '#15803D' : '#B91C1C',
              }}>
                {actionType === 'LOCK' ? <Lock size={24} /> : actionType === 'UNLOCK' ? <Unlock size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {actionType === 'LOCK'
                    ? 'Verrouiller le poste'
                    : actionType === 'UNLOCK' ? 'Déverrouiller le poste' : 'Révoquer le poste'}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Poste cible : {selectedTerminal?.id}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {actionType === 'LOCK'
                ? "Un écran de verrouillage s'affichera sur le poste. L'application restera active pour permettre le déverrouillage à distance."
                : actionType === 'UNLOCK'
                  ? "Le poste retrouvera son accès dès qu'il recevra cette commande. Une reconnexion utilisateur pourra être demandée."
                  : "Le jeton de sécurité sera invalidé immédiatement. Le poste restera bloqué et devra être réenrôlé localement par un administrateur autorisé."}
            </p>

            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                Motif administratif :
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="input"
                style={{ width: '100%', resize: 'none', fontSize: '13px' }}
                placeholder="Motif administratif..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTerminal(null);
                  setActionType(null);
                }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={submitting || !reason.trim()}
                className="btn"
                style={{
                  background: actionType === 'LOCK' ? '#D97706' : actionType === 'UNLOCK' ? '#15803D' : '#B91C1C',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting ? (
                  'Exécution...'
                ) : actionType === 'LOCK' ? (
                  <>
                    <Lock size={15} /> Confirmer le verrouillage
                  </>
                ) : actionType === 'UNLOCK' ? (
                  <>
                    <Unlock size={15} /> Confirmer le déverrouillage
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} /> Confirmer la révocation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
