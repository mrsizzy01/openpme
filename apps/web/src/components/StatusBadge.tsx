import React from 'react';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getBadgeStyle = (st: string) => {
    switch (st?.toUpperCase()) {
      case 'PAID':
      case 'COMPLETED':
      case 'ACTIVE':
      case 'RESOLVED':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.3)' };
      case 'PENDING':
      case 'ISSUED':
      case 'UNDER_REVIEW':
      case 'OPEN':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#EAB308', border: 'rgba(234, 179, 8, 0.3)' };
      case 'OVERDUE':
      case 'CANCELLED':
      case 'FAILED':
      case 'CRITICAL':
      case 'DISMISSED':
      case 'HIGH':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'PARTIALLY_PAID':
      case 'MEDIUM':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const getLabel = (st: string) => {
    if (label) return label;
    switch (st?.toUpperCase()) {
      case 'PAID': return 'Payée';
      case 'COMPLETED': return 'Terminée';
      case 'ACTIVE': return 'Actif';
      case 'RESOLVED': return 'Résolu';
      case 'PENDING': return 'En attente';
      case 'ISSUED': return 'Émise';
      case 'UNDER_REVIEW': return 'En revue';
      case 'OPEN': return 'Ouverte';
      case 'OVERDUE': return 'En retard';
      case 'CANCELLED': return 'Annulée';
      case 'PARTIALLY_PAID': return 'Partiellement payée';
      case 'CRITICAL': return 'Critique';
      case 'HIGH': return 'Élevée';
      case 'MEDIUM': return 'Moyenne';
      case 'LOW': return 'Faible';
      default: return st;
    }
  };

  const style = getBadgeStyle(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: style.text,
          marginRight: '6px',
        }}
      />
      {getLabel(status)}
    </span>
  );
};
