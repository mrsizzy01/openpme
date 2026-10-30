import { offlineSync, type OfflineOperation } from '../services/offlineSync';

export interface OfflineSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
}

export interface OfflineSale {
  offlineId: string;
  createdAt: string;
  customerId?: string;
  customerName?: string;
  items: OfflineSaleItem[];
  currency: string;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  discountTotal?: number;
  cashSessionId?: string;
  notes?: string;
  status: 'PENDING_SYNC' | 'SYNCED' | 'ERROR';
  errorMessage?: string;
}

function toLegacySale(operation: OfflineOperation): OfflineSale {
  const payload = operation.payload as Record<string, any>;
  return {
    offlineId: operation.id,
    createdAt: operation.createdAt,
    customerId: payload.customerId,
    customerName: payload.customerName,
    items: payload.items ?? [],
    currency: payload.currency ?? 'CDF',
    paymentMethod: payload.paymentMethod ?? 'CASH',
    cashReceived: payload.cashReceived === undefined ? undefined : Number(payload.cashReceived),
    changeGiven: payload.changeGiven,
    discountTotal: payload.discountTotal,
    cashSessionId: payload.cashSessionId,
    notes: payload.notes,
    status: operation.status === 'synced' ? 'SYNCED' : operation.status === 'needs_review' ? 'ERROR' : 'PENDING_SYNC',
    errorMessage: operation.lastError,
  };
}

export class OfflineSyncService {
  static isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  static async getQueue(): Promise<OfflineSale[]> {
    return (await offlineSync.getQueue())
      .filter((operation) => operation.type === 'sale.create')
      .map(toLegacySale);
  }

  static async getPendingCount(): Promise<number> {
    return offlineSync.getPendingCount();
  }

  static async saveOfflineSale(saleData: Omit<OfflineSale, 'offlineId' | 'createdAt' | 'status' | 'errorMessage'>): Promise<OfflineSale> {
    const operation = await offlineSync.enqueueSale({
      customerId: saleData.customerId,
      currency: saleData.currency,
      immediatePayment: true,
      paymentMethod: saleData.paymentMethod,
      payments: saleData.cashReceived === undefined
        ? []
        : [{
          amount: String(saleData.cashReceived),
          currency: saleData.currency,
          method: saleData.paymentMethod,
          cashSessionId: saleData.cashSessionId,
        }],
      notes: saleData.notes,
      items: saleData.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        discountPercent: item.discount ?? 0,
      })),
    });
    return toLegacySale(operation);
  }

  static async syncAll(onProgress?: (synced: number, total: number) => void) {
    return offlineSync.syncPendingSales(onProgress);
  }

  static async clearCompleted(): Promise<void> {
    return offlineSync.clearCompleted();
  }
}
