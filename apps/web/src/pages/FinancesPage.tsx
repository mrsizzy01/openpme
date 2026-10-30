import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, subtractMoney, sumMoney } from '@smart-pme/shared';
import {
  Wallet,
  ArrowDownCircle,
  Plus,
  Lock,
  Unlock,
  AlertTriangle,
  Building,
  Smartphone,
  X,
  RefreshCw,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isNetworkFailure, offlineSync } from '../services/offlineSync';
import { exportToCsv } from '../utils/exportCsv';

const EXPENSE_CATEGORIES = [
  'Frais de fonctionnement',
  'Salaires & RH',
  'Loyer & charges immobilières',
  'Transport & déplacements',
  'Fournitures & consommables',
  'Télécommunications',
  'Eau & électricité',
  'Marketing & publicité',
  'Achats de marchandises',
  'Frais bancaires',
  'Taxes & impôts',
  'Maintenance & réparations',
  'Autres dépenses',
];

export const FinancesPage: React.FC = () => {
  const { organization, user } = useAuth();
  const { success, error: toastError } = useToast();
  const isManager = user?.role === 'ORG_OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any | null>(null);
  const [cashSessions, setCashSessions] = useState<Partial<Record<Currency, any>>>({});
  const [cashCurrency, setCashCurrency] = useState<Currency>(Currency.CDF);
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>(Currency.CDF);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal dépense
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('Frais de fonctionnement');
  const [expAmount, setExpAmount] = useState('');
  const [expBeneficiary, setExpBeneficiary] = useState('');
  const [expMethod, setExpMethod] = useState('CASH');
  const [expRef, setExpRef] = useState('');
  const [expAccountId, setExpAccountId] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expError, setExpError] = useState<string | null>(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Modal ouverture caisse
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openBalance, setOpenBalance] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [openError, setOpenError] = useState<string | null>(null);
  const [submittingOpen, setSubmittingOpen] = useState(false);

  // Modal clôture caisse & Billetage à l'aveugle
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedBalance, setCountedBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);
  const [submittingClose, setSubmittingClose] = useState(false);

  // Billetage CDF
  const [useBilletage, setUseBilletage] = useState(false);
  const [b20k, setB20k] = useState<string>('');
  const [b10k, setB10k] = useState<string>('');
  const [b5k, setB5k] = useState<string>('');
  const [b1k, setB1k] = useState<string>('');
  const [b500, setB500] = useState<string>('');
  const [bPieces, setBPieces] = useState<string>('');

  const loadFinances = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [exps, accs, regs, session, cdfSession, usdSession] = await Promise.all([
        ApiClient.getExpenses(),
        ApiClient.getFinancialAccounts(),
        ApiClient.getCashRegisters(),
        ApiClient.getCurrentCashSession(cashCurrency),
        ApiClient.getCurrentCashSession(Currency.CDF),
        ApiClient.getCurrentCashSession(Currency.USD),
      ]);
      setExpenses(exps);
      setAccounts(accs);
      setCashRegisters(regs);
      setCurrentSession(session);
      setCashSessions({
        [Currency.CDF]: cdfSession,
        [Currency.USD]: usdSession,
      });
      if (regs.length > 0 && !selectedRegisterId) setSelectedRegisterId(regs[0].id);
      if (accs.length > 0 && !expAccountId) setExpAccountId(accs[0].id);
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les données financières.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinances();
  }, [cashCurrency]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) {
      setExpError('Le montant doit être supérieur à 0.');
      return;
    }
    if (!expBeneficiary.trim()) {
      setExpError('Le bénéficiaire est obligatoire.');
      return;
    }
    if (expMethod === 'CASH' && !cashSessions[expenseCurrency]?.id) {
      setExpError(`Ouvrez d’abord la session de caisse ${expenseCurrency} dans Finances.`);
      return;
    }
    setSubmittingExpense(true);
    const expensePayload = {
      idempotencyKey: crypto.randomUUID(),
      category: expCategory,
      amount: expAmount,
      beneficiary: expBeneficiary.trim(),
      method: expMethod,
      reference: expRef.trim() || undefined,
      notes: expNotes.trim() || undefined,
      currency: expenseCurrency,
      cashSessionId: expMethod === 'CASH' ? cashSessions[expenseCurrency]?.id : undefined,
      financialAccountId: expMethod === 'CASH' ? undefined : expAccountId || undefined,
    };
    try {
      await ApiClient.createExpense(expensePayload);
      setShowExpenseModal(false);
      setExpAmount('');
      setExpBeneficiary('');
      setExpRef('');
      setExpNotes('');
      success(`Dépense de ${formatCurrency(amt, expenseCurrency)} enregistrée.`);
      loadFinances();
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        if (expMethod !== 'CASH') {
          setExpError('Une dépense hors espèces doit être confirmée par le service de paiement. Rétablissez la connexion avant de réessayer.');
        } else {
          try {
            await offlineSync.enqueueExpense(expensePayload);
            setShowExpenseModal(false);
            setExpAmount('');
            setExpBeneficiary('');
            setExpRef('');
            setExpNotes('');
            success(`Dépense de ${formatCurrency(amt, expenseCurrency)} enregistrée hors-ligne. Elle sera synchronisée dès le retour du réseau.`);
          } catch (storageError) {
            setExpError(storageError instanceof Error
              ? `La dépense n’a pas été enregistrée. ${storageError.message}`
              : 'La dépense n’a pas été enregistrée : stockage hors-ligne indisponible.');
          }
        }
      } else {
        setExpError(err.message || 'Erreur lors de l\'enregistrement de la dépense.');
      }
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpenError(null);
    const bal = Number(openBalance);
    if (!Number.isFinite(bal) || bal < 0) {
      setOpenError('Le fond d\'ouverture doit être un nombre valide (0 ou plus).');
      return;
    }
    if (!selectedRegisterId) {
      setOpenError('Veuillez sélectionner une caisse.');
      return;
    }
    setSubmittingOpen(true);
    try {
      await ApiClient.openCashSession({
        cashRegisterId: selectedRegisterId,
        openingBalance: openBalance,
        currency: cashCurrency,
        notes: openNotes.trim() || undefined,
      });
      setShowOpenModal(false);
      setOpenBalance('');
      setOpenNotes('');
      success('Session de caisse ouverte avec succès.');
      loadFinances();
    } catch (err: any) {
      setOpenError(err.message || 'Erreur lors de l\'ouverture de la caisse.');
    } finally {
      setSubmittingOpen(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    setCloseError(null);
    const counted = Number(countedBalance);
    if (!Number.isFinite(counted) || counted < 0) {
      setCloseError('Veuillez saisir un solde compté valide.');
      return;
    }
    setSubmittingClose(true);
    try {
      await ApiClient.closeCashSession(currentSession.id, countedBalance, closeNotes.trim() || undefined);
      setShowCloseModal(false);
      setCountedBalance('');
      setCloseNotes('');
      success('Caisse clôturée et enregistrée avec succès.');
      loadFinances();
    } catch (err: any) {
      setCloseError(err.message || 'Erreur lors de la clôture de caisse.');
    } finally {
      setSubmittingClose(false);
    }
  };

  // Calculs session
  const totalSessionCash = sumMoney((currentSession?.payments || []).map((payment: any) => String(payment.amount)));
  const cashMovementsIn = sumMoney((currentSession?.movements || [])
    .filter((movement: any) => movement.type === 'IN')
    .map((movement: any) => String(movement.amount)));
  const cashMovementsOut = sumMoney((currentSession?.movements || [])
    .filter((movement: any) => movement.type === 'OUT')
    .map((movement: any) => String(movement.amount)));
  const theoreticalTotal = subtractMoney(sumMoney([
    String(currentSession?.openingBalance || '0'),
    String(totalSessionCash),
    String(cashMovementsIn),
  ]), String(cashMovementsOut));
  const diff = subtractMoney(countedBalance || '0', String(theoreticalTotal));

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Chargement...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="alert alert-danger">
        <AlertTriangle size={15} className="alert-icon" />
        <div>
          <div className="alert-title">Erreur de chargement</div>
          <div className="alert-body">{loadError}</div>
          <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: '8px' }} onClick={loadFinances}>
            <RefreshCw size={12} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Ligne supérieure : caisse + comptes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Session de caisse */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '6px',
                background: currentSession ? '#F0FDF4' : '#FFFBEB',
                border: `1px solid ${currentSession ? '#BBF7D0' : '#FDE68A'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {currentSession
                  ? <Unlock size={15} color="#16A34A" />
                  : <Lock size={15} color="#D97706" />}
              </div>
              <span className="card-title">
                {currentSession ? `Session ${cashCurrency} ouverte` : `Caisse ${cashCurrency} fermée`}
              </span>
            </div>
            <select
              aria-label="Devise de la caisse"
              className="input-field"
              style={{ maxWidth: '110px' }}
              value={cashCurrency}
              onChange={(event) => {
                setCashCurrency(event.target.value === Currency.USD ? Currency.USD : Currency.CDF);
                setUseBilletage(false);
              }}
            >
              <option value={Currency.CDF}>CDF</option>
              <option value={Currency.USD}>USD</option>
            </select>
            {currentSession ? (
              <button
                type="button"
                className="btn btn-sm btn-danger-outline"
                onClick={() => {
                  setCountedBalance(String(theoreticalTotal));
                  setCloseError(null);
                  setShowCloseModal(true);
                }}
              >
                <Lock size={13} /> Clôturer
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => { setOpenError(null); setShowOpenModal(true); }}
                disabled={cashRegisters.length === 0}
              >
                <Unlock size={13} /> Ouvrir
              </button>
            )}
          </div>
          <div className="card-body">
            {currentSession ? (
              <>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '10px' }}>
                  Ouverte le {new Date(currentSession.openedAt).toLocaleString('fr-FR')}&ensp;·&ensp;
                  {currentSession.user?.firstName} {currentSession.user?.lastName}
                </div>
                <div className="totals-box">
                  <div className="stat-line">
                    <span className="stat-line-label">Fond d'ouverture</span>
                    <span className="stat-line-value">{formatCurrency(Number(currentSession.openingBalance), currentSession.currency || Currency.CDF)}</span>
                  </div>
                  <div className="stat-line">
                    <span className="stat-line-label">Espèces encaissées</span>
                    <span className="stat-line-value" style={{ color: '#16A34A' }}>
                      +{formatCurrency(totalSessionCash, currentSession.currency || Currency.CDF)}
                    </span>
                  </div>
                  {(cashMovementsIn > 0 || cashMovementsOut > 0) && (
                    <div className="stat-line">
                      <span className="stat-line-label">Mouvements de caisse</span>
                      <span className="stat-line-value">
                        {formatCurrency(subtractMoney(cashMovementsIn, cashMovementsOut), currentSession.currency)}
                      </span>
                    </div>
                  )}
                  <div className="stat-line">
                    <span className="stat-line-label">Total théorique</span>
                    <span className="stat-line-value font-bold">{formatCurrency(theoreticalTotal, currentSession.currency || Currency.CDF)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="table-empty" style={{ minHeight: '80px' }}>
                <div className="table-empty-sub">Aucune caisse ouverte. Ouvrez une session pour enregistrer les encaissements.</div>
              </div>
            )}
          </div>
        </div>

        {/* Comptes financiers */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Comptes financiers</span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={loadFinances}>
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {accounts.length === 0 ? (
              <div className="table-empty" style={{ minHeight: '80px' }}>
                <div className="table-empty-sub">Aucun compte enregistré.</div>
              </div>
            ) : (
              <div>
                {accounts.map((acc: any) => (
                  <div key={acc.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    borderBottom: '1px solid #F1F5F9',
                  }}>
                    <div style={{
                      width: '32px', height: '32px',
                      borderRadius: '8px',
                      background: acc.type === 'BANK' ? '#EFF6FF' : '#F0FDF4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {acc.type === 'BANK'
                        ? <Building size={15} color="#2563EB" />
                        : <Smartphone size={15} color="#16A34A" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{acc.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{acc.type === 'BANK' ? 'Compte bancaire' : 'Mobile Money'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: Number(acc.balance) >= 0 ? '#111827' : '#DC2626', fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatCurrency(Number(acc.balance), acc.currency || Currency.CDF)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Journal des dépenses */}
      <div className="table-wrapper">
        <div className="table-toolbar">
          <span className="table-toolbar-title">Journal des dépenses</span>
          <div className="table-toolbar-actions">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                if (!expenses.length) {
                  toastError('Aucune dépense à exporter.');
                  return;
                }
                const rows = expenses.map((exp) => ({
                  'Date': new Date(exp.createdAt).toLocaleDateString('fr-FR'),
                  'Catégorie': exp.category,
                  'Bénéficiaire': exp.beneficiary,
                  'Mode Paiement': exp.method,
                  'Référence': exp.reference || '—',
                  'Montant': exp.amount,
                  'Devise': exp.currency || 'CDF',
                  'Observations': exp.notes || '—',
                }));
                exportToCsv('Depenses_OpenPME', rows);
                success('Journal des dépenses exporté avec succès !');
              }}
              title="Exporter les dépenses vers Excel/CSV"
            >
              <FileSpreadsheet size={13} /> Exporter Excel
            </button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={loadFinances}>
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setExpError(null);
                setExpAmount('');
                setExpBeneficiary('');
                setExpRef('');
                setExpNotes('');
                setShowExpenseModal(true);
              }}
            >
              <Plus size={14} />
              Nouvelle dépense
            </button>
          </div>
        </div>
        <div className="table-container">
          {expenses.length === 0 ? (
            <div className="table-empty">
              <ArrowDownCircle className="table-empty-icon" />
              <div className="table-empty-title">Aucune dépense enregistrée</div>
              <div className="table-empty-sub">Les dépenses enregistrées apparaîtront ici.</div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setExpError(null); setShowExpenseModal(true); }}>
                <Plus size={13} /> Enregistrer une dépense
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Catégorie</th>
                  <th>Bénéficiaire</th>
                  <th>Mode</th>
                  <th>Référence</th>
                  <th className="col-amount">Montant</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp: any) => (
                  <tr key={exp.id}>
                    <td style={{ fontSize: '0.8125rem' }}>{new Date(exp.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span className="badge badge-neutral">{exp.category}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{exp.beneficiary}</td>
                    <td style={{ fontSize: '0.75rem', color: '#6B7280' }}>{exp.method}</td>
                    <td className="col-mono">{exp.reference || <span className="text-tertiary">—</span>}</td>
                    <td className="col-amount text-danger font-semibold">
                      − {formatCurrency(Number(exp.amount), exp.currency || 'CDF')}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#6B7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.notes || <span className="text-tertiary">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal Nouvelle Dépense ── */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownCircle size={16} color="#DC2626" />
                <span className="modal-title">Enregistrer une dépense</span>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowExpenseModal(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="modal-body">
                {expError && (
                  <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{expError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="exp-cat">Catégorie <span className="required">*</span></label>
                  <select id="exp-cat" className="input-field" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="exp-currency">Devise</label>
                    <select id="exp-currency" className="input-field" value={expenseCurrency}
                      onChange={(e) => {
                        const currency = e.target.value === Currency.USD ? Currency.USD : Currency.CDF;
                        setExpenseCurrency(currency);
                        setExpAccountId(accounts.find((account: any) => account.currency === currency)?.id || '');
                      }}>
                      <option value={Currency.CDF}>CDF</option>
                      <option value={Currency.USD}>USD</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="exp-amount">Montant ({expenseCurrency}) <span className="required">*</span></label>
                    <input id="exp-amount" type="number" min="0.01" step={expenseCurrency === Currency.CDF ? '1' : '0.01'} required className="input-field"
                      placeholder="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="exp-method">Mode de paiement</label>
                    <select id="exp-method" className="input-field" value={expMethod} onChange={(e) => setExpMethod(e.target.value)}>
                      <option value="CASH">Espèces</option>
                      <option value="BANK_TRANSFER">Virement bancaire</option>
                      <option value="MOBILE_MONEY_MPESA">M-Pesa</option>
                      <option value="MOBILE_MONEY_AIRTEL">Airtel Money</option>
                      <option value="CHECK">Chèque</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="exp-beneficiary">Bénéficiaire <span className="required">*</span></label>
                  <input id="exp-beneficiary" type="text" required className="input-field"
                    placeholder="Nom du fournisseur ou bénéficiaire" value={expBeneficiary}
                    onChange={(e) => setExpBeneficiary(e.target.value)} />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="exp-ref">Référence / Pièce justificative</label>
                    <input id="exp-ref" type="text" className="input-field"
                      placeholder="N° reçu, facture..." value={expRef}
                      onChange={(e) => setExpRef(e.target.value)} />
                  </div>
                  {expMethod !== 'CASH' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="exp-account">Compte débité</label>
                      <select id="exp-account" className="input-field" value={expAccountId} onChange={(e) => setExpAccountId(e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        {accounts.filter((account: any) => account.currency === expenseCurrency)
                          .map((account: any) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="exp-notes">Notes internes</label>
                  <input id="exp-notes" type="text" className="input-field"
                    placeholder="Commentaire facultatif..." value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Annuler</button>
                <button type="submit" disabled={submittingExpense} className="btn btn-danger">
                  {submittingExpense ? (
                    <><span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Enregistrement...</>
                  ) : <><ArrowDownCircle size={14} /> Enregistrer la dépense</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Ouverture Caisse ── */}
      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Unlock size={16} color="#16A34A" />
                <span className="modal-title">Ouverture de caisse</span>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowOpenModal(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleOpenSession}>
              <div className="modal-body">
                {openError && (
                  <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{openError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="open-register">Caisse <span className="required">*</span></label>
                  <select id="open-register" className="input-field" value={selectedRegisterId}
                    onChange={(e) => setSelectedRegisterId(e.target.value)}>
                    {cashRegisters.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="open-balance">
                    Fond de caisse initial ({cashCurrency}) <span className="required">*</span>
                  </label>
                  <input id="open-balance" type="number" min="0" step={cashCurrency === Currency.CDF ? '1' : '0.01'} required className="input-field"
                    placeholder="Montant compté en espèces" value={openBalance}
                    onChange={(e) => setOpenBalance(e.target.value)} />
                  <div className="form-hint">Saisissez le montant réel compté en espèces au moment de l'ouverture.</div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="open-notes">Notes d'ouverture</label>
                  <input id="open-notes" type="text" className="input-field"
                    placeholder="Observation facultative..." value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>Annuler</button>
                <button type="submit" disabled={submittingOpen} className="btn btn-success">
                  {submittingOpen ? (
                    <><span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Ouverture...</>
                  ) : <><Unlock size={14} /> Ouvrir la caisse</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Clôture Caisse ── */}
      {showCloseModal && currentSession && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} color="#DC2626" />
                <span className="modal-title">Clôture de caisse</span>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowCloseModal(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCloseSession}>
              <div className="modal-body">
                {closeError && (
                  <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{closeError}</span>
                  </div>
                )}

                {/* Résumé session (Clôture à l'aveugle pour le caissier) */}
                {isManager ? (
                  <div className="totals-box" style={{ marginBottom: '16px' }}>
                    <div className="stat-line">
                      <span className="stat-line-label">Fond d'ouverture</span>
                      <span className="stat-line-value">{formatCurrency(Number(currentSession.openingBalance), currentSession.currency)}</span>
                    </div>
                    <div className="stat-line">
                      <span className="stat-line-label">Encaissements espèces</span>
                      <span className="stat-line-value text-success">+{formatCurrency(totalSessionCash, currentSession.currency)}</span>
                    </div>
                    <div className="stat-line" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '4px' }}>
                      <span className="stat-line-label font-semibold">Total théorique attendu</span>
                      <span className="stat-line-value font-bold">{formatCurrency(theoreticalTotal, currentSession.currency)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '0.8125rem',
                    color: '#475569',
                    marginBottom: '16px',
                  }}>
                    <strong>Procédure de clôture à l'aveugle :</strong> Comptez physiquement les espèces présentes dans le tiroir-caisse et saisissez le montant total.
                  </div>
                )}

                {/* Option Billetage */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Solde réel compté ({currentSession.currency}) <span className="required">*</span>
                  </label>
                  {cashCurrency === Currency.CDF && (
                    <button
                      type="button"
                      onClick={() => setUseBilletage(!useBilletage)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {useBilletage ? 'Saisie directe simple' : 'Aide au comptage (Billetage CDF)'}
                    </button>
                  )}
                </div>

                {cashCurrency === Currency.CDF && useBilletage ? (
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '10px',
                    marginBottom: '14px',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Comptage des coupures en Francs Congolais (CDF) :
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { label: '20 000 CDF', val: b20k, set: setB20k, factor: 20000 },
                        { label: '10 000 CDF', val: b10k, set: setB10k, factor: 10000 },
                        { label: '5 000 CDF', val: b5k, set: setB5k, factor: 5000 },
                        { label: '1 000 CDF', val: b1k, set: setB1k, factor: 1000 },
                        { label: '500 CDF', val: b500, set: setB500, factor: 500 },
                        { label: 'Monnaie / Pièces', val: bPieces, set: setBPieces, factor: 1 },
                      ].map((item) => (
                        <div key={item.label}>
                          <label style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>{item.label}</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="input-field"
                            style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                            value={item.val}
                            onChange={(e) => {
                              item.set(e.target.value);
                              // Recalcul immédiat
                              const v20 = item.factor === 20000 ? (parseInt(e.target.value, 10) || 0) : (parseInt(b20k, 10) || 0);
                              const v10 = item.factor === 10000 ? (parseInt(e.target.value, 10) || 0) : (parseInt(b10k, 10) || 0);
                              const v5 = item.factor === 5000 ? (parseInt(e.target.value, 10) || 0) : (parseInt(b5k, 10) || 0);
                              const v1 = item.factor === 1000 ? (parseInt(e.target.value, 10) || 0) : (parseInt(b1k, 10) || 0);
                              const v500 = item.factor === 500 ? (parseInt(e.target.value, 10) || 0) : (parseInt(b500, 10) || 0);
                              const vp = item.factor === 1 ? (parseFloat(e.target.value) || 0) : (parseFloat(bPieces) || 0);
                              const total = v20 * 20000 + v10 * 10000 + v5 * 5000 + v1 * 1000 + v500 * 500 + vp;
                              setCountedBalance(String(total));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                      Total compté : {((parseFloat(countedBalance) || 0)).toLocaleString('fr-FR')} {currentSession.currency}
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <input id="close-balance" type="number" min="0" step={currentSession.currency === Currency.CDF ? '1' : '0.01'} required className="input-field"
                      placeholder={`Solde compté en ${currentSession.currency}`}
                      value={countedBalance} onChange={(e) => setCountedBalance(e.target.value)} />
                  </div>
                )}

                {/* Écart calculé en temps réel */}
                {countedBalance !== '' && (
                  <div style={{
                    background: Math.abs(diff) < 1 ? '#F0FDF4' : diff < 0 ? '#FEF2F2' : '#FFFBEB',
                    border: `1px solid ${Math.abs(diff) < 1 ? '#BBF7D0' : diff < 0 ? '#FECACA' : '#FDE68A'}`,
                    borderRadius: '6px',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                  }}>
                    <span style={{ color: '#4B5563' }}>Écart de caisse :</span>
                    <strong style={{ color: Math.abs(diff) < 1 ? '#16A34A' : diff < 0 ? '#DC2626' : '#D97706' }}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff, currentSession.currency)}
                      {Math.abs(diff) < 1 && ' — Caisse équilibrée'}
                      {diff < -1 && ' — Manquant'}
                      {diff > 1 && ' — Excédent'}
                    </strong>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="close-notes">
                    Observations de clôture {diff < -1 && <span className="required">* (Obligatoire si manquant)</span>}
                  </label>
                  <input id="close-notes" type="text" className="input-field"
                    required={diff < -1}
                    placeholder="Raison d'un éventuel écart ou observation..." value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>Annuler</button>
                <button type="submit" disabled={submittingClose} className="btn btn-danger">
                  {submittingClose ? (
                    <><span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Clôture en cours...</>
                  ) : <><Lock size={14} /> Valider la clôture</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
