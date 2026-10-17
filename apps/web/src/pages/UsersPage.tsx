import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Check,
  X,
  Layers,
  Lock,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface RbacMatrixRow {
  domain: string;
  permission: string;
  description: string;
  roles: Record<'SUPER_ADMIN' | 'ORG_OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'CASHIER' | 'AUDITOR', 'ALL' | 'READ' | 'NONE'>;
}

const RBAC_RULES: RbacMatrixRow[] = [
  {
    domain: 'Point de Vente (POS)',
    permission: 'Encaissement & Ventes directes',
    description: 'Enregistrer les ventes au comptoir, paniers et tickets 80mm',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'NONE', CASHIER: 'ALL', AUDITOR: 'NONE' },
  },
  {
    domain: 'Caisse & Trésorerie',
    permission: 'Clôture de Caisse (Z) & Billetage CDF',
    description: 'Comptage physique des espèces, détection d’écarts et arrêt journalier',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'READ', CASHIER: 'ALL', AUDITOR: 'READ' },
  },
  {
    domain: 'Catalogue & Stocks',
    permission: 'Création d’articles & seuils d’alerte',
    description: 'Modifier les prix d’achat/vente, réapprovisionner et ajuster stocks',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'READ', CASHIER: 'READ', AUDITOR: 'READ' },
  },
  {
    domain: 'Facturation & Devis',
    permission: 'Émission Factures A4 & Créances',
    description: 'Générer des factures officielles proforma, délais de paiement et suivi',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'ALL', CASHIER: 'NONE', AUDITOR: 'READ' },
  },
  {
    domain: 'Contrôle Comptable',
    permission: 'Annulation de Factures & Avoirs',
    description: 'Exige motif obligatoire et horodatage dans le journal d’audit',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'NONE', ACCOUNTANT: 'NONE', CASHIER: 'NONE', AUDITOR: 'NONE' },
  },
  {
    domain: 'Dépenses & Charges',
    permission: 'Engagement des dépenses de caisse',
    description: 'Paiement fournisseurs, loyer, salaires et consommables',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'ALL', CASHIER: 'NONE', AUDITOR: 'READ' },
  },
  {
    domain: 'Pilotage & Décision',
    permission: 'Marge Brute & Tableau de bord 7j',
    description: 'Indicateurs de rentabilité financière et graphes comparatifs',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'ALL', CASHIER: 'NONE', AUDITOR: 'READ' },
  },
  {
    domain: 'Moteur IA de Fraude',
    permission: 'Détection d’Anomalies Financières',
    description: 'Alertes automatiques sur remises abusives, écarts et sorties anormales',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'ALL', CASHIER: 'NONE', AUDITOR: 'ALL' },
  },
  {
    domain: 'Sécurité & Audit Trail',
    permission: 'Journal d’Audit & Export Excel',
    description: 'Traçabilité inaltérable des actions sensibles et adresses IP',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'NONE', ACCOUNTANT: 'NONE', CASHIER: 'NONE', AUDITOR: 'ALL' },
  },
  {
    domain: 'Configuration Devises',
    permission: 'Taux de Change Multi-Devises (USD/CDF)',
    description: 'Mise à jour du taux officiel et recalcul dynamique de la trésorerie',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'NONE', CASHIER: 'NONE', AUDITOR: 'NONE' },
  },
  {
    domain: 'Infrastructure POS',
    permission: 'Verrouillage à Distance des Terminaux',
    description: 'Bloquer immédiatement un poste caisse compromis ou suspect',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'ALL', ACCOUNTANT: 'NONE', CASHIER: 'NONE', AUDITOR: 'NONE' },
  },
  {
    domain: 'Gouvernance RBAC',
    permission: 'Création Utilisateurs & Rôles',
    description: 'Administration des accès, réinitialisation mots de passe et privilèges',
    roles: { SUPER_ADMIN: 'ALL', ORG_OWNER: 'ALL', MANAGER: 'NONE', ACCOUNTANT: 'NONE', CASHIER: 'NONE', AUDITOR: 'NONE' },
  },
];

const ROLE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#7C3AED', desc: 'Contrôle système total et maintenance' },
  ORG_OWNER: { label: 'Propriétaire / DG', color: '#1E40AF', desc: 'Gestion financière, paramètres et validation totale' },
  MANAGER: { label: 'Gérant / Manager', color: '#0369A1', desc: 'Supervision des stocks, caisses et équipes' },
  ACCOUNTANT: { label: 'Comptable', color: '#059669', desc: 'Facturation, dépenses, créances et bilans' },
  CASHIER: { label: 'Caissier', color: '#D97706', desc: 'Ventes au comptoir (POS) et encaissements' },
  INVENTORY_MANAGER: { label: 'Gestionnaire Stock', color: '#4B5563', desc: 'Entrées, sorties et inventaires physiques' },
  AUDITOR: { label: 'Auditeur Interne', color: '#DC2626', desc: 'Lecture seule des journaux d\'audit et anomalies' },
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  // Formulaire création
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER',
  });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getUsers();
      setUsers(data);
    } catch (err: any) {
      error(err.message || 'Erreur lors du chargement des collaborateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ApiClient.createUser(formData);
      success('Collaborateur créé avec succès !');
      setShowModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'CASHIER',
      });
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    if (user.id === currentUser?.id) {
      error('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }

    try {
      await ApiClient.updateUser(user.id, { isActive: !user.isActive });
      success(`Compte ${user.isActive ? 'désactivé' : 'activé'} avec succès`);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await ApiClient.updateUser(userId, { role: newRole });
      success('Rôle mis à jour avec succès');
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Erreur lors du changement de rôle');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="#1E40AF" /> Gestion des Rôles & Collaborateurs (RBAC)
          </h1>
          <p className="page-subtitle">
            Configurez les profils d'accès, affectez les rôles et contrôlez les autorisations de votre équipe.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchUsers} className="btn-secondary" title="Actualiser">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <UserPlus size={16} /> Nouveau Collaborateur
          </button>
        </div>
      </div>

      {/* ── Sélecteur d'Onglets ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Users size={15} /> Collaborateurs ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`btn btn-sm ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ShieldCheck size={15} /> Matrice des Habilitations (RBAC & SoD)
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Barre de recherche */}
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
          <input
            type="text"
            className="input"
            placeholder="Rechercher par nom, email, téléphone ou rôle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Grille des Utilisateurs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Chargement de l'équipe...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={36} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
          <p>Aucun collaborateur trouvé.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredUsers.map((u) => {
            const roleInfo = ROLE_INFO[u.role] || { label: u.role, color: '#64748B', desc: 'Rôle personnalisé' };
            const isMe = u.id === currentUser?.id;

            return (
              <div key={u.id} className="card" style={{ padding: '20px', borderTop: `4px solid ${roleInfo.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                      {u.firstName} {u.lastName} {isMe && <span style={{ fontSize: '11px', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>Vous</span>}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                      <Mail size={13} /> {u.email}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={isMe}
                    title={u.isActive ? 'Désactiver le compte' : 'Activer le compte'}
                    style={{ background: 'none', border: 'none', cursor: isMe ? 'not-allowed' : 'pointer' }}
                  >
                    {u.isActive ? <CheckCircle2 size={20} color="#16A34A" /> : <XCircle size={20} color="#DC2626" />}
                  </button>
                </div>

                {u.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>
                    <Phone size={13} /> {u.phone}
                  </div>
                )}

                {/* Sélecteur de Rôle RBAC */}
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={13} color={roleInfo.color} /> Rôle & Permissions :
                    </span>
                  </div>

                  <select
                    className="input"
                    value={u.role}
                    disabled={isMe}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{ fontSize: '13px', fontWeight: 600, color: roleInfo.color }}
                  >
                    {Object.keys(ROLE_INFO).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_INFO[r].label}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748B' }}>{roleInfo.desc}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94A3B8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> Ajouté le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <span style={{ fontWeight: 600, color: u.isActive ? '#16A34A' : '#DC2626' }}>
                    {u.isActive ? 'Actif' : 'Désactivé'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  ) : (
    /* ── Vue Matrice des Permissions & Sécurité RBAC ── */
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#2563EB" />
            Matrice de Ségrégation des Tâches (Segregation of Duties - SoD)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Conformité aux normes d’audit et politique d’accès au moindre privilège (Principle of Least Privilege).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
            <Check size={13} /> Autorisé
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#DBEAFE', color: '#1E40AF', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
            <Layers size={13} /> Lecture Seule
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', color: '#94A3B8', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            <X size={13} /> Refusé
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155' }}>Domaine & Droit d’Accès</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#7C3AED' }}>Super Admin</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#1E40AF' }}>Propriétaire (DG)</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#0369A1' }}>Gérant</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>Comptable</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#D97706' }}>Caissier</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#DC2626' }}>Auditeur</th>
            </tr>
          </thead>
          <tbody>
            {RBAC_RULES.map((rule, idx) => {
              const renderBadge = (val: 'ALL' | 'READ' | 'NONE') => {
                if (val === 'ALL') {
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#DCFCE7', color: '#166534', padding: '3px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                      <Check size={12} /> Total
                    </span>
                  );
                }
                if (val === 'READ') {
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#DBEAFE', color: '#1E40AF', padding: '3px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                      <Layers size={12} /> Lecture
                    </span>
                  );
                }
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#F8FAFC', color: '#94A3B8', padding: '3px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                    <X size={12} /> —
                  </span>
                );
              };

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FBFDFE' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{rule.permission}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      <span style={{ fontWeight: 600, color: '#475569' }}>[{rule.domain}]</span> {rule.description}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>{renderBadge(rule.roles.SUPER_ADMIN)}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>{renderBadge(rule.roles.ORG_OWNER)}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>{renderBadge(rule.roles.MANAGER)}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>{renderBadge(rule.roles.ACCOUNTANT)}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>{renderBadge(rule.roles.CASHIER)}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>{renderBadge(rule.roles.AUDITOR)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}

      {/* Modal Création Collaborateur */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Ajouter un Collaborateur</h2>
              <button onClick={() => setShowModal(false)} className="btn-close">×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="label">Prénom *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Nom *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Adresse Email Professionnelle *</label>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="collaborateur@entreprise.cd"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Numéro de Téléphone (Optionnel)</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+243 812 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Rôle Attribué (Permissions RBAC) *</label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {Object.keys(ROLE_INFO).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_INFO[r].label} — {ROLE_INFO[r].desc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Mot de passe Temporaire</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Par défaut : Pme@2026!"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <small style={{ color: '#64748B', fontSize: '11px' }}>
                  Si laissé vide, le mot de passe initial sera <code>Pme@2026!</code>
                </small>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Enregistrement...' : 'Créer le Collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
