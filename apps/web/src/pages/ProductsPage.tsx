import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, roundMoney } from '@smart-pme/shared';
import { Package, Plus, Search, AlertTriangle, X, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isNetworkFailure, offlineSync } from '../services/offlineSync';

export const ProductsPage: React.FC = () => {
  const { organization, user } = useAuth();
  const { success, error: toastError } = useToast();
  const canManage = user?.role === 'ORG_OWNER'
    || user?.role === 'MANAGER'
    || user?.role === 'INVENTORY_MANAGER'
    || user?.role === 'SUPER_ADMIN';

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<any | null>(null);
  const [stockProduct, setStockProduct] = useState<any | null>(null);
  const [stockDelta, setStockDelta] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockError, setStockError] = useState<string | null>(null);

  // Formulaire
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formCurrency, setFormCurrency] = useState<Currency>(Currency.CDF);
  const [formStock, setFormStock] = useState('0');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('Pièce');
  const [formIsService, setFormIsService] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const exchangeRate = organization?.settings?.exchangeRateUsdToCdf || 2850;

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [prods, cats] = await Promise.all([
        ApiClient.getProducts(search, selectedCategory || undefined),
        ApiClient.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les produits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormCategoryId('');
    setFormDescription('');
    setFormPurchasePrice('');
    setFormSalePrice('');
    setFormCurrency(organization?.settings?.primaryCurrency === Currency.USD ? Currency.USD : Currency.CDF);
    setFormStock('0');
    setFormMinStock('5');
    setFormUnit('Pièce');
    setFormIsService(false);
    setFormError(null);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('La désignation est obligatoire.');
      return;
    }
    if (!formSalePrice || parseFloat(formSalePrice) <= 0) {
      setFormError('Le prix de vente doit être supérieur à 0.');
      return;
    }

    setSubmitting(true);
    try {
      await ApiClient.createProduct({
        name: formName.trim(),
        code: formCode.trim() || undefined,
        categoryId: formCategoryId || undefined,
        description: formDescription.trim() || undefined,
        purchasePrice: formPurchasePrice || '0',
        salePrice: formSalePrice,
        currency: formCurrency,
        initialStock: formIsService ? 0 : parseInt(formStock, 10) || 0,
        minStockLevel: formIsService ? 0 : parseInt(formMinStock, 10) || 5,
        unit: formUnit.trim() || 'Pièce',
        isService: formIsService,
      });
      setShowAddModal(false);
      resetForm();
      success(`Produit « ${formName} » enregistré avec succès.`);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création du produit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setFormName(product.name || '');
    setFormCode(product.code || '');
    setFormCategoryId(product.categoryId || '');
    setFormDescription(product.description || '');
    setFormPurchasePrice(String(product.purchasePrice || '0'));
    setFormSalePrice(String(product.salePrice || '0'));
    setFormCurrency(product.currency === Currency.USD ? Currency.USD : Currency.CDF);
    setFormStock(String(product.currentStock || '0'));
    setFormMinStock(String(product.minStockLevel || '5'));
    setFormUnit(product.unit || 'Pièce');
    setFormIsService(Boolean(product.isService));
    setFormError(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError(null);

    if (!formName.trim()) {
      setFormError('La désignation est obligatoire.');
      return;
    }
    if (!formSalePrice || parseFloat(formSalePrice) <= 0) {
      setFormError('Le prix de vente doit être supérieur à 0.');
      return;
    }

    setSubmitting(true);
    const updatePayload = {
      name: formName.trim(),
      categoryId: formCategoryId || null,
      description: formDescription.trim() || null,
      purchasePrice: formPurchasePrice || '0',
      salePrice: formSalePrice,
      currency: formCurrency,
      minStockLevel: parseInt(formMinStock, 10) || 5,
      unit: formUnit.trim() || 'Pièce',
    };
    try {
      await ApiClient.updateProduct(editingProduct.id, updatePayload);
      setEditingProduct(null);
      resetForm();
      success(`Produit mis à jour avec succès.`);
      loadData();
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        try {
          await offlineSync.enqueueProductUpdate(editingProduct.id, updatePayload);
          setEditingProduct(null);
          resetForm();
          success('Modifications enregistrées hors-ligne. La dernière modification synchronisée sera conservée.');
        } catch (storageError) {
          setFormError(storageError instanceof Error
            ? `La modification n’a pas été enregistrée. ${storageError.message}`
            : 'La modification n’a pas été enregistrée : stockage hors-ligne indisponible.');
        }
      } else {
        setFormError(err.message || 'Erreur lors de la mise à jour.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stockProduct) return;
    const quantity = Number(stockDelta);
    if (!Number.isInteger(quantity) || quantity === 0) {
      setStockError('Saisissez un nombre entier positif pour une entrée ou négatif pour une sortie.');
      return;
    }
    if (!stockReason.trim()) {
      setStockError('Le motif du mouvement est obligatoire.');
      return;
    }
    if (stockProduct.currentStock + quantity < 0) {
      setStockError(`Il reste ${stockProduct.currentStock} article(s). La sortie demandée dépasse le stock disponible.`);
      return;
    }
    setSubmitting(true);
    try {
      await offlineSync.enqueueStockMovement(stockProduct.id, { quantity, reason: stockReason.trim() });
      setProducts((current) => current.map((product) => product.id === stockProduct.id
        ? { ...product, currentStock: product.currentStock + quantity }
        : product));
      setStockProduct(null);
      setStockDelta('');
      setStockReason('');
      setStockError(null);
      success('Mouvement de stock enregistré. Il sera synchronisé dès que le réseau sera disponible.');
    } catch (err) {
      setStockError(err instanceof Error
        ? `Le mouvement n’a pas été enregistré. ${err.message}`
        : 'Le mouvement n’a pas été enregistré : stockage hors-ligne indisponible.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;
    setSubmitting(true);
    try {
      await ApiClient.deleteProduct(deleteConfirmProduct.id);
      success(`Article supprimé avec succès.`);
      setDeleteConfirmProduct(null);
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Impossible de supprimer cet article.');
    } finally {
      setSubmitting(false);
    }
  };

  const buy = parseFloat(formPurchasePrice) || 0;
  const sell = parseFloat(formSalePrice) || 0;
  const marginAmt = roundMoney(sell - buy);
  const marginPct = sell > 0 ? ((marginAmt / sell) * 100).toFixed(1) : '0.0';

  const lowStockCount = products.filter((p) => !p.isService && p.currentStock <= p.minStockLevel).length;

  return (
    <div>
      {/* Alerte stock */}
      {lowStockCount > 0 && (
        <div className="alert alert-warning">
          <AlertTriangle size={15} className="alert-icon" />
          <div>
            <span className="alert-title">{lowStockCount} article(s) sous le seuil d'alerte</span>
            <span className="alert-body" style={{ marginLeft: '6px' }}>
              Passez commande auprès de vos fournisseurs pour éviter des ruptures.
            </span>
          </div>
        </div>
      )}

      {/* Barre d'outils */}
      <div className="table-wrapper">
        <div className="table-toolbar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '560px' }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <Search size={14} className="input-icon" />
              <input
                type="text"
                placeholder="Rechercher par nom, référence ou code-barres..."
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field"
              style={{ width: '200px' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">
              <Search size={13} /> Rechercher
            </button>
          </form>

          <div className="table-toolbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadData}>
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowAddModal(true); }}
            >
              <Plus size={14} />
              Nouveau produit
            </button>
          </div>
        </div>

        {/* Table */}
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadData}>
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="table-empty">
              <Package className="table-empty-icon" />
              <div className="table-empty-title">Aucun produit trouvé</div>
              <div className="table-empty-sub">
                {search || selectedCategory
                  ? 'Aucun résultat pour ces critères. Modifiez votre recherche.'
                  : 'Aucun produit enregistré. Commencez par créer votre premier article.'}
              </div>
              {!search && !selectedCategory && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => { resetForm(); setShowAddModal(true); }}
                >
                  <Plus size={13} /> Créer un produit
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Désignation</th>
                  <th>Catégorie</th>
                  <th>Type</th>
                  <th className="col-amount">Prix d'achat</th>
                  <th className="col-amount">Prix de vente</th>
                  <th className="col-amount">Marge</th>
                  <th>Stock</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const buyP = Number(p.purchasePrice);
                  const sellP = Number(p.salePrice);
                  const margin = roundMoney(sellP - buyP);
                  const marginPercent = sellP > 0 ? ((margin / sellP) * 100).toFixed(0) : '0';
                  const isCritical = !p.isService && p.currentStock <= p.minStockLevel;

                  return (
                    <tr key={p.id}>
                      <td className="col-mono">{p.code}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td>{p.category?.name || <span className="text-tertiary">—</span>}</td>
                      <td>
                        <span className={`badge ${p.isService ? 'badge-info' : 'badge-neutral'}`}>
                          {p.isService ? 'Service' : 'Matériel'}
                        </span>
                      </td>
                      <td className="col-amount text-muted">{formatCurrency(buyP, p.currency)}</td>
                      <td className="col-amount font-semibold">{formatCurrency(sellP, p.currency)}</td>
                      <td className="col-amount" style={{ color: margin > 0 ? '#16A34A' : '#DC2626' }}>
                        {formatCurrency(margin, p.currency)} ({marginPercent}%)
                      </td>
                      <td>
                        {p.isService ? (
                          <span className="text-tertiary">—</span>
                        ) : (
                          <span style={{ fontWeight: 600, color: isCritical ? '#DC2626' : '#111827' }}>
                            {p.currentStock} {p.unit}
                          </span>
                        )}
                      </td>
                      <td>
                        {p.isService ? (
                          <span className="badge badge-info">Actif</span>
                        ) : isCritical ? (
                          <span className="badge badge-danger">Stock faible</span>
                        ) : (
                          <span className="badge badge-success">En stock</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {canManage ? (
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            {!p.isService && (
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setStockProduct(p);
                                  setStockDelta('');
                                  setStockReason('');
                                  setStockError(null);
                                }}
                                title="Enregistrer une entrée ou sortie de stock"
                                style={{ padding: '4px 8px' }}
                              >
                                <RefreshCw size={13} />
                                <span>Stock</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenEdit(p)}
                              title="Modifier ce produit"
                              style={{ padding: '4px 8px' }}
                            >
                              <Pencil size={13} />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => setDeleteConfirmProduct(p)}
                              title="Supprimer ce produit"
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

      {/* Modal ajout produit */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Nouveau produit / service</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="prod-name">
                    Désignation <span className="required">*</span>
                  </label>
                  <input
                    id="prod-name"
                    type="text"
                    required
                    className="input-field"
                    placeholder="ex : Imprimante HP LaserJet M110we"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-code">Référence interne</label>
                    <input
                      id="prod-code"
                      type="text"
                      className="input-field"
                      placeholder="PRD-XXXX (auto si vide)"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-category">Catégorie</label>
                    <select
                      id="prod-category"
                      className="input-field"
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                    >
                      <option value="">— Sélectionner —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prod-desc">Description</label>
                  <input
                    id="prod-desc"
                    type="text"
                    className="input-field"
                    placeholder="Description courte du produit..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prod-currency">Devise de référence des prix</label>
                  <select id="prod-currency" className="input-field" value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value === Currency.USD ? Currency.USD : Currency.CDF)}>
                    <option value="CDF">CDF — Franc Congolais</option>
                    <option value="USD">USD — Dollar américain</option>
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-buy">Prix d'achat ({formCurrency})</label>
                    <input
                      id="prod-buy"
                      type="number"
                      min="0"
                      step="any"
                      className="input-field"
                      placeholder="0"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-sell">
                      Prix de vente ({formCurrency}) <span className="required">*</span>
                    </label>
                    <input
                      id="prod-sell"
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      className="input-field"
                      placeholder="0"
                      value={formSalePrice}
                      onChange={(e) => setFormSalePrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Indicateur de marge en temps réel */}
                {sell > 0 && (
                  <div style={{
                    background: marginAmt > 0 ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${marginAmt > 0 ? '#BBF7D0' : '#FECACA'}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                  }}>
                    <span style={{ color: '#4B5563' }}>Marge estimée :</span>
                    <strong style={{ color: marginAmt > 0 ? '#16A34A' : '#DC2626' }}>
                      {formatCurrency(marginAmt, formCurrency)} ({marginPct}%)
                    </strong>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="checkbox"
                    id="isSrv"
                    checked={formIsService}
                    onChange={(e) => setFormIsService(e.target.checked)}
                    style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isSrv" style={{ fontSize: '0.8125rem', color: '#374151', cursor: 'pointer' }}>
                    Prestation de service (pas de gestion de stock physique)
                  </label>
                </div>

                {!formIsService && (
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="prod-stock">Stock initial</label>
                      <input
                        id="prod-stock"
                        type="number"
                        min="0"
                        className="input-field"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="prod-minstk">
                        Seuil d'alerte min.
                      </label>
                      <input
                        id="prod-minstk"
                        type="number"
                        min="0"
                        className="input-field"
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="prod-unit">Unité</label>
                      <input
                        id="prod-unit"
                        type="text"
                        className="input-field"
                        placeholder="Pièce, Kg, L..."
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                      Enregistrement...
                    </>
                  ) : 'Enregistrer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal modification produit */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Modifier : {editingProduct.name}</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => { setEditingProduct(null); resetForm(); }}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-name">
                    Désignation <span className="required">*</span>
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    className="input-field"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-cat">Catégorie</label>
                    <select
                      id="edit-cat"
                      className="select-field"
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-unit">Unité</label>
                    <input
                      id="edit-unit"
                      type="text"
                      className="input-field"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-currency">Devise de référence des prix</label>
                  <select id="edit-currency" className="input-field" value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value === Currency.USD ? Currency.USD : Currency.CDF)}>
                    <option value="CDF">CDF — Franc Congolais</option>
                    <option value="USD">USD — Dollar américain</option>
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-buy">Prix d'achat ({formCurrency})</label>
                    <input
                      id="edit-buy"
                      type="number"
                      step="any"
                      className="input-field"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-sell">
                      Prix de vente ({formCurrency}) <span className="required">*</span>
                    </label>
                    <input
                      id="edit-sell"
                      type="number"
                      step="any"
                      required
                      className="input-field"
                      value={formSalePrice}
                      onChange={(e) => setFormSalePrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-minstock">Seuil d'alerte stock</label>
                  <input
                    id="edit-minstock"
                    type="number"
                    min="0"
                    className="input-field"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setEditingProduct(null); resetForm(); }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockProduct && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <span className="modal-title">Mouvement de stock : {stockProduct.name}</span>
              <button type="button" className="btn-close" onClick={() => setStockProduct(null)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleStockMovement}>
              <div className="modal-body">
                <p>Stock affiché : <strong>{stockProduct.currentStock} {stockProduct.unit}</strong></p>
                {stockError && (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>{stockError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="stock-delta">Quantité (+ entrée, − sortie)</label>
                  <input
                    id="stock-delta"
                    type="number"
                    step="1"
                    required
                    className="input-field"
                    value={stockDelta}
                    onChange={(event) => setStockDelta(event.target.value)}
                    placeholder="Ex. 10 ou -2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="stock-reason">Motif</label>
                  <input
                    id="stock-reason"
                    type="text"
                    required
                    maxLength={240}
                    className="input-field"
                    value={stockReason}
                    onChange={(event) => setStockReason(event.target.value)}
                    placeholder="Réception, inventaire, casse…"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStockProduct(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer le mouvement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation de suppression */}
      {deleteConfirmProduct && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">Confirmer la suppression</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDeleteConfirmProduct(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: '1.5' }}>
                Êtes-vous certain de vouloir supprimer l'article <strong>« {deleteConfirmProduct.name} »</strong> ?
              </p>
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#6B7280' }}>
                Note : Si cet article est déjà lié à des ventes passées, il sera désactivé pour préserver l'historique comptable conforme OHADA.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmProduct(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={submitting}
                onClick={handleDeleteProduct}
              >
                {submitting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
