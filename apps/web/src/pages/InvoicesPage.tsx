import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency } from '@smart-pme/shared';
import { Receipt, Printer, CreditCard, X, AlertTriangle, RefreshCw, CheckCircle, FileSpreadsheet, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCsv } from '../utils/exportCsv';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { printThermalReceiptWeb } from '../utils/escpos';
import { isNetworkFailure, offlineSync } from '../services/offlineSync';

const statusLabels: Record<string, string> = {
  PAID: 'Payée',
  PARTIALLY_PAID: 'Partielle',
  ISSUED: 'Émise',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
  DRAFT: 'Brouillon',
};

const statusClass: Record<string, string> = {
  PAID: 'badge-success',
  PARTIALLY_PAID: 'badge-warning',
  ISSUED: 'badge-info',
  OVERDUE: 'badge-danger',
  CANCELLED: 'badge-neutral',
  DRAFT: 'badge-neutral',
};

export const InvoicesPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentCashSessionId, setPaymentCashSessionId] = useState<string | undefined>();
  const [cashSessionIds, setCashSessionIds] = useState<Record<string, string>>({});
  const [cashSessionLoadError, setCashSessionLoadError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await ApiClient.getInvoices(statusFilter || undefined);
      setInvoices(res);
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les factures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      ApiClient.getCurrentCashSession('CDF'),
      ApiClient.getCurrentCashSession('USD'),
    ]).then(([cdfSession, usdSession]) => {
      if (active) {
        setCashSessionIds({
          CDF: cdfSession?.id,
          USD: usdSession?.id,
        });
        setCashSessionLoadError(null);
      }
    }).catch((error: unknown) => {
      if (active) {
        setCashSessionIds({});
        setCashSessionLoadError(error instanceof Error ? error.message : 'Impossible de vérifier la session de caisse.');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleOpenPayment = (inv: any) => {
    setPaymentInvoice(inv);
    setPaymentAmount(String(Number(inv.balance).toFixed(2)));
    setPaymentRef('');
    setPaymentError(null);
    setPaymentCashSessionId(cashSessionIds[inv.currency]);
    if (!cashSessionIds[inv.currency]) {
      void ApiClient.getCurrentCashSession(inv.currency)
        .then((session) => {
          setCashSessionIds((current) => ({ ...current, [inv.currency]: session?.id }));
          setPaymentCashSessionId(session?.id);
          setCashSessionLoadError(null);
        })
        .catch((error: unknown) => {
          setCashSessionLoadError(error instanceof Error ? error.message : 'Impossible de vérifier la session de caisse.');
        });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setPaymentError(null);

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Le montant doit être supérieur à 0.');
      return;
    }
    if (amt > Number(paymentInvoice.balance)) {
      setPaymentError(`Le montant ne peut pas dépasser le solde restant (${formatCurrency(Number(paymentInvoice.balance), paymentInvoice.currency)}).`);
      return;
    }
    if (paymentMethod === 'CASH' && !paymentCashSessionId) {
      setPaymentError(`Aucune session de caisse ${paymentInvoice.currency} n’est disponible. Vérifiez que la caisse est ouverte, puis réessayez.`);
      return;
    }

    setSubmittingPayment(true);
    const paymentPayload = {
      idempotencyKey: crypto.randomUUID(),
      invoiceId: paymentInvoice.id,
      customerId: paymentInvoice.customerId,
      amount: paymentAmount,
      method: paymentMethod,
      reference: paymentRef.trim() || undefined,
      currency: paymentInvoice.currency,
      cashSessionId: paymentMethod === 'CASH' ? paymentCashSessionId : undefined,
    };
    try {
      await ApiClient.createPayment(paymentPayload);
      setPaymentInvoice(null);
      success(`Règlement de ${formatCurrency(amt, paymentInvoice.currency)} enregistré avec succès.`);
      loadInvoices();
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        if (paymentMethod !== 'CASH') {
          setPaymentError('Un paiement par banque ou Mobile Money doit être confirmé en ligne. Aucun règlement n’a été enregistré.');
        } else if (!paymentCashSessionId) {
          setPaymentError(
            `Aucune session de caisse ${paymentInvoice.currency} n’est disponible. Ouvrez la caisse en ligne avant d’enregistrer ce règlement.${
              cashSessionLoadError ? ` ${cashSessionLoadError}` : ''
            }`,
          );
        } else {
          try {
            await offlineSync.enqueuePayment(paymentPayload);
            setPaymentInvoice(null);
            success(`Règlement de ${formatCurrency(amt, paymentInvoice.currency)} enregistré hors-ligne. Il sera synchronisé dès le retour du réseau.`);
          } catch (storageError) {
            setPaymentError(storageError instanceof Error
              ? `Le règlement n’a pas été enregistré. ${storageError.message}`
              : 'Le règlement n’a pas été enregistré : stockage hors-ligne indisponible.');
          }
        }
      } else {
        setPaymentError(err.message || 'Erreur lors de l\'enregistrement du règlement.');
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filterOptions = [
    { value: '', label: 'Toutes' },
    { value: 'ISSUED', label: 'Émises' },
    { value: 'PARTIALLY_PAID', label: 'Partielles' },
    { value: 'OVERDUE', label: 'En retard' },
    { value: 'PAID', label: 'Payées' },
    { value: 'CANCELLED', label: 'Annulées' },
  ];

  const handleExportInvoices = () => {
    if (!invoices.length) {
      toastError('Aucune facture à exporter.');
      return;
    }
    const rows = invoices.map((inv) => ({
      'N° Facture': inv.invoiceNumber,
      'Date Émission': new Date(inv.createdAt).toLocaleDateString('fr-FR'),
      'Client': inv.customer?.name || 'Client Comptoir',
      'Statut': statusLabels[inv.status] || inv.status,
      'Devise': inv.currency,
      'Sous-total HT': inv.subtotal,
      'TVA (16%)': inv.taxAmount,
      'Total TTC': inv.total,
      'Montant Réglé': inv.paidAmount,
      'Solde Restant': inv.balance,
    }));
    exportToCsv('Factures_OpenPME', rows);
    success('Export Excel / CSV des factures téléchargé avec succès !');
  };

  const handleShareWhatsApp = (inv: any) => {
    const phone = inv.customer?.phone ? inv.customer.phone.replace(/[^0-9]/g, '') : '';
    const message = encodeURIComponent(
      `*${organization?.name || 'OpenPME'} - FACTURE OFFICIELLE*\n` +
      `N° Facture : *${inv.invoiceNumber}*\n` +
      `Client : *${inv.customer?.name || 'Client Comptoir'}*\n` +
      `Date : ${new Date(inv.createdAt).toLocaleDateString('fr-FR')}\n` +
      `Total : *${formatCurrency(Number(inv.total), inv.currency)}*\n` +
      `Statut : *${statusLabels[inv.status] || inv.status}*\n` +
      `Solde restant : *${formatCurrency(Number(inv.balance), inv.currency)}*\n\n` +
      `_Merci de votre confiance._`
    );
    const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div className="table-wrapper">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
          </div>
          <div className="table-toolbar-actions">
            <button type="button" className="btn btn-sm btn-secondary" onClick={handleExportInvoices} title="Exporter les factures vers Excel/CSV">
              <FileSpreadsheet size={13} /> Exporter Excel
            </button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={loadInvoices}>
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>Chargement...</span>
            </div>
          ) : loadError ? (
            <div className="table-empty">
              <div className="table-empty-title" style={{ color: '#DC2626' }}>Erreur de chargement</div>
              <div className="table-empty-sub">{loadError}</div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadInvoices}>
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="table-empty">
              <Receipt className="table-empty-icon" />
              <div className="table-empty-title">Aucune facture trouvée</div>
              <div className="table-empty-sub">
                {statusFilter
                  ? `Aucune facture avec le statut « ${statusLabels[statusFilter] || statusFilter} ».`
                  : 'Les factures sont générées automatiquement lors des ventes.'}
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Client</th>
                  <th>Émission</th>
                  <th>Échéance</th>
                  <th className="col-amount">Total TTC</th>
                  <th className="col-amount">Réglé</th>
                  <th className="col-amount">Solde dû</th>
                  <th>Statut</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => {
                  const balance = Number(inv.balance);
                  const isOverdue = inv.status === 'OVERDUE' || (balance > 0 && new Date(inv.dueDate) < new Date());
                  return (
                    <tr key={inv.id}>
                      <td className="col-mono">{inv.invoiceNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.customer?.name}</div>
                        {inv.customer?.phone && (
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{inv.customer.phone}</div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{new Date(inv.issueDate).toLocaleDateString('fr-FR')}</td>
                      <td style={{ fontSize: '0.8125rem', color: isOverdue && balance > 0 ? '#DC2626' : undefined }}>
                        {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="col-amount font-semibold">{formatCurrency(Number(inv.total), inv.currency)}</td>
                      <td className="col-amount text-success">{formatCurrency(Number(inv.paidAmount), inv.currency)}</td>
                      <td className="col-amount" style={{ color: balance > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                        {formatCurrency(balance, inv.currency)}
                      </td>
                      <td>
                        <span className={`badge ${statusClass[inv.status] || 'badge-neutral'}`}>
                          {statusLabels[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="col-actions">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="btn btn-sm btn-secondary"
                            title="Voir et imprimer"
                          >
                            <Printer size={13} /> Voir
                          </button>
                          {balance > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(inv)}
                              className="btn btn-sm btn-primary"
                              title="Enregistrer un règlement"
                            >
                              <CreditCard size={13} /> Régler
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal aperçu / impression facture */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ background: '#fff', color: '#111827' }}>
            <div className="modal-header" style={{ background: '#fff', borderColor: '#E5E7EB' }}>
              <span className="modal-title" style={{ color: '#111827' }}>
                Facture N° {selectedInvoice.invoiceNumber}
              </span>
              <button type="button" className="btn-close" onClick={() => setSelectedInvoice(null)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ background: '#fff' }}>
              {/* En-tête facture */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2563EB', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '6px' }}>
                    {organization?.name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#4B5563', lineHeight: 1.6 }}>
                    {organization?.address}<br />
                    {organization?.city}, {organization?.country}<br />
                    Tél : {organization?.phone}<br />
                    <strong>NIF :</strong> {organization?.taxId}&ensp;|&ensp;
                    <strong>RCCM :</strong> {organization?.rccm}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#2563EB', marginBottom: '4px' }}>
                    FACTURE COMMERCIALE
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1rem' }}>
                    N° {selectedInvoice.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '4px' }}>
                    Émission : {new Date(selectedInvoice.issueDate).toLocaleDateString('fr-FR')}<br />
                    Échéance : {new Date(selectedInvoice.dueDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              {/* Client */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Facturé à :</div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>{selectedInvoice.customer?.name}</div>
                {selectedInvoice.customer?.companyName && (
                  <div style={{ fontSize: '0.8125rem', color: '#4B5563' }}>{selectedInvoice.customer.companyName}</div>
                )}
                <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                  {selectedInvoice.customer?.address || 'Kinshasa, RDC'}<br />
                  Tél : {selectedInvoice.customer?.phone || '—'}
                </div>
              </div>

              {/* Articles */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: '#1E3A8A', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Désignation</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Qté</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>P.U. HT</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>TVA</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '7px 12px' }}>{item.product?.name || item.description}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatCurrency(Number(item.unitPrice), selectedInvoice.currency)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>{item.taxRatePercent}%</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(Number(item.total), selectedInvoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totaux */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <div style={{ width: '280px', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#6B7280' }}>
                    <span>Sous-total HT</span>
                    <span>{formatCurrency(Number(selectedInvoice.subtotal), selectedInvoice.currency)}</span>
                  </div>
                  {Number(selectedInvoice.taxAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#6B7280' }}>
                      <span>TVA</span>
                      <span>{formatCurrency(Number(selectedInvoice.taxAmount), selectedInvoice.currency)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 800, fontSize: '1rem', borderTop: '2px solid #1E3A8A', color: '#1E3A8A', marginTop: '4px' }}>
                    <span>Total TTC</span>
                    <span>{formatCurrency(Number(selectedInvoice.total), selectedInvoice.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#16A34A', fontWeight: 600 }}>
                    <span>Montant réglé</span>
                    <span>{formatCurrency(Number(selectedInvoice.paidAmount), selectedInvoice.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#DC2626', fontWeight: 700 }}>
                    <span>Solde restant dû</span>
                    <span>{formatCurrency(Number(selectedInvoice.balance), selectedInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Pied légal & QR Code Fiscal */}
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.5, textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>Mentions Fiscales & Légales (RDC) :</div>
                  NIF : <strong>{organization?.taxId || 'A1209384E'}</strong> · RCCM : <strong>{organization?.rccm || 'CD/KIN/RCCM/20-B-1092'}</strong><br />
                  {organization?.settings?.invoiceFooterNote || 'Facture certifiée conforme aux exigences fiscales — République Démocratique du Congo'}<br />
                  {organization?.settings?.bankDetails && `Coordonnées : ${organization.settings.bankDetails}`}
                </div>
                <QRCodeDisplay
                  value={`OPENPME:FAC=${selectedInvoice.invoiceNumber};NIF=${organization?.taxId || 'A1209384E'};TOTAL=${selectedInvoice.total}${selectedInvoice.currency};DATE=${selectedInvoice.createdAt}`}
                  size={95}
                  label="Scan Fiscalité DGI"
                />
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#F8FAFC', borderColor: '#E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Fermer
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleShareWhatsApp(selectedInvoice)}
                  title="Partager la facture sur WhatsApp"
                >
                  <Share2 size={14} /> WhatsApp
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    if (!selectedInvoice) return;
                    printThermalReceiptWeb({
                      companyName: organization?.name || 'Smart PME Finance',
                      companyAddress: organization?.address,
                      companyPhone: organization?.phone,
                      companyNif: organization?.taxId,
                      receiptNumber: selectedInvoice.invoiceNumber,
                      date: new Date(selectedInvoice.issueDate || selectedInvoice.createdAt).toLocaleString('fr-FR'),
                      customerName: selectedInvoice.customer?.name,
                      items: (selectedInvoice.items || []).map((i: any) => ({
                        name: i.description || i.product?.name || 'Article',
                        quantity: Number(i.quantity || 1),
                        unitPrice: Number(i.unitPrice || 0),
                        total: Number(i.total || (i.quantity * i.unitPrice) || 0),
                      })),
                      subtotal: Number(selectedInvoice.subtotal || selectedInvoice.total),
                      taxAmount: Number(selectedInvoice.taxAmount || 0),
                      total: Number(selectedInvoice.total),
                      currency: selectedInvoice.currency || 'CDF',
                      paymentMethod: selectedInvoice.status === 'PAID' ? 'RÉGLÉ' : 'EN COURS',
                    }, { width: '80mm' });
                  }}
                  title="Imprimer un ticket thermique ESC/POS 80mm"
                >
                  <Printer size={14} /> Ticket 80mm
                </button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <Printer size={14} /> Imprimer A4
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal règlement */}
      {paymentInvoice && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Enregistrer un règlement</span>
              <button type="button" className="btn-close" onClick={() => setPaymentInvoice(null)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>Facture N°</span>
                    <span className="col-mono" style={{ fontSize: '0.8125rem' }}>{paymentInvoice.invoiceNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>Client</span>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{paymentInvoice.customer?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>Solde restant</span>
                    <span style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.9rem' }}>
                      {formatCurrency(Number(paymentInvoice.balance), paymentInvoice.currency)}
                    </span>
                  </div>
                </div>

                {paymentError && (
                  <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="pay-amount">
                    Montant du règlement ({paymentInvoice.currency}) <span className="required">*</span>
                  </label>
                  <input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(paymentInvoice.balance)}
                    required
                    className="input-field"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pay-method">Mode de paiement <span className="required">*</span></label>
                  <select
                    id="pay-method"
                    className="input-field"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Espèces</option>
                    <option value="BANK_TRANSFER">Virement bancaire</option>
                    <option value="MOBILE_MONEY_MPESA">Vodacom M-Pesa</option>
                    <option value="MOBILE_MONEY_AIRTEL">Airtel Money</option>
                    <option value="MOBILE_MONEY_ORANGE">Orange Money</option>
                    <option value="CHECK">Chèque</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pay-ref">Référence / N° bordereau</label>
                  <input
                    id="pay-ref"
                    type="text"
                    className="input-field"
                    placeholder="ex : VIR-RAWBANK-12093"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentInvoice(null)}>
                  Annuler
                </button>
                <button type="submit" disabled={submittingPayment} className="btn btn-primary">
                  {submittingPayment ? (
                    <>
                      <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Valider le règlement
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
