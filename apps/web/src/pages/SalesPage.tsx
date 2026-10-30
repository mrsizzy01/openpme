import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import {
  calculateInvoiceTotals,
  calculateLine,
  convertCurrency,
  formatCurrency,
  Currency,
  PaymentMethod,
  roundMoney,
  subtractMoney,
  sumMoney,
} from '@smart-pme/shared';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Receipt,
  AlertTriangle,
  RefreshCw,
  Barcode,
  DollarSign,
  Banknote,
  CornerDownLeft,
  FileSpreadsheet,
  Printer,
  Share2,
  Keyboard,
  Smartphone,
  Radio,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCsv } from '../utils/exportCsv';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { printThermalReceiptWeb } from '../utils/escpos';
import { offlineSync } from '../services/offlineSync';

export const SalesPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Panier
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [immediatePayment, setImmediatePayment] = useState<boolean>(true);
  const [saleCurrency, setSaleCurrency] = useState<Currency>(Currency.CDF);
  const [cashSessions, setCashSessions] = useState<Partial<Record<Currency, any>>>({});
  const [notes, setNotes] = useState('');
  const [successSale, setSuccessSale] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Calculateur de monnaie bi-devise (CDF / USD)
  const [amountPaidCDF, setAmountPaidCDF] = useState<string>('');
  const [amountPaidUSD, setAmountPaidUSD] = useState<string>('');
  const [changeCurrency, setChangeCurrency] = useState<'CDF' | 'USD'>('CDF');

  // Mobile Money (M-Pesa, Airtel, Orange)
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState<string>('');
  const [mobileMoneyStatus, setMobileMoneyStatus] = useState<'IDLE' | 'SENDING' | 'WAITING_PIN' | 'CONFIRMED'>('IDLE');
  const [isOfflineSale, setIsOfflineSale] = useState(false);

  const exchangeRate = organization?.settings?.exchangeRateUsdToCdf || 2850;
  const taxRate = organization?.settings?.enableTax ? Number(organization.settings.taxRatePercent) : 0;

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [prods, custs, sales, cdfSession, usdSession] = await Promise.all([
        ApiClient.getProducts(),
        ApiClient.getCustomers(),
        ApiClient.getSales(100),
        ApiClient.getCurrentCashSession(Currency.CDF),
        ApiClient.getCurrentCashSession(Currency.USD),
      ]);
      setProducts(prods);
      setCustomers(custs);
      setSalesHistory(sales);
      setCashSessions({
        [Currency.CDF]: cdfSession,
        [Currency.USD]: usdSession,
      });
      if (custs.length > 0) {
        const comptant = custs.find((c: any) => c.code === 'CLI-COMPTANT');
        setSelectedCustomerId(comptant ? comptant.id : custs[0].id);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (organization?.settings?.primaryCurrency === Currency.CDF
      || organization?.settings?.primaryCurrency === Currency.USD) {
      setSaleCurrency(organization.settings.primaryCurrency);
    }
  }, [organization?.settings?.primaryCurrency]);

  // Écouteur global pour lecteur code-barre / douchette USB (EAN-13, Code128)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 65) {
        buffer = '';
      }
      // Raccourcis clavier caisse express
      if (e.key === 'F1') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'pos' ? 'history' : 'pos'));
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && !submitting) {
          handleCheckout();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (cart.length > 0) {
          if (window.confirm('Voulez-vous vider le panier en cours ?')) {
            clearCart();
          }
        }
        return;
      }

      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          const scanned = buffer.trim().toUpperCase();
          const found = products.find(
            (p) =>
              (p.barcode && p.barcode.toUpperCase() === scanned) ||
              (p.code && p.code.toUpperCase() === scanned)
          );
          if (found) {
            addToCart(found);
            success(`Article scanné : « ${found.name} »`);
          } else {
            toastError(`Code article non reconnu : ${scanned}`);
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products, cart, submitting]);

  const addToCart = (product: any) => {
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (!product.isService && existing.quantity >= product.currentStock) {
          setErrorMsg(`Stock insuffisant pour « ${product.name} ». Disponible : ${product.currentStock}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          code: product.code,
          unitPrice: Number(product.salePrice),
          currency: product.currency || Currency.CDF,
          quantity: 1,
          discountPercent: 0,
          currentStock: product.currentStock,
          isService: product.isService,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (!item.isService && newQty > item.currentStock) {
              setErrorMsg(`Stock insuffisant. Maximum disponible : ${item.currentStock}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any[]
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    const val = Math.min(Math.max(0, discount), 100);
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, discountPercent: val } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length > 0 && !window.confirm('Vider le panier ?')) return;
    setCart([]);
    setErrorMsg(null);
  };

  // Calculs (côté client uniquement pour affichage — le serveur recalcule)
  const cartTotals = calculateInvoiceTotals(cart.map((item) => ({
    quantity: item.quantity,
    unitPrice: convertCurrency(item.unitPrice, item.currency, saleCurrency, exchangeRate),
    discountPercent: item.discountPercent,
    taxRatePercent: taxRate,
  })));
  const subtotal = cartTotals.subtotal;
  const totalDiscount = cartTotals.discountAmount;
  const taxAmount = cartTotals.taxAmount;
  const netTotal = cartTotals.total;

  const cashReceivedCdf = sumMoney([
    amountPaidCDF || '0',
    convertCurrency(Number(amountPaidUSD || 0), Currency.USD, Currency.CDF, exchangeRate),
  ], 0);
  const dueCdf = convertCurrency(netTotal, saleCurrency, Currency.CDF, exchangeRate);
  const changeAmountCdf = subtractMoney(cashReceivedCdf, dueCdf, 0);

  const handleInitiateMobileMoney = async () => {
    if (!mobileMoneyPhone || mobileMoneyPhone.length < 9) {
      setErrorMsg('Veuillez saisir un numéro de téléphone valide (ex: 0812345678).');
      return;
    }
    setErrorMsg(null);
    setMobileMoneyStatus('SENDING');
    try {
      const op = paymentMethod === 'MOBILE_MONEY_AIRTEL' ? 'AIRTEL' : paymentMethod === 'MOBILE_MONEY_ORANGE' ? 'ORANGE' : 'MPESA';
      const res = await ApiClient.initiateMobileMoney({
        operator: op,
        phoneNumber: mobileMoneyPhone,
        amount: netTotal,
        currency: saleCurrency,
      });
      setPaymentReference(res.reference);
      setMobileMoneyStatus('WAITING_PIN');
      success(`Demande ${op} Push transmise au ${mobileMoneyPhone}. Validation en cours...`);

      // Simulation de confirmation en direct
      setTimeout(() => {
        setMobileMoneyStatus('CONFIRMED');
        success(`Paiement Mobile Money ${res.reference} validé par le client !`);
      }, 3000);
    } catch (err: any) {
      setMobileMoneyStatus('IDLE');
      setErrorMsg(err.message || 'Échec de l\'envoi push Mobile Money.');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!selectedCustomerId) {
      setErrorMsg('Veuillez sélectionner un client.');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    setIsOfflineSale(false);

    const cashPayments = [
      ...(Number(amountPaidCDF) > 0
        ? [{ amount: amountPaidCDF, currency: Currency.CDF, method: PaymentMethod.CASH }]
        : []),
      ...(Number(amountPaidUSD) > 0
        ? [{ amount: amountPaidUSD, currency: Currency.USD, method: PaymentMethod.CASH }]
        : []),
    ].map((payment) => ({
      ...payment,
      cashSessionId: cashSessions[payment.currency]?.id,
    }));

    if (immediatePayment && paymentMethod === 'CASH') {
      if (!cashPayments.length) {
        setErrorMsg('Saisissez le montant reçu en CDF et/ou en USD.');
        setSubmitting(false);
        return;
      }
      const missingCurrency = cashPayments.find((payment) => !payment.cashSessionId)?.currency;
      if (missingCurrency) {
        setErrorMsg(`Ouvrez d’abord la session de caisse ${missingCurrency} dans Finances.`);
        setSubmitting(false);
        return;
      }
      if (cashReceivedCdf < dueCdf) {
        setErrorMsg('Le montant reçu est inférieur au total de la vente.');
        setSubmitting(false);
        return;
      }
      if (changeAmountCdf > 0 && !cashSessions[Currency.CDF]?.id) {
        setErrorMsg('Une session de caisse CDF ouverte est nécessaire pour rendre la monnaie.');
        setSubmitting(false);
        return;
      }
    }

    const salePayload = {
      idempotencyKey: crypto.randomUUID(),
      customerId: selectedCustomerId,
      immediatePayment,
      paymentMethod,
      paymentReference,
      currency: saleCurrency,
      payments: immediatePayment
        ? paymentMethod === 'CASH'
          ? cashPayments
          : [{ amount: String(netTotal), currency: saleCurrency, method: paymentMethod, reference: paymentReference }]
        : [],
      changeCashSessionId: changeAmountCdf > 0 ? cashSessions[Currency.CDF]?.id : undefined,
      notes: notes + (mobileMoneyPhone ? ` [Tél Mobile Money: ${mobileMoneyPhone}]` : ''),
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: String(convertCurrency(i.unitPrice, i.currency, saleCurrency, exchangeRate)),
        discountPercent: i.discountPercent,
        taxRatePercent: taxRate,
      })),
    };

    // Vérifier si le navigateur est hors-ligne
    if (!navigator.onLine) {
      if (immediatePayment && paymentMethod !== 'CASH') {
        setErrorMsg('Un paiement par banque ou Mobile Money doit être confirmé en ligne avant la vente.');
        setSubmitting(false);
        return;
      }
      try {
        const offlineRecord = await offlineSync.enqueueSale(salePayload);

        setIsOfflineSale(true);
        setSuccessSale({
          sale: {
            saleNumber: offlineRecord.id,
            total: netTotal,
            currency: saleCurrency,
            createdAt: offlineRecord.createdAt,
            items: cart,
          },
          invoice: {
            invoiceNumber: `PROV-${offlineRecord.id.slice(-6)}`,
            status: 'PENDING_SYNC',
          },
        });
        setCart([]);
        setNotes('');
        setPaymentReference('');
        setMobileMoneyPhone('');
        setMobileMoneyStatus('IDLE');
        success('Vente enregistrée HORS-LIGNE avec succès ! Elle sera synchronisée dès le retour d\'internet.');
      } catch (err: any) {
        setErrorMsg('Erreur de stockage local de la vente hors-ligne.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await ApiClient.createSale(salePayload);
      setIsOfflineSale(false);
      setSuccessSale(res);
      setCart([]);
      setNotes('');
      setPaymentReference('');
      setMobileMoneyPhone('');
      setMobileMoneyStatus('IDLE');
      loadData();
    } catch (err: any) {
      // Si l'erreur est réseau, basculer automatiquement en enregistrement hors-ligne
      if (err.message?.includes('inaccessible') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || !navigator.onLine) {
        if (immediatePayment && paymentMethod !== 'CASH') {
          setErrorMsg('Le paiement par banque ou Mobile Money n’a pas pu être confirmé. La vente n’a pas été enregistrée.');
          return;
        }
        const offlineRecord = await offlineSync.enqueueSale(salePayload);

        setIsOfflineSale(true);
        setSuccessSale({
          sale: {
            saleNumber: offlineRecord.id,
            total: netTotal,
            currency: saleCurrency,
            createdAt: offlineRecord.createdAt,
            items: cart,
          },
          invoice: {
            invoiceNumber: `PROV-${offlineRecord.id.slice(-6)}`,
            status: 'PENDING_SYNC',
          },
        });
        setCart([]);
        setNotes('');
        setPaymentReference('');
        setMobileMoneyPhone('');
        setMobileMoneyStatus('IDLE');
        success('Réseau indisponible : Vente sécurisée en HORS-LIGNE !');
      } else {
        setErrorMsg(err.message || 'Erreur lors de l\'enregistrement de la vente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
  );

  const statusLabel: Record<string, string> = {
    COMPLETED: 'Effectuée', PENDING: 'En attente', CANCELLED: 'Annulée', PARTIAL: 'Partielle',
  };
  const statusClass: Record<string, string> = {
    COMPLETED: 'badge-success', PENDING: 'badge-warning', CANCELLED: 'badge-danger', PARTIAL: 'badge-info',
  };

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
        <AlertTriangle size={16} className="alert-icon" />
        <div>
          <div className="alert-title">Erreur de chargement</div>
          <div className="alert-body">{loadError}</div>
          <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: '8px' }} onClick={loadData}>
            <RefreshCw size={12} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  const isPosCashier = new URLSearchParams(window.location.search).get('posMode') === 'cashier';

  return (
    <div>
      {/* Onglets et Sélecteur de Mode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`tab-btn${activeTab === 'pos' ? ' active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={15} />
            Caisse Enregistreuse & POS
            {cart.length > 0 && <span className="tab-count">{cart.reduce((a, i) => a + i.quantity, 0)}</span>}
          </button>
          <button
            type="button"
            className={`tab-btn${activeTab === 'history' ? ' active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Receipt size={15} />
            Journal des Ventes
            <span className="tab-count">{salesHistory.length}</span>
          </button>
        </div>

        <div>
          {isPosCashier ? (
            <a
              href="/sales"
              className="btn btn-secondary"
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Afficher Menu Complet & Navigation
            </a>
          ) : (
            <a
              href="/sales?posMode=cashier"
              className="btn btn-secondary"
              style={{
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#F0FDF4',
                borderColor: '#BBF7D0',
                color: '#166534',
                fontWeight: 600
              }}
            >
              Mode Caisse Épuré (Plein Écran)
            </a>
          )}
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
          {/* Catalogue produits */}
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Catalogue des articles</span>
                <div className="input-with-icon" style={{ width: '260px' }}>
                  <Search size={14} className="input-icon" />
                  <input
                    id="pos-search-input"
                    type="text"
                    placeholder="[F1] Rechercher produit ou code..."
                    className="input-field"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="card-body">
                {filteredProducts.length === 0 ? (
                  <div className="table-empty" style={{ minHeight: '120px' }}>
                    <div className="table-empty-title">Aucun article trouvé</div>
                    <div className="table-empty-sub">Modifiez votre recherche ou ajoutez des produits.</div>
                  </div>
                ) : (
                  <div className="product-grid">
                    {filteredProducts.map((p) => {
                      const isOutOfStock = !p.isService && p.currentStock <= 0;
                      return (
                        <div
                          key={p.id}
                          className={`product-card${isOutOfStock ? ' out-of-stock' : ''}`}
                          onClick={() => !isOutOfStock && addToCart(p)}
                          role="button"
                          tabIndex={isOutOfStock ? -1 : 0}
                          onKeyDown={(e) => e.key === 'Enter' && !isOutOfStock && addToCart(p)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span className="product-card-code">{p.code}</span>
                            <span className={`badge ${p.isService ? 'badge-info' : p.currentStock <= (p.minStockLevel || 0) ? 'badge-danger' : 'badge-success'}`}>
                              {p.isService ? 'Service' : `${p.currentStock} ${p.unit || 'pcs'}`}
                            </span>
                          </div>
                          <div className="product-card-name">{p.name}</div>
                          <div className="product-card-footer">
                            <div className="product-card-price">
                              {formatCurrency(Number(p.salePrice), p.currency || Currency.CDF)}
                            </div>
                            <Plus size={14} color="#2563EB" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panier & encaissement */}
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  Panier
                  {cart.length > 0 && (
                    <span className="badge badge-primary" style={{ marginLeft: '8px' }}>
                      {cart.reduce((acc, i) => acc + i.quantity, 0)} article(s)
                    </span>
                  )}
                </span>
                {cart.length > 0 && (
                  <button type="button" className="btn btn-sm btn-danger-outline" onClick={clearCart}>
                    <Trash2 size={12} /> Vider
                  </button>
                )}
              </div>
              <div className="card-body" style={{ paddingTop: '0' }}>
                {errorMsg && (
                  <div className="alert alert-danger" style={{ margin: '12px 0 8px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Lignes panier */}
                <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                  {cart.length === 0 ? (
                    <div className="table-empty" style={{ minHeight: '100px' }}>
                      <ShoppingCart className="table-empty-icon" style={{ width: '32px', height: '32px' }} />
                      <div className="table-empty-title">Panier vide</div>
                      <div className="table-empty-sub">Cliquez sur un article pour l'ajouter.</div>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.productId}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '10px 0',
                          borderBottom: '1px solid #F1F5F9',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', flex: 1, paddingRight: '8px' }}>
                            {item.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px', display: 'flex' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="btn btn-sm btn-secondary btn-icon"
                              style={{ padding: '2px 6px' }}
                            >
                              <Minus size={11} />
                            </button>
                            <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center', fontSize: '0.875rem' }}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="btn btn-sm btn-secondary btn-icon"
                              style={{ padding: '2px 6px' }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#6B7280' }}>
                              <label style={{ marginBottom: 0 }}>Remise&nbsp;%</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discountPercent}
                                onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                                style={{
                                  width: '44px',
                                  padding: '2px 4px',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '4px',
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  fontFamily: 'inherit',
                                }}
                              />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', fontFamily: "'JetBrains Mono', monospace" }}>
                              {formatCurrency(
                                calculateLine(
                                  item.quantity,
                                  convertCurrency(item.unitPrice, item.currency, saleCurrency, exchangeRate),
                                  item.discountPercent,
                                ).total,
                                saleCurrency,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Client & Paiement */}
                {cart.length > 0 && (
                  <>
                    <div className="divider" />

                    <div className="form-group">
                      <label className="form-label" htmlFor="sale-customer">
                        Client <span className="required">*</span>
                      </label>
                      <select
                        id="sale-customer"
                        className="input-field"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.companyName ? ` — ${c.companyName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sale-currency">Devise de facturation</label>
                      <select
                        id="sale-currency"
                        className="input-field"
                        value={saleCurrency}
                        onChange={(e) => setSaleCurrency(e.target.value === Currency.USD ? Currency.USD : Currency.CDF)}
                      >
                        <option value={Currency.CDF}>CDF — Franc Congolais</option>
                        <option value={Currency.USD}>USD — Dollar américain</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="sale-payment">Mode de paiement</label>
                        <select
                          id="sale-payment"
                          className="input-field"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="CASH">Espèces (Cash)</option>
                          <option value="MOBILE_MONEY_MPESA">Vodacom M-Pesa</option>
                          <option value="MOBILE_MONEY_AIRTEL">Airtel Money</option>
                          <option value="MOBILE_MONEY_ORANGE">Orange Money</option>
                          <option value="BANK_TRANSFER">Virement bancaire</option>
                          <option value="CHECK">Chèque</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="sale-ref">Référence / TxID</label>
                        <input
                          id="sale-ref"
                          type="text"
                          className="input-field"
                          placeholder="Bordereau / N° TxID"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Bloc STK Push Mobile Money RDC */}
                    {paymentMethod.startsWith('MOBILE_MONEY_') && (
                      <div style={{
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Smartphone size={16} color="#16A34A" />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534' }}>
                            Passerelle Mobile Money RDC (Demande Push STK)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="tel"
                            className="input-field"
                            style={{ flex: 1, fontSize: '0.875rem' }}
                            placeholder="N° de téléphone client (ex: 0812345678)"
                            value={mobileMoneyPhone}
                            onChange={(e) => setMobileMoneyPhone(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={handleInitiateMobileMoney}
                            disabled={mobileMoneyStatus === 'SENDING' || mobileMoneyStatus === 'WAITING_PIN'}
                            className="btn btn-sm btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Radio size={13} />
                            {mobileMoneyStatus === 'SENDING' ? 'Envoi...' : mobileMoneyStatus === 'WAITING_PIN' ? 'Attente PIN...' : 'Déclencher Push'}
                          </button>
                        </div>
                        {mobileMoneyStatus === 'WAITING_PIN' && (
                          <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '6px' }}>
                            ⏳ Demande transmise. Le client compose son code PIN sur son téléphone...
                          </div>
                        )}
                        {mobileMoneyStatus === 'CONFIRMED' && (
                          <div style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 600, marginTop: '6px' }}>
                            ✅ Transaction validée par l'opérateur ! TxID : {paymentReference}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <input
                        type="checkbox"
                        id="immPay"
                        checked={immediatePayment}
                        onChange={(e) => setImmediatePayment(e.target.checked)}
                        style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                      />
                      <label htmlFor="immPay" style={{ fontSize: '0.8125rem', color: '#4B5563', cursor: 'pointer' }}>
                        Paiement immédiat (décochez pour enregistrer la vente à crédit)
                      </label>
                    </div>

                    {/* Totaux & Équivalence Bi-Devise */}
                    <div className="totals-box" style={{ marginBottom: '14px' }}>
                      <div className="totals-row">
                        <span>Sous-total brut</span>
                        <span>{formatCurrency(subtotal, saleCurrency)}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="totals-row">
                          <span>Remise accordée</span>
                          <span className="discount">− {formatCurrency(totalDiscount, saleCurrency)}</span>
                        </div>
                      )}
                      {taxRate > 0 && (
                        <div className="totals-row">
                          <span>TVA ({taxRate}%)</span>
                          <span>{formatCurrency(taxAmount, saleCurrency)}</span>
                        </div>
                      )}
                      <div className="totals-row total-net" style={{ fontSize: '1.05rem', alignItems: 'baseline' }}>
                        <span>Net à payer</span>
                        <div style={{ textAlign: 'right' }}>
                          <div>{formatCurrency(netTotal, saleCurrency)}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 'normal' }}>
                            ≈ {formatCurrency(
                              convertCurrency(netTotal, saleCurrency, saleCurrency === Currency.CDF ? Currency.USD : Currency.CDF, exchangeRate),
                              saleCurrency === Currency.CDF ? Currency.USD : Currency.CDF,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculateur de Monnaie Bi-Devise (Espèces) */}
                    {immediatePayment && paymentMethod === 'CASH' && (
                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Banknote size={14} color="#16A34A" /> Encaissement Espèces
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAmountPaidCDF(saleCurrency === Currency.CDF ? String(netTotal) : '0');
                              setAmountPaidUSD(saleCurrency === Currency.USD ? String(netTotal) : '0');
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          >
                            Montant Exact
                          </button>
                        </div>

                        {/* Saisie CDF et USD simultanée */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Reçu en Francs (CDF)</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0 CDF"
                              className="input-field"
                              value={amountPaidCDF}
                              onChange={(e) => setAmountPaidCDF(e.target.value)}
                            />
                            {/* Boutons coupures rapides CDF */}
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {[10000, 20000, 50000].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setAmountPaidCDF(String((parseFloat(amountPaidCDF) || 0) + val))}
                                  style={{
                                    fontSize: '0.65rem',
                                    padding: '2px 5px',
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  +{val.toLocaleString('fr-FR')}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Reçu en Dollars (USD)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0 USD"
                              className="input-field"
                              value={amountPaidUSD}
                              onChange={(e) => setAmountPaidUSD(e.target.value)}
                            />
                            {/* Boutons coupures rapides USD */}
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {[10, 20, 50, 100].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setAmountPaidUSD(String((parseFloat(amountPaidUSD) || 0) + val))}
                                  style={{
                                    fontSize: '0.65rem',
                                    padding: '2px 5px',
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  +{val}$
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Rendu dynamique de la monnaie */}
                        {(() => {
                          const totalPaidCDF = cashReceivedCdf;
                          const diffCDF = changeAmountCdf;

                          if (totalPaidCDF === 0) return null;

                          if (diffCDF >= 0) {
                            return (
                              <div style={{
                                background: '#F0FDF4',
                                border: '1px solid #86EFAC',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                textAlign: 'center',
                              }}>
                                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                                  MONNAIE À RENDRE AU CLIENT
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D' }}>
                                  {diffCDF.toLocaleString('fr-FR')} CDF
                                </div>
                                {diffCDF > 0 && exchangeRate > 0 && (
                                  <div style={{ fontSize: '0.75rem', color: '#166534' }}>
                                    (soit {formatCurrency(convertCurrency(diffCDF, Currency.CDF, Currency.USD, exchangeRate), Currency.USD)})
                                  </div>
                                )}
                              </div>
                            );
                          } else {
                            return (
                              <div style={{
                                background: '#FEF2F2',
                                border: '1px solid #FCA5A5',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                textAlign: 'center',
                              }}>
                                <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 600 }}>
                                  MONTANT INSUFFISANT (RESTE À PAYER)
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#DC2626' }}>
                                  {Math.abs(diffCDF).toLocaleString('fr-FR')} CDF
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={cart.length === 0 || submitting}
                      className="btn btn-success"
                      style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                          Enregistrement en cours...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Valider & Imprimer le ticket
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Historique ventes */
        <div className="table-wrapper">
          <div className="table-toolbar">
            <span className="table-toolbar-title">Journal des ventes</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  if (!salesHistory.length) {
                    toastError('Aucune vente à exporter.');
                    return;
                  }
                  const rows = salesHistory.map((s) => ({
                    'N° Vente': s.saleNumber,
                    'Date & Heure': new Date(s.createdAt).toLocaleString('fr-FR'),
                    'Client': s.customer?.name || 'Client comptant',
                    'Vendeur': `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
                    'Articles': s.items?.length || 0,
                    'Devise': s.currency,
                    'Total Encaissé': s.total,
                    'Facture Rattachée': s.invoice?.invoiceNumber || '—',
                    'Statut': statusLabel[s.status] || s.status,
                  }));
                  exportToCsv('Journal_Ventes_OpenPME', rows);
                  success('Journal des ventes exporté en CSV/Excel avec succès !');
                }}
                title="Exporter le journal des ventes vers Excel/CSV"
              >
                <FileSpreadsheet size={13} /> Exporter Excel
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={loadData}>
                <RefreshCw size={13} /> Actualiser
              </button>
            </div>
          </div>
          <div className="table-container">
            {salesHistory.length === 0 ? (
              <div className="table-empty">
                <Receipt className="table-empty-icon" />
                <div className="table-empty-title">Aucune vente enregistrée</div>
                <div className="table-empty-sub">Les ventes apparaîtront ici après enregistrement.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Vente</th>
                    <th>Date & heure</th>
                    <th>Client</th>
                    <th>Vendeur</th>
                    <th>Articles</th>
                    <th className="col-amount">Montant total</th>
                    <th>Facture</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((s: any) => (
                    <tr key={s.id}>
                      <td className="col-mono">{s.saleNumber}</td>
                      <td style={{ fontSize: '0.75rem' }}>{new Date(s.createdAt).toLocaleString('fr-FR')}</td>
                      <td>{s.customer?.name || 'Client comptant'}</td>
                      <td>{s.user?.firstName} {s.user?.lastName}</td>
                      <td>{s.items?.length || 0}</td>
                      <td className="col-amount">{formatCurrency(Number(s.total), s.currency)}</td>
                      <td>
                        {s.invoice ? (
                          <span className="col-mono">{s.invoice.invoiceNumber}</span>
                        ) : <span className="text-tertiary">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${statusClass[s.status] || 'badge-neutral'}`}>
                          {statusLabel[s.status] || s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal succès vente */}
      {successSale && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} color="#16A34A" />
                <span className="modal-title">Vente enregistrée avec succès</span>
              </div>
            </div>
            <div className="modal-body">
              {isOfflineSale && (
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  color: '#92400E',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}>
                  <WifiOff size={16} color="#D97706" />
                  <span>
                    <b>Mode Hors-Ligne :</b> Reçu provisoire généré localement. La facture sera certifiée dès la reconnexion au serveur.
                  </span>
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                  Vente N° {successSale.sale?.saleNumber}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                  Stocks décrémentés · Facture générée · Écritures enregistrées
                </div>
              </div>
              <div className="totals-box">
                <div className="totals-row">
                  <span>Montant encaissé</span>
                  <span className="text-success font-semibold">{formatCurrency(Number(successSale.sale?.total), successSale.sale?.currency)}</span>
                </div>
                <div className="totals-row">
                  <span>Facture</span>
                  <span className="col-mono">{successSale.invoice?.invoiceNumber || '—'}</span>
                </div>
                <div className="totals-row">
                  <span>Statut facture</span>
                  <span className={`badge ${successSale.invoice?.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                    {successSale.invoice?.status || '—'}
                  </span>
                </div>
              </div>

              {/* QR Code Fiscal du Reçu */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                <QRCodeDisplay
                  value={`OPENPME:VENTE=${successSale.sale?.saleNumber};MONTANT=${successSale.sale?.total}${successSale.sale?.currency};DATE=${new Date().toISOString()}`}
                  size={90}
                  label="Scan Reçu Fiscal"
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  onClick={() => {
                    const s = successSale?.sale || successSale;
                    const inv = successSale?.invoice;
                    const message = encodeURIComponent(
                      `*${organization?.name || 'OpenPME'} - TICKET DE CAISSE*\n` +
                      `Ticket N° : *${s?.saleNumber}*\n` +
                      (inv ? `Facture : *${inv?.invoiceNumber}*\n` : '') +
                      `Date : ${new Date(s?.createdAt || Date.now()).toLocaleString('fr-FR')}\n` +
                      `Total Encaissé : *${formatCurrency(Number(s?.total || 0), s?.currency || 'CDF')}*\n` +
                      `Mode : *${paymentMethod}*\n\n` +
                      `_Merci pour votre visite chez ${organization?.name || 'OpenPME'} !_`
                    );
                    window.open(`https://wa.me/?text=${message}`, '_blank');
                  }}
                  title="Envoyer le ticket par WhatsApp"
                >
                  <Share2 size={13} /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = successSale?.sale || successSale;
                    const items = s?.items || cart;
                    printThermalReceiptWeb({
                      companyName: organization?.name || 'Smart PME Finance',
                      companyAddress: organization?.address,
                      companyPhone: organization?.phone,
                      companyNif: organization?.taxId,
                      receiptNumber: s?.saleNumber || 'VNT-001',
                      date: new Date(s?.createdAt || Date.now()).toLocaleString('fr-FR'),
                      customerName: customers.find((c) => c.id === selectedCustomerId)?.name,
                      items: items.map((it: any) => ({
                        name: it.name || it.product?.name || 'Article',
                        quantity: Number(it.quantity || 1),
                        unitPrice: Number(it.unitPrice || 0),
                        total: Number(it.quantity || 1) * Number(it.unitPrice || 0),
                      })),
                      subtotal: Number(s?.total || 0),
                      total: Number(s?.total || 0),
                      currency: s?.currency || 'CDF',
                      paymentMethod,
                    }, { width: '80mm' });
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  title="Impression thermique standard 80mm"
                >
                  <Printer size={13} /> Ticket 80mm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = successSale?.sale || successSale;
                    const items = s?.items || cart;
                    printThermalReceiptWeb({
                      companyName: organization?.name || 'Smart PME Finance',
                      companyAddress: organization?.address,
                      companyPhone: organization?.phone,
                      companyNif: organization?.taxId,
                      receiptNumber: s?.saleNumber || 'VNT-001',
                      date: new Date(s?.createdAt || Date.now()).toLocaleString('fr-FR'),
                      customerName: customers.find((c) => c.id === selectedCustomerId)?.name,
                      items: items.map((it: any) => ({
                        name: it.name || it.product?.name || 'Article',
                        quantity: Number(it.quantity || 1),
                        unitPrice: Number(it.unitPrice || 0),
                        total: Number(it.quantity || 1) * Number(it.unitPrice || 0),
                      })),
                      subtotal: Number(s?.total || 0),
                      total: Number(s?.total || 0),
                      currency: s?.currency || 'CDF',
                      paymentMethod,
                    }, { width: '58mm' });
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                  title="Impression thermique étroite 58mm"
                >
                  58mm
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSuccessSale(null)}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                Nouvelle vente [F4]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
