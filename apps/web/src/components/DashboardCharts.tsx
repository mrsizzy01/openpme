import React, { useState } from 'react';
import { TrendingUp, PieChart, ArrowUpRight, DollarSign, Wallet } from 'lucide-react';
import { formatCurrency, Currency } from '@smart-pme/shared';

interface DailyData {
  date: string;
  dayLabel: string;
  sales: number;
  expenses: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
}

interface DashboardChartsProps {
  dailyData?: DailyData[];
  topExpenses?: ExpenseCategory[];
  currency?: Currency | string;
  monthlyRevenue?: number;
  monthlyExpenses?: number;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  dailyData = [],
  topExpenses = [],
  currency = 'CDF',
  monthlyRevenue = 0,
  monthlyExpenses = 0,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calcul du max pour l'échelle du graphique
  const maxVal = Math.max(
    ...dailyData.map((d) => Math.max(d.sales, d.expenses)),
    1000
  );

  const totalExpenseSum = topExpenses.reduce((sum, e) => sum + e.amount, 0) || 1;
  const netProfit = monthlyRevenue - monthlyExpenses;
  const profitMarginPercent = monthlyRevenue > 0
    ? Math.max(0, Math.min(100, Math.round((netProfit / monthlyRevenue) * 100)))
    : 0;

  const chartHeight = 180;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '20px',
        marginBottom: '20px',
      }}
    >
      {/* 1. Histogramme 7 jours (Ventes vs Dépenses) */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>
                  Évolution des 7 Derniers Jours
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Comparatif dynamique des Encaissements vs Décaissements
                </span>
              </div>
            </div>

            {/* Légende */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#2563EB', display: 'inline-block' }} />
                <span style={{ color: '#475569' }}>Recettes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#F59E0B', display: 'inline-block' }} />
                <span style={{ color: '#475569' }}>Dépenses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visualisation SVG / Bar Chart */}
        <div style={{ position: 'relative', height: `${chartHeight + 40}px`, marginTop: '10px' }}>
          {/* Lignes de repère horizontales */}
          <div style={{ position: 'absolute', inset: `0 0 30px 0`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
            <div style={{ borderBottom: '1px dashed #E2E8F0', height: 0, width: '100%' }} />
            <div style={{ borderBottom: '1px dashed #E2E8F0', height: 0, width: '100%' }} />
            <div style={{ borderBottom: '1px solid #CBD5E1', height: 0, width: '100%' }} />
          </div>

          {/* Barres par jour */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              paddingBottom: '30px',
            }}
          >
            {dailyData.map((d, idx) => {
              const salesHeight = Math.max(4, Math.round((d.sales / maxVal) * chartHeight));
              const expHeight = Math.max(4, Math.round((d.expenses / maxVal) * chartHeight));
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={d.date}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    position: 'relative',
                    flex: 1,
                  }}
                >
                  {/* Tooltip info au survol */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: `${Math.max(salesHeight, expHeight) + 40}px`,
                        background: '#0F172A',
                        color: '#F8FAFC',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.7rem',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        pointerEvents: 'none',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2px', marginBottom: '2px' }}>
                        {d.dayLabel}
                      </div>
                      <div style={{ color: '#60A5FA' }}>
                        Ventes : {formatCurrency(d.sales, currency as Currency)}
                      </div>
                      <div style={{ color: '#FBBF24' }}>
                        Dépenses : {formatCurrency(d.expenses, currency as Currency)}
                      </div>
                    </div>
                  )}

                  {/* Groupe de barres côte à côte */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                    {/* Barre Recettes */}
                    <div
                      style={{
                        width: '14px',
                        height: `${salesHeight}px`,
                        background: isHovered ? '#1D4ED8' : '#2563EB',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease, background 0.15s ease',
                      }}
                    />
                    {/* Barre Dépenses */}
                    <div
                      style={{
                        width: '14px',
                        height: `${expHeight}px`,
                        background: isHovered ? '#D97706' : '#F59E0B',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease, background 0.15s ease',
                      }}
                    />
                  </div>

                  {/* Libellé du jour sous la barre */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-24px',
                      fontSize: '0.7rem',
                      fontWeight: isHovered ? 700 : 500,
                      color: isHovered ? '#0F172A' : '#64748B',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Répartition des Dépenses & Jauge de Rentabilité */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#FEF3C7', color: '#D97706' }}>
              <PieChart size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>
                Structure des Charges
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Postes de dépenses principaux du mois
              </span>
            </div>
          </div>

          {/* Liste des postes de dépenses */}
          {topExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem', padding: '30px 0' }}>
              Aucune dépense enregistrée sur cette période.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topExpenses.map((exp, index) => {
                const percent = Math.round((exp.amount / totalExpenseSum) * 100);
                const colors = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
                const barColor = colors[index % colors.length];

                return (
                  <div key={exp.category} style={{ fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{exp.category}</span>
                      <span style={{ color: '#64748B' }}>
                        {formatCurrency(exp.amount, currency as Currency)} ({percent}%)
                      </span>
                    </div>
                    {/* Barre de progression */}
                    <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: barColor,
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Indicateur de Rentabilité Nette */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
              Taux de Marge Opérationnelle
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: netProfit >= 0 ? '#16A34A' : '#DC2626' }}>
              {profitMarginPercent}%
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: netProfit >= 0 ? '#DCFCE7' : '#FEE2E2',
              color: netProfit >= 0 ? '#166534' : '#991B1B',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowUpRight size={14} />
            {netProfit >= 0 ? 'Bénéficiaire' : 'Déficitaire'}
          </div>
        </div>
      </div>
    </div>
  );
};
