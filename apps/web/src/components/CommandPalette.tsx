import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  ShieldAlert,
  Users,
  Truck,
  Monitor,
  Settings,
  PlusCircle,
  ArrowRight,
  X,
  Lock,
  Calculator,
  LucideIcon,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Navigation' | 'Actions Rapides' | 'Outils';
  icon: LucideIcon;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Tableau de bord',
      subtitle: 'Indicateurs clés, ventes du jour et alertes',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => { navigate('/'); onClose(); },
      keywords: ['dashboard', 'statistiques', 'ventes', 'recettes', 'accueil'],
    },
    {
      id: 'nav-pos',
      title: 'Caisse & Point de Vente (POS)',
      subtitle: 'Enregistrement des ventes directes et impression tickets',
      category: 'Navigation',
      icon: ShoppingCart,
      action: () => { navigate('/sales'); onClose(); },
      keywords: ['vente', 'pos', 'caisse', 'ticket', 'panier', 'scanner'],
    },
    {
      id: 'nav-products',
      title: 'Produits & Gestion des Stocks',
      subtitle: 'Inventaire, seuils d’alerte, prix d’achat et vente',
      category: 'Navigation',
      icon: Package,
      action: () => { navigate('/products'); onClose(); },
      keywords: ['stock', 'catalogue', 'prix', 'articles', 'marchandises'],
    },
    {
      id: 'nav-invoices',
      title: 'Facturation & Créances',
      subtitle: 'Factures proforma, échéances et recouvrements',
      category: 'Navigation',
      icon: Receipt,
      action: () => { navigate('/invoices'); onClose(); },
      keywords: ['facture', 'créance', 'dette', 'impayé', 'règlement', 'échéance'],
    },
    {
      id: 'nav-finances',
      title: 'Trésorerie & Clôture de Caisse',
      subtitle: 'Dépenses, comptes financiers et billetage journalier (Z de caisse)',
      category: 'Navigation',
      icon: Wallet,
      action: () => { navigate('/finances'); onClose(); },
      keywords: ['caisse', 'billetage', 'dépense', 'clôture', 'z de caisse', 'banque'],
    },
    {
      id: 'nav-anomalies',
      title: 'Anomalies, Fraude & Audit Sécurité',
      subtitle: 'Détection IA d’écarts et journal des actions sensibles',
      category: 'Navigation',
      icon: ShieldAlert,
      action: () => { navigate('/anomalies'); onClose(); },
      keywords: ['anomalie', 'fraude', 'audit', 'sécurité', 'écart', 'contrôle'],
    },
    {
      id: 'nav-customers',
      title: 'Répertoire Clients & Fidélité',
      subtitle: 'Portefeuille clients, encours et coordonnées',
      category: 'Navigation',
      icon: Users,
      action: () => { navigate('/customers'); onClose(); },
      keywords: ['client', 'acheteur', 'téléphone', 'dette', 'société'],
    },
    {
      id: 'nav-suppliers',
      title: 'Fournisseurs & Réapprovisionnement',
      subtitle: 'Commandes d’achat et gestion des partenaires',
      category: 'Navigation',
      icon: Truck,
      action: () => { navigate('/suppliers'); onClose(); },
      keywords: ['fournisseur', 'commande', 'achat', 'livraison'],
    },
    {
      id: 'nav-users',
      title: 'Équipe & Gestion des Rôles (RBAC)',
      subtitle: 'Caissiers, gestionnaires, auditeurs et permissions',
      category: 'Navigation',
      icon: Users,
      action: () => { navigate('/users'); onClose(); },
      keywords: ['utilisateur', 'caissier', 'admin', 'mot de passe', 'rôle', 'droit'],
    },
    {
      id: 'nav-terminals',
      title: 'Terminaux & Postes Caisses',
      subtitle: 'Gestion des points de vente et verrouillage à distance',
      category: 'Navigation',
      icon: Monitor,
      action: () => { navigate('/terminals'); onClose(); },
      keywords: ['terminal', 'pos', 'verrouiller', 'poste', 'hardware'],
    },
    {
      id: 'nav-settings',
      title: 'Paramètres & Configuration Entreprise',
      subtitle: 'NIF, RCCM, devises, taux de change et sauvegarde',
      category: 'Navigation',
      icon: Settings,
      action: () => { navigate('/settings'); onClose(); },
      keywords: ['paramètre', 'société', 'nif', 'rccm', 'taux', 'configuration'],
    },

    // Actions rapides
    {
      id: 'act-new-sale',
      title: 'Nouvelle Vente Immédiate',
      subtitle: 'Ouvrir l’interface d’encaissement directe',
      category: 'Actions Rapides',
      icon: PlusCircle,
      action: () => { navigate('/sales'); onClose(); },
      keywords: ['vendre', 'encaisser', 'nouveau ticket'],
    },
    {
      id: 'act-cash-close',
      title: 'Clôturer la Caisse (Billetage Z)',
      subtitle: 'Décompte physique CDF / USD et rapport journalier',
      category: 'Actions Rapides',
      icon: Lock,
      action: () => { navigate('/finances'); onClose(); },
      keywords: ['fermer caisse', 'billetage', 'fin de journée', 'clôture'],
    },
    {
      id: 'act-new-product',
      title: 'Ajouter un Produit au Catalogue',
      subtitle: 'Créer une référence avec code-barres et prix',
      category: 'Actions Rapides',
      icon: PlusCircle,
      action: () => { navigate('/products'); onClose(); },
      keywords: ['ajouter article', 'créer produit', 'nouveau stock'],
    },
    {
      id: 'act-audit-log',
      title: 'Consulter l’Historique d’Audit',
      subtitle: 'Vérifier les annulations et modifications récentes',
      category: 'Actions Rapides',
      icon: ShieldAlert,
      action: () => { navigate('/anomalies'); onClose(); },
      keywords: ['journal audit', 'traçabilité', 'qui a fait quoi', 'logs'],
    },
  ];

  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchSub = item.subtitle.toLowerCase().includes(q);
    const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
    return matchTitle || matchSub || matchKeywords;
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Barre de recherche */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
            gap: '12px',
          }}
        >
          <Search size={20} color="#64748B" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une action, une page, un module... (ou taper pour filtrer)"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '15px',
              outline: 'none',
              color: '#0F172A',
              fontWeight: 500,
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 7px',
              background: '#E2E8F0',
              color: '#475569',
              borderRadius: '5px',
              textTransform: 'uppercase',
            }}
          >
            ESC
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#94A3B8',
              display: 'flex',
              padding: 2,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Liste des résultats */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B' }}>
              <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>
                Aucun résultat pour « {query} »
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Essayez un autre mot-clé : ventes, stocks, caisse, audit, devises...
              </div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isSelected ? '#DBEAFE' : '#F1F5F9',
                      color: isSelected ? '#1D4ED8' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: isSelected ? '#1E3A8A' : '#0F172A',
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: item.category === 'Actions Rapides' ? '#FEF3C7' : '#F1F5F9',
                          color: item.category === 'Actions Rapides' ? '#92400E' : '#64748B',
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: isSelected ? '#3B82F6' : '#64748B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                  {isSelected && (
                    <ArrowRight size={15} color="#2563EB" style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pied de commande */}
        <div
          style={{
            padding: '10px 18px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span>
              <kbd style={{ padding: '2px 5px', background: '#E2E8F0', borderRadius: '3px', fontWeight: 700 }}>↑</kbd>{' '}
              <kbd style={{ padding: '2px 5px', background: '#E2E8F0', borderRadius: '3px', fontWeight: 700 }}>↓</kbd>{' '}
              Naviguer
            </span>
            <span>
              <kbd style={{ padding: '2px 5px', background: '#E2E8F0', borderRadius: '3px', fontWeight: 700 }}>↵</kbd>{' '}
              Sélectionner
            </span>
          </div>
          <div>
            <span>Smart PME Finance — Recherche Rapide</span>
          </div>
        </div>
      </div>
    </div>
  );
};
