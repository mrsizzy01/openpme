import React from 'react';
import { formatCurrency, Currency } from '@smart-pme/shared';
import { Printer, X, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

interface PrintZReportModalProps {
  session: any;
  organization: any;
  countedAmount?: number;
  theoreticalAmount?: number;
  billetage?: {
    b20k?: string;
    b10k?: string;
    b5k?: string;
    b1k?: string;
    b500?: string;
    bPieces?: string;
  };
  notes?: string;
  onClose: () => void;
}

export const PrintZReportModal: React.FC<PrintZReportModalProps> = ({
  session,
  organization,
  countedAmount,
  theoreticalAmount,
  billetage,
  notes,
  onClose,
}) => {
  if (!session) return null;

  const openingDate = session.openedAt ? new Date(session.openedAt).toLocaleString('fr-FR') : '—';
  const closingDate = session.closedAt ? new Date(session.closedAt).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR');
  const cashierName = session.user ? `${session.user.firstName} ${session.user.lastName}` : 'Caissier Principal';
  const registerName = session.cashRegister?.name || 'Caisse Principale';

  const openingBalance = Number(session.openingBalance) || 0;
  const payments = session.payments || [];

  // Somme par méthode de paiement
  const cashPayments = payments.filter((p: any) => p.method === 'CASH').reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const mpesaPayments = payments.filter((p: any) => p.method === 'MOBILE_MONEY' || p.notes?.includes('M-Pesa')).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const airtelPayments = payments.filter((p: any) => p.notes?.includes('Airtel')).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const otherPayments = payments.filter((p: any) => p.method !== 'CASH' && !p.notes?.includes('M-Pesa') && !p.notes?.includes('Airtel')).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const totalSalesEncaissed = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const finalTheoretical = theoreticalAmount !== undefined ? theoreticalAmount : (openingBalance + cashPayments);
  const finalCounted = countedAmount !== undefined ? countedAmount : (session.closingBalance ? Number(session.closingBalance) : finalTheoretical);
  const discrepancy = finalCounted - finalTheoretical;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal modal-md"
        style={{
          background: '#FFFFFF',
          color: '#0F172A',
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#2563EB" />
            <span className="modal-title" style={{ fontSize: '15px', fontWeight: 700 }}>
              Ticket Z de Clôture Journalière
            </span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Printable Ticket Receipt Area */}
          <div
            id="printable-z-report"
            style={{
              border: '1px dashed #CBD5E1',
              borderRadius: '8px',
              padding: '20px',
              background: '#F8FAFC',
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: '12.5px',
              color: '#1E293B',
            }}
          >
            {/* Header Entreprise */}
            <div style={{ textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A', letterSpacing: '-0.3px' }}>
                {organization?.name || 'SMART PME FINANCE'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                {organization?.address || 'Kinshasa, RDC'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                RCCM : {organization?.rccm || 'CD/KIN/RCCM/20-B-01142'} | NIF : {organization?.taxId || 'A1209384E'}
              </div>
              <div
                style={{
                  marginTop: '10px',
                  display: 'inline-block',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '3px 12px',
                  borderRadius: '4px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                RAPPORT Z - CLÔTURE DE CAISSE
              </div>
            </div>

            {/* Infos Session */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '11.5px', background: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <div><strong>Poste Caisse :</strong> {registerName}</div>
              <div><strong>Opérateur :</strong> {cashierName}</div>
              <div><strong>Ouverture :</strong> {openingDate}</div>
              <div><strong>Clôture :</strong> {closingDate}</div>
            </div>

            {/* Ventilation des Encaissements */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
                Ventilation des Ventes
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '4px 0' }}>Fond de caisse initial :</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(openingBalance, Currency.CDF)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '4px 0' }}>Espèces (Cash CDF/USD) :</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>+{formatCurrency(cashPayments, Currency.CDF)}</td>
                  </tr>
                  {mpesaPayments > 0 && (
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '4px 0' }}>Mobile Money (M-Pesa) :</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600 }}>+{formatCurrency(mpesaPayments, Currency.CDF)}</td>
                    </tr>
                  )}
                  {airtelPayments > 0 && (
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '4px 0' }}>Mobile Money (Airtel) :</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600 }}>+{formatCurrency(airtelPayments, Currency.CDF)}</td>
                    </tr>
                  )}
                  {otherPayments > 0 && (
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '4px 0' }}>Autres encaissements :</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600 }}>+{formatCurrency(otherPayments, Currency.CDF)}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '1px solid #CBD5E1', fontWeight: 700 }}>
                    <td style={{ padding: '6px 0' }}>Total Recettes de la Session :</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{formatCurrency(totalSalesEncaissed, Currency.CDF)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Billetage physique si renseigné */}
            {billetage && (
              <div style={{ marginBottom: '14px', background: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                  Détail du Billetage Physique CDF
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                  {billetage.b20k && <div>20.000 FC : <strong>{billetage.b20k} pcs</strong></div>}
                  {billetage.b10k && <div>10.000 FC : <strong>{billetage.b10k} pcs</strong></div>}
                  {billetage.b5k && <div>5.000 FC : <strong>{billetage.b5k} pcs</strong></div>}
                  {billetage.b1k && <div>1.000 FC : <strong>{billetage.b1k} pcs</strong></div>}
                  {billetage.b500 && <div>500 FC : <strong>{billetage.b500} pcs</strong></div>}
                  {billetage.bPieces && <div>Monnaie : <strong>{formatCurrency(Number(billetage.bPieces), Currency.CDF)}</strong></div>}
                </div>
              </div>
            )}

            {/* Réconciliation & Écart */}
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Solde Théorique Espèces :</span>
                <strong>{formatCurrency(finalTheoretical, Currency.CDF)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Solde Physique Compté :</span>
                <strong>{formatCurrency(finalCounted, Currency.CDF)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid #CBD5E1',
                  fontWeight: 800,
                  color: Math.abs(discrepancy) < 1 ? '#16A34A' : discrepancy > 0 ? '#2563EB' : '#DC2626',
                }}
              >
                <span>Écart de Caisse :</span>
                <span>
                  {Math.abs(discrepancy) < 1 ? '0 CDF (Conforme)' : `${discrepancy > 0 ? '+' : ''}${formatCurrency(discrepancy, Currency.CDF)}`}
                </span>
              </div>
            </div>

            {notes && (
              <div style={{ fontSize: '11.5px', color: '#64748B', fontStyle: 'italic', marginBottom: '14px' }}>
                Observations : « {notes} »
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Signature Caissier</div>
                <div style={{ height: '40px' }} />
                <div style={{ borderTop: '1px solid #CBD5E1', fontSize: '10.5px', color: '#475569' }}>{cashierName}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Visa Superviseur / Gérant</div>
                <div style={{ height: '40px' }} />
                <div style={{ borderTop: '1px solid #CBD5E1', fontSize: '10.5px', color: '#475569' }}>Contrôle & Validation</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> Imprimer le Ticket Z
          </button>
        </div>
      </div>
    </div>
  );
};
