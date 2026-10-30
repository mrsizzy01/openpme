import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { Building2, Save, DollarSign, Sliders, ShieldAlert, FileText, AlertTriangle, CheckCircle, Bell, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { organization, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Informations entreprise
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [rccm, setRccm] = useState('');
  const [idNat, setIdNat] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Paramètres financiers
  const [primaryCurrency, setPrimaryCurrency] = useState('CDF');
  const [secondaryCurrency, setSecondaryCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('2850');
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [taxRatePercent, setTaxRatePercent] = useState('16');
  const [enableTax, setEnableTax] = useState(true);
  const [invoicePrefix, setInvoicePrefix] = useState('FAC-');

  // Seuils d'alerte
  const [alertMaxDiscount, setAlertMaxDiscount] = useState('15');
  const [alertLargeExpense, setAlertLargeExpense] = useState('2000000');
  const [alertCashDiscrepancy, setAlertCashDiscrepancy] = useState('15000');

  // Mentions légales
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  // Notifications & Alertes Dirigeant (WhatsApp & Telegram)
  const [managerWhatsapp, setManagerWhatsapp] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingReport, setTestingReport] = useState(false);

  useEffect(() => {
    const savedTgToken = localStorage.getItem('smart_pme_tg_token') || '';
    const savedTgChatId = localStorage.getItem('smart_pme_tg_chat_id') || '';
    const savedWa = localStorage.getItem('smart_pme_manager_wa') || '';
    setTelegramBotToken(savedTgToken);
    setTelegramChatId(savedTgChatId);
    setManagerWhatsapp(savedWa);
  }, []);

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toastError('Veuillez renseigner le Bot Token et le Chat ID Telegram.');
      return;
    }
    setTestingTelegram(true);
    try {
      localStorage.setItem('smart_pme_tg_token', telegramBotToken);
      localStorage.setItem('smart_pme_tg_chat_id', telegramChatId);
      const res = await ApiClient.testTelegramAlert(telegramBotToken, telegramChatId);
      if (res.success) {
        success('Message test envoyé avec succès sur Telegram !');
      } else {
        toastError(res.error || 'Erreur lors de l\'envoi Telegram.');
      }
    } catch (err: any) {
      toastError(err.message || 'Impossible de joindre l\'API Telegram.');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestDailyReport = async () => {
    setTestingReport(true);
    try {
      if (managerWhatsapp) localStorage.setItem('smart_pme_manager_wa', managerWhatsapp);
      const res = await ApiClient.generateDailyReport({
        whatsappPhone: managerWhatsapp || undefined,
        telegramBotToken: telegramBotToken || undefined,
        telegramChatId: telegramChatId || undefined,
      });

      if (res.telegramSent) {
        success('Rapport de synthèse transmis sur Telegram !');
      }
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
        success('Aperçu du rapport ouvert pour WhatsApp.');
      }
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la génération du rapport.');
    } finally {
      setTestingReport(false);
    }
  };

  useEffect(() => {
    if (organization) {
      setName(organization.name || '');
      setLegalName(organization.legalName || '');
      setTaxId(organization.taxId || '');
      setRccm(organization.rccm || '');
      setIdNat(organization.idNat || '');
      setPhone(organization.phone || '');
      setEmail(organization.email || '');
      setAddress(organization.address || '');
      setCity(organization.city || 'Kinshasa');
      const s = organization.settings;
      if (s) {
        setPrimaryCurrency(s.primaryCurrency || 'CDF');
        setSecondaryCurrency(s.secondaryCurrency || 'USD');
        setExchangeRate(s.exchangeRateUsdToCdf?.toString() || '2850');
        setTaxRatePercent(s.taxRatePercent?.toString() || '16');
        setEnableTax(Boolean(s.enableTax));
        setInvoicePrefix(s.invoicePrefix || 'FAC-');
        setAlertMaxDiscount(s.alertMaxDiscountPercent?.toString() || '15');
        setAlertLargeExpense(s.alertLargeExpenseThreshold?.toString() || '2000000');
        setAlertCashDiscrepancy(s.alertCashDiscrepancyThreshold?.toString() || '15000');
        setInvoiceFooterNote(s.invoiceFooterNote || '');
        setBankDetails(s.bankDetails || '');
      }
    }
  }, [organization]);

  useEffect(() => {
    ApiClient.getExchangeRates(10)
      .then(setRateHistory)
      .catch((err: Error) => toastError(err.message || 'Impossible de charger l’historique des taux.'));
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Le nom commercial de l\'entreprise est obligatoire.');
      return;
    }
    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      setFormError('Le taux de change USD/CDF doit être supérieur à 0.');
      return;
    }

    setSaving(true);
    try {
      await ApiClient.updateOrgProfile({
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        rccm: rccm.trim() || undefined,
        idNat: idNat.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
      });

      await ApiClient.updateOrgSettings({
        primaryCurrency,
        secondaryCurrency,
        exchangeRateUsdToCdf: exchangeRate,
        taxRatePercent: parseFloat(taxRatePercent) || 16,
        enableTax,
        invoicePrefix: invoicePrefix.trim() || 'FAC-',
        alertMaxDiscountPercent: parseFloat(alertMaxDiscount) || 15,
        alertLargeExpenseThreshold: parseFloat(alertLargeExpense) || 2000000,
        alertCashDiscrepancyThreshold: parseFloat(alertCashDiscrepancy) || 15000,
        invoiceFooterNote: invoiceFooterNote.trim() || undefined,
        bankDetails: bankDetails.trim() || undefined,
      });

      await refreshProfile();
      setRateHistory(await ApiClient.getExchangeRates(10));
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('smart_pme_sync_channel');
        ch.postMessage({
          type: 'EXCHANGE_RATE_UPDATED',
          rate: parseFloat(exchangeRate) || 2850,
        });
        ch.close();
      }
      success('Paramètres enregistrés et synchronisés sur tous les postes.');
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setSaving(false);
    }
  };

  const SectionTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
      <div style={{ color: '#2563EB', display: 'flex' }}>{icon}</div>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>{label}</h3>
    </div>
  );

  return (
    <div>
      {formError && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={15} className="alert-icon" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSaveAll}>
        {/* ── Section 1 : Identité de l'entreprise ── */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-body">
            <SectionTitle icon={<Building2 size={16} />} label="Identité de l'entreprise" />
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="set-name">
                  Nom commercial <span className="required">*</span>
                </label>
                <input id="set-name" type="text" required className="input-field"
                  placeholder="ex : Commerce DIALLO SARL" value={name}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-legal">Dénomination légale</label>
                <input id="set-legal" type="text" className="input-field"
                  placeholder="Raison sociale officielle" value={legalName}
                  onChange={(e) => setLegalName(e.target.value)} />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label" htmlFor="set-taxid">NIF (Numéro fiscal)</label>
                <input id="set-taxid" type="text" className="input-field"
                  placeholder="A0000000X" value={taxId}
                  onChange={(e) => setTaxId(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-rccm">N° RCCM</label>
                <input id="set-rccm" type="text" className="input-field"
                  placeholder="CD/KIN/RCCM/..." value={rccm}
                  onChange={(e) => setRccm(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-idnat">Identifiant National</label>
                <input id="set-idnat" type="text" className="input-field"
                  placeholder="ID NAT" value={idNat}
                  onChange={(e) => setIdNat(e.target.value)} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="set-phone">Téléphone</label>
                <input id="set-phone" type="tel" className="input-field"
                  placeholder="+243 8X XXX XXXX" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-email">E-mail</label>
                <input id="set-email" type="email" className="input-field"
                  placeholder="contact@monentreprise.cd" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="set-address">Adresse physique</label>
                <input id="set-address" type="text" className="input-field"
                  placeholder="Avenue, N°, Commune" value={address}
                  onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-city">Ville</label>
                <input id="set-city" type="text" className="input-field"
                  placeholder="Kinshasa" value={city}
                  onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2 : Paramètres financiers ── */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-body">
            <SectionTitle icon={<DollarSign size={16} />} label="Devise & Fiscalité" />
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label" htmlFor="set-curr">Devise principale</label>
                <select id="set-curr" className="input-field" value={primaryCurrency}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPrimaryCurrency(value);
                    if (value === secondaryCurrency) setSecondaryCurrency(value === 'CDF' ? 'USD' : 'CDF');
                  }}>
                  <option value="CDF">CDF — Franc Congolais</option>
                  <option value="USD">USD — Dollar américain</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-curr2">Devise secondaire</label>
                <select id="set-curr2" className="input-field" value={secondaryCurrency}
                  onChange={(e) => setSecondaryCurrency(e.target.value)}>
                  <option value="USD">USD — Dollar américain</option>
                  <option value="CDF">CDF — Franc Congolais</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-rate">
                  Taux 1 USD → CDF <span className="required">*</span>
                </label>
                <input id="set-rate" type="number" min="0.0001" step="0.0001" required className="input-field"
                  value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
                <div className="form-hint">Le taux est enregistré dans l’historique journalier de l’entreprise.</div>
                {rateHistory.length > 0 && (
                  <div className="form-hint" style={{ marginTop: '6px' }}>
                    Derniers taux : {rateHistory.slice(0, 5).map((rate) =>
                      `${new Date(rate.effectiveDate).toLocaleDateString('fr-FR')} : ${rate.rate} CDF`,
                    ).join(' · ')}
                  </div>
                )}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">TVA applicable</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input type="checkbox" id="set-tax" checked={enableTax}
                    onChange={(e) => setEnableTax(e.target.checked)}
                    style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                  <label htmlFor="set-tax" style={{ fontSize: '0.8125rem', color: '#374151', cursor: 'pointer' }}>
                    Activer la TVA sur les ventes
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-taxrate">Taux TVA (%)</label>
                <input id="set-taxrate" type="number" min="0" max="100" step="0.1"
                  className="input-field" value={taxRatePercent} disabled={!enableTax}
                  onChange={(e) => setTaxRatePercent(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="set-prefix">Préfixe de numérotation des factures</label>
              <input id="set-prefix" type="text" className="input-field"
                placeholder="FAC-" value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)} />
              <div className="form-hint">Ex. : FAC- → FAC-000001, FAC-2026- → FAC-2026-000001</div>
            </div>
          </div>
        </div>

        {/* ── Section 3 : Seuils d'alerte ── */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-body">
            <SectionTitle icon={<ShieldAlert size={16} />} label="Seuils de détection des anomalies" />
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label" htmlFor="set-disc">Remise maximale autorisée (%)</label>
                <input id="set-disc" type="number" min="0" max="100" step="0.5"
                  className="input-field" value={alertMaxDiscount}
                  onChange={(e) => setAlertMaxDiscount(e.target.value)} />
                <div className="form-hint">Au-delà, une anomalie est créée automatiquement.</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-exp">Seuil grande dépense (CDF)</label>
                <input id="set-exp" type="number" min="0" step="1000"
                  className="input-field" value={alertLargeExpense}
                  onChange={(e) => setAlertLargeExpense(e.target.value)} />
                <div className="form-hint">Dépense unique au-delà de ce montant → alerte.</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="set-cash">Écart de caisse toléré (CDF)</label>
                <input id="set-cash" type="number" min="0" step="100"
                  className="input-field" value={alertCashDiscrepancy}
                  onChange={(e) => setAlertCashDiscrepancy(e.target.value)} />
                <div className="form-hint">Écart comptant/théorique déclenchant une alerte.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 4 : Mentions légales ── */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body">
            <SectionTitle icon={<FileText size={16} />} label="Mentions légales & coordonnées bancaires" />
            <div className="form-group">
              <label className="form-label" htmlFor="set-footer">Pied de facture</label>
              <textarea
                id="set-footer"
                rows={2}
                className="input-field"
                placeholder="ex : Facture certifiée conforme — RDC. Tout retard de paiement entraîne des pénalités de 2% par mois."
                value={invoiceFooterNote}
                onChange={(e) => setInvoiceFooterNote(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="set-bank">Coordonnées bancaires</label>
              <textarea
                id="set-bank"
                rows={2}
                className="input-field"
                placeholder="ex : Rawbank Kinshasa — IBAN : CD... — SWIFT : ..."
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* ── Section 5 : Alertes Dirigeant WhatsApp & Telegram ── */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body">
            <SectionTitle icon={<Bell size={16} />} label="Alertes instantanées Dirigeant & Clôture WhatsApp / Telegram" />
            
            <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: '16px' }}>
              Recevez les alertes en cas de fraude, d'écart de caisse ou de fermeture d'urgence (Killswitch), ainsi que le rapport de clôture automatique à 20h00 directement sur votre smartphone.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="set-wa">N° WhatsApp du Gérant / Propriétaire</label>
                <input
                  id="set-wa"
                  type="tel"
                  className="input-field"
                  placeholder="ex : +243812345678"
                  value={managerWhatsapp}
                  onChange={(e) => setManagerWhatsapp(e.target.value)}
                />
                <div className="form-hint">Format international avec indicatif pays (+243...)</div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="set-tg-token">Telegram Bot Token (Optionnel)</label>
                <input
                  id="set-tg-token"
                  type="text"
                  className="input-field"
                  placeholder="ex : 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                />
                <div className="form-hint">Créé via @BotFather sur Telegram</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="set-tg-chat">Telegram Chat ID / Canal Privé</label>
                <input
                  id="set-tg-chat"
                  type="text"
                  className="input-field"
                  placeholder="ex : 987654321 ou @mon_canal_pme"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                <div className="form-hint">ID de votre compte ou de votre groupe de direction</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={14} />
                  {testingTelegram ? 'Test en cours...' : 'Tester le Bot Telegram'}
                </button>
                <button
                  type="button"
                  onClick={handleTestDailyReport}
                  disabled={testingReport}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MessageSquare size={14} />
                  {testingReport ? 'Génération...' : 'Aperçu Clôture WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton enregistrer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            {saving ? (
              <>
                <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={16} />
                Enregistrer les paramètres
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
