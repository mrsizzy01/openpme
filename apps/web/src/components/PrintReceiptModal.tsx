import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    receiptNumber: string;
    date: string;
    organizationName: string;
    taxId?: string;
    rccm?: string;
    phone?: string;
    address?: string;
    customerName?: string;
    cashierName?: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    taxAmount: number;
    discountAmount?: number;
    total: number;
    currency: string;
    paymentMethod: string;
    amountPaid?: number;
    changeGiven?: number;
  } | null;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptData,
}) => {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#22C55E" />
            <span style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.95rem' }}>
              Ticket de Caisse Validé
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div
          id="printable-receipt"
          style={{
            padding: '24px',
            overflowY: 'auto',
            background: '#FFFFFF',
            color: '#1E293B',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {receiptData.organizationName}
            </h2>
            {receiptData.address && <div>{receiptData.address}</div>}
            {receiptData.phone && <div>Tél: {receiptData.phone}</div>}
            {receiptData.taxId && <div>NIF: {receiptData.taxId}</div>}
            {receiptData.rccm && <div>RCCM: {receiptData.rccm}</div>}
            <div style={{ margin: '8px 0', borderBottom: '1px dashed #64748B' }} />
            <div style={{ fontWeight: 'bold' }}>TICKET #{receiptData.receiptNumber}</div>
            <div>Date : {receiptData.date}</div>
            {receiptData.cashierName && <div>Caissier : {receiptData.cashierName}</div>}
            {receiptData.customerName && <div>Client : {receiptData.customerName}</div>}
          </div>

          <div style={{ margin: '10px 0', borderBottom: '1px dashed #64748B' }} />

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                <th style={{ paddingBottom: '4px' }}>Désignation</th>
                <th style={{ paddingBottom: '4px', textAlign: 'center' }}>Qté</th>
                <th style={{ paddingBottom: '4px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {receiptData.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px dotted #E2E8F0' }}>
                  <td style={{ padding: '6px 0' }}>{item.name}</td>
                  <td style={{ padding: '6px 0', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>
                    {item.total.toLocaleString()} {receiptData.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ margin: '12px 0', borderBottom: '1px dashed #64748B' }} />

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sous-total :</span>
              <span>{receiptData.subtotal.toLocaleString()} {receiptData.currency}</span>
            </div>
            {receiptData.discountAmount ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                <span>Remise :</span>
                <span>-{receiptData.discountAmount.toLocaleString()} {receiptData.currency}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TVA (16%) :</span>
              <span>{receiptData.taxAmount.toLocaleString()} {receiptData.currency}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '15px',
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px solid #1E293B',
              }}
            >
              <span>TOTAL NET :</span>
              <span>{receiptData.total.toLocaleString()} {receiptData.currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#64748B' }}>
              <span>Mode de paiement :</span>
              <span>{receiptData.paymentMethod}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#64748B' }}>
            Merci pour votre visite !<br />
            Smart PME Finance RDC
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <Printer size={16} />
            Imprimer le Ticket
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#F8FAFC',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
