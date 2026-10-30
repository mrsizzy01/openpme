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
  Copy,
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
  isOnline: boolean;
  activeSessionsCount: number;
  lastSeenAt: string | null;
}

const ROLE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#7C3AED', desc: 'Contrôle système total et maintenance' },
  ORG_OWNER: { label: 'Propriétaire / DG', color: '#1E40AF', desc: 'Gestion financière, paramètres et validation totale' },
  MANAGER: { label: 'Gérant / Manager', color: '#0369A1', desc: 'Contrôle des opérations, paramètres et collaborateurs de l’entreprise' },
  ACCOUNTANT: { label: 'Comptable', color: '#059669', desc: 'Facturation, dépenses, créances et bilans' },
  CASHIER: { label: 'Caissier', color: '#D97706', desc: 'Ventes au comptoir (POS) et encaissements' },
  SALES_REP: { label: 'Commercial', color: '#0E7490', desc: 'Ventes et suivi des clients' },
  INVENTORY_MANAGER: { label: 'Gestionnaire Stock', color: '#4B5563', desc: 'Entrées, sorties et inventaires physiques' },
  PURCHASER: { label: 'Acheteur', color: '#7C3AED', desc: 'Consultation des fournisseurs et achats' },
  AUDITOR: { label: 'Auditeur Interne', color: '#DC2626', desc: 'Lecture seule des journaux d\'audit et anomalies' },
};

const ASSIGNABLE_ROLE_KEYS = Object.keys(ROLE_INFO).filter(
  (role) => role !== 'SUPER_ADMIN' && role !== 'ORG_OWNER',
);

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{ email: string; password: string } | null>(null);

  // Formulaire création
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
    const refreshInterval = window.setInterval(() => {
      void fetchUsers();
    }, 30_000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  const onlineCount = users.filter((u) => u.isOnline).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await ApiClient.createUser(formData);
      success('Collaborateur créé avec succès !');
      setShowModal(false);
      setTemporaryPassword({ email: created.email, password: created.temporaryPassword });
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'CASHIER',
      });
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    try {
      const result = await ApiClient.resetUserPassword(user.id);
      setTemporaryPassword({ email: result.email, password: result.temporaryPassword });
      success('Nouveau mot de passe généré. Il ne sera affiché qu’une seule fois.');
    } catch (err: any) {
      error(err.message || 'Erreur lors de la réinitialisation du mot de passe');
    }
  };

  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword.password);
      success('Mot de passe copié.');
    } catch {
      error('Copie impossible. Sélectionnez et copiez le mot de passe manuellement.');
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
            Gérez les accès, rôles et sessions de votre équipe. Les statuts de présence sont actualisés automatiquement.
          </p>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: onlineCount ? '#16A34A' : '#94A3B8' }} />
            {onlineCount} collaborateur{onlineCount === 1 ? '' : 's'} en ligne sur {users.filter((u) => u.isActive).length} actif{users.filter((u) => u.isActive).length === 1 ? '' : 's'}
          </div>
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
            const isProtected = u.role === 'ORG_OWNER' || u.role === 'SUPER_ADMIN';
            const canManageUser = !isMe && !isProtected;

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
                    disabled={!canManageUser}
                    title={u.isActive ? 'Désactiver le compte' : 'Activer le compte'}
                    style={{ background: 'none', border: 'none', cursor: canManageUser ? 'pointer' : 'not-allowed' }}
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
                    disabled={!canManageUser}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{ fontSize: '13px', fontWeight: 600, color: roleInfo.color }}
                  >
                    {ASSIGNABLE_ROLE_KEYS.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_INFO[r].label}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748B' }}>{roleInfo.desc}</p>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!canManageUser}
                  onClick={() => handleResetPassword(u)}
                  style={{ marginBottom: '14px', width: '100%', opacity: canManageUser ? 1 : 0.55 }}
                >
                  <Key size={14} /> Réinitialiser le mot de passe
                </button>
                {isProtected && (
                  <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#64748B' }}>
                    Compte protégé : seul son titulaire peut utiliser ce compte.
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94A3B8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> Ajouté le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <span style={{ fontWeight: 600, color: u.isActive ? '#16A34A' : '#DC2626' }}>
                    {u.isActive ? 'Actif' : 'Désactivé'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '10px', color: u.isOnline ? '#15803D' : '#64748B' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.isOnline ? '#16A34A' : '#CBD5E1' }} />
                  <span>
                    {u.isOnline
                      ? `En ligne${u.activeSessionsCount > 1 ? ` · ${u.activeSessionsCount} sessions` : ''}`
                      : u.lastSeenAt
                        ? `Vu le ${new Date(u.lastSeenAt).toLocaleString('fr-FR')}`
                        : 'Jamais connecté'}
                  </span>
                </div>
              </div>
            );
          })}
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
                  {ASSIGNABLE_ROLE_KEYS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_INFO[r].label} — {ROLE_INFO[r].desc}
                    </option>
                  ))}
                </select>
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

      {temporaryPassword && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Nouveau mot de passe</h2>
              <button onClick={() => setTemporaryPassword(null)} className="btn-close">×</button>
            </div>
            <p>
              Transmettez ce mot de passe à <strong>{temporaryPassword.email}</strong> par un canal sûr.
              Il ne sera plus visible après la fermeture de cette fenêtre.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input" readOnly value={temporaryPassword.password} />
              <button type="button" className="btn-secondary" onClick={copyTemporaryPassword} title="Copier le mot de passe">
                <Copy size={16} />
              </button>
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-primary" onClick={() => setTemporaryPassword(null)}>
                J’ai noté le mot de passe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
