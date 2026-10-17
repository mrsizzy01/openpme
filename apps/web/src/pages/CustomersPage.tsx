import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency } from '@smart-pme/shared';
import { Users, Plus, Search, Phone, Mail, MapPin, X, AlertTriangle, RefreshCw, Receipt, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../utils/exportCsv';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const canManage = user?.role === 'ORG_OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<any | null>(null);

  // Formulaire
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await ApiClient.getCustomers(search);
      setCustomers(res);
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers();
  };

  const resetForm = () => {
    setFormName('');
    setFormCompany('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCreditLimit('');
    setFormError(null);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Le nom du client est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      await ApiClient.createCustomer({
        name: formName.trim(),
        companyName: formCompany.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        creditLimit: parseFloat(formCreditLimit) || 0,
        currency: 'CDF',
      });
      setShowAddModal(false);
      resetForm();
      success(`Client « ${formName} » enregistré avec succès.`);
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création du client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormName(customer.name || '');
    setFormCompany(customer.companyName || '');
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormCreditLimit(String(customer.creditLimit || '0'));
    setFormError(null);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Le nom du client est obligatoire.');
      return;
    }

    setSubmitting(true);
    try {
      await ApiClient.updateCustomer(editingCustomer.id, {
        name: formName.trim(),
        companyName: formCompany.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        creditLimit: parseFloat(formCreditLimit) || 0,
      });
      setEditingCustomer(null);
      resetForm();
      success(`Client mis à jour avec succès.`);
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la modification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirmCustomer) return;
    setSubmitting(true);
    try {
      await ApiClient.deleteCustomer(deleteConfirmCustomer.id);
      success(`Client supprimé avec succès.`);
      setDeleteConfirmCustomer(null);
      loadCustomers();
    } catch (err: any) {
      toastError(err.message || 'Impossible de supprimer ce client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (!customers.length) return;
    const rows = customers.map((c) => ({
      'Code Client': c.code || '',
      'Nom Complet': c.name,
      'Entreprise / Société': c.companyName || '',
      'Téléphone': c.phone || '',
      'Email': c.email || '',
      'Adresse': c.address || '',
      'Plafond Crédit': Number(c.creditLimit || 0),
      'Solde Dû': Number(c.outstandingBalance || 0),
      'Devise': c.currency || 'CDF',
      'Statut': c.isActive ? 'Actif' : 'Inactif',
    }));
    exportToCsv('Repertoire_Clients_SmartPME', rows);
    success('Export du répertoire clients Excel / CSV généré avec succès.');
  };

  return (
    <div>
      <div className="table-wrapper">
        <div className="table-toolbar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '480px' }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <Search size={14} className="input-icon" />
              <input
                type="text"
                placeholder="Rechercher un client, société, téléphone..."
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              <Search size={13} /> Rechercher
            </button>
          </form>

          <div className="table-toolbar-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportCsv}
              title="Exporter le répertoire clients en Excel / CSV"
            >
              <FileSpreadsheet size={13} /> Exporter
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadCustomers}>
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowAddModal(true); }}
            >
              <Plus size={14} />
              Nouveau client
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadCustomers}>
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="table-empty">
              <Users className="table-empty-icon" />
              <div className="table-empty-title">Aucun client trouvé</div>
              <div className="table-empty-sub">
                {search
                  ? 'Aucun résultat pour cette recherche.'
                  : 'Aucun client enregistré. Créez votre premier client.'}
              </div>
              {!search && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => { resetForm(); setShowAddModal(true); }}
                >
                  <Plus size={13} /> Créer un client
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Nom / Société</th>
                  <th>Téléphone</th>
                  <th>E-mail</th>
                  <th>Adresse</th>
                  <th className="col-amount">Limite crédit</th>
                  <th className="col-amount">En-cours</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => {
                  const outstanding = Number(c.outstandingBalance || 0);
                  const limit = Number(c.creditLimit || 0);
                  const exceeded = limit > 0 && outstanding > limit;
                  return (
                    <tr key={c.id}>
                      <td className="col-mono">{c.code}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{c.name}</div>
                        {c.companyName && (
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{c.companyName}</div>
                        )}
                      </td>
                      <td>
                        {c.phone ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem' }}>
                            <Phone size={12} color="#6B7280" /> {c.phone}
                          </span>
                        ) : <span className="text-tertiary">—</span>}
                      </td>
                      <td>
                        {c.email ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem' }}>
                            <Mail size={12} color="#6B7280" /> {c.email}
                          </span>
                        ) : <span className="text-tertiary">—</span>}
                      </td>
                      <td>
                        {c.address ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={12} color="#6B7280" /> {c.address}
                          </span>
                        ) : <span className="text-tertiary">—</span>}
                      </td>
                      <td className="col-amount">
                        {limit > 0 ? formatCurrency(limit, c.currency || 'CDF') : <span className="text-tertiary">—</span>}
                      </td>
                      <td className="col-amount" style={{ color: exceeded ? '#DC2626' : '#111827', fontWeight: 600 }}>
                        {formatCurrency(outstanding, c.currency || 'CDF')}
                      </td>
                      <td>
                        {exceeded ? (
                          <span className="badge badge-danger">Dépassé</span>
                        ) : outstanding > 0 ? (
                          <span className="badge badge-warning">En-cours</span>
                        ) : (
                          <span className="badge badge-success">À jour</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {canManage ? (
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenEdit(c)}
                              title="Modifier ce client"
                              style={{ padding: '4px 8px' }}
                            >
                              <Pencil size={13} />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => setDeleteConfirmCustomer(c)}
                              title="Supprimer ce client"
                              style={{ padding: '4px 8px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>Lecture seule</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal ajout client */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nouveau client</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="cust-name">
                    Nom complet <span className="required">*</span>
                  </label>
                  <input
                    id="cust-name"
                    type="text"
                    required
                    className="input-field"
                    placeholder="Prénom Nom ou dénomination"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cust-company">Société / Organisation</label>
                  <input
                    id="cust-company"
                    type="text"
                    className="input-field"
                    placeholder="Raison sociale (optionnel)"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cust-phone">Téléphone</label>
                    <input
                      id="cust-phone"
                      type="tel"
                      className="input-field"
                      placeholder="+243 8X XXX XXXX"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cust-email">Adresse e-mail</label>
                    <input
                      id="cust-email"
                      type="email"
                      className="input-field"
                      placeholder="client@exemple.cd"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cust-address">Adresse physique</label>
                  <input
                    id="cust-address"
                    type="text"
                    className="input-field"
                    placeholder="Commune, Avenue, N°..."
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cust-credit">Limite de crédit (CDF)</label>
                  <input
                    id="cust-credit"
                    type="number"
                    min="0"
                    step="any"
                    className="input-field"
                    placeholder="0 = pas de crédit"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                  />
                  <div className="form-hint">Laisser à 0 pour désactiver la vente à crédit pour ce client.</div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                >
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                      Enregistrement...
                    </>
                  ) : 'Enregistrer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal modification client */}
      {editingCustomer && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <span className="modal-title">Modifier le client : {editingCustomer.name}</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => { setEditingCustomer(null); resetForm(); }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-cust-name">
                    Nom du client / Raison sociale <span className="required">*</span>
                  </label>
                  <input
                    id="edit-cust-name"
                    type="text"
                    required
                    className="input-field"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-cust-company">Nom de l'entreprise (optionnel)</label>
                  <input
                    id="edit-cust-company"
                    type="text"
                    className="input-field"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-cust-phone">Téléphone</label>
                    <input
                      id="edit-cust-phone"
                      type="tel"
                      className="input-field"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-cust-email">Adresse e-mail</label>
                    <input
                      id="edit-cust-email"
                      type="email"
                      className="input-field"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-cust-address">Adresse physique</label>
                  <input
                    id="edit-cust-address"
                    type="text"
                    className="input-field"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-cust-credit">Limite de crédit autorisée (CDF)</label>
                  <input
                    id="edit-cust-credit"
                    type="number"
                    min="0"
                    step="any"
                    className="input-field"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setEditingCustomer(null); resetForm(); }}
                >
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression client */}
      {deleteConfirmCustomer && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">Confirmer la suppression</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDeleteConfirmCustomer(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: '1.5' }}>
                Êtes-vous certain de vouloir supprimer le client <strong>« {deleteConfirmCustomer.name} »</strong> ?
              </p>
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#6B7280' }}>
                Note : Si ce client possède déjà des factures ou des règlements, sa fiche sera archivée pour préserver l'intégrité comptable.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmCustomer(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={submitting}
                onClick={handleDeleteCustomer}
              >
                {submitting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
