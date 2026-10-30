import { ApiClient } from '../api/client';

export type OfflineOperationType =
  | 'sale.create'
  | 'stock.move'
  | 'payment.create'
  | 'expense.create'
  | 'product.update';
export type OfflineOperationStatus = 'queued' | 'syncing' | 'needs_review' | 'synced' | 'archived';

export interface OfflineOperation<T = unknown> {
  id: string;
  type: OfflineOperationType;
  payload: T;
  createdAt: string;
  status: OfflineOperationStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
}

export interface OfflineConflict {
  id: string;
  operationId: string;
  operationType: OfflineOperationType;
  occurredAt: string;
  message: string;
  status: 'open' | 'resolved' | 'archived';
}

export interface OfflineSyncSnapshot {
  status: 'synced' | 'offline' | 'syncing' | 'error';
  pendingCount: number;
  reviewCount: number;
  isOnline: boolean;
  errorMessage?: string;
}

interface ApiError extends Error {
  statusCode?: number;
}

interface EncryptedPayload {
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
}

interface StoredOperation extends Omit<OfflineOperation, 'payload'> {
  payload: EncryptedPayload;
  legacyId?: string;
}

interface OfflineApi {
  createSale(data: any): Promise<any>;
  createStockMovement(productId: string, data: any): Promise<any>;
  createPayment(data: any): Promise<any>;
  createExpense(data: any): Promise<any>;
  updateProduct(id: string, data: any): Promise<any>;
}

interface OfflineSyncOptions {
  databaseName?: string;
  api?: OfflineApi;
  isOnline?: () => boolean;
}

const DATABASE_NAME = 'smart-pme-offline';
const DATABASE_VERSION = 1;
const OPERATIONS_STORE = 'operations';
const CONFLICTS_STORE = 'conflicts';
const META_STORE = 'meta';
const LEGACY_KEYS = ['smart_pme_offline_sales_queue', 'SMART_PME_OFFLINE_SALES_QUEUE'];
const MAX_BACKOFF_MS = 5 * 60 * 1000;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Lecture IndexedDB impossible.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Écriture IndexedDB annulée.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Écriture IndexedDB impossible.'));
  });
}

function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function createLegacyUuid(key: string, index: number, entry: Record<string, any>): Promise<string> {
  const legacyIdentity = entry.id ?? entry.offlineId ?? `${key}:${entry.createdAt ?? 'unknown'}:${index}`;
  const digest = new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(legacyIdentity)),
  ));
  digest[6] = (digest[6] & 0x0f) | 0x40;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = [...digest.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erreur inconnue pendant la synchronisation.';
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const statusCode = (error as ApiError).statusCode;
  if (statusCode !== undefined) return statusCode === 408 || statusCode === 429 || statusCode >= 500;
  return /inaccessible|réseau|network|fetch|connexion/i.test(error.message);
}

export function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const statusCode = (error as ApiError).statusCode;
  if (statusCode !== undefined) return statusCode === 408 || statusCode === 429 || statusCode >= 500;
  return /inaccessible|réseau|network|fetch|connexion/i.test(error.message);
}

function legacySalePayload(sale: Record<string, any>): Record<string, unknown> {
  const payments = Array.isArray(sale.payments)
    ? sale.payments.map((payment: Record<string, any>) => ({
      ...payment,
      amount: String(payment.amount),
    }))
    : sale.cashReceived === undefined
      ? []
      : [{
        amount: String(sale.cashReceived),
        currency: sale.currency ?? 'CDF',
        method: sale.paymentMethod ?? 'CASH',
        cashSessionId: sale.cashSessionId,
        reference: sale.paymentReference,
      }];
  return {
    customerId: sale.customerId,
    immediatePayment: sale.immediatePayment ?? payments.length > 0,
    paymentMethod: sale.paymentMethod ?? 'CASH',
    currency: sale.currency ?? 'CDF',
    payments,
    cashReceived: sale.cashReceived === undefined ? undefined : String(sale.cashReceived),
    cashSessionId: sale.cashSessionId,
    notes: sale.notes ?? (sale.offlineId ? `[Synchronisé hors-ligne ${sale.offlineId}]` : undefined),
    items: Array.isArray(sale.items)
      ? sale.items.map((item: Record<string, any>) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        discountPercent: item.discountPercent ?? 0,
        taxRatePercent: item.taxRatePercent ?? 0,
      }))
      : [],
  };
}

export class OfflineSyncService {
  private readonly databaseName: string;
  private readonly api: OfflineApi;
  private readonly isOnline: () => boolean;
  private databasePromise: Promise<IDBDatabase> | null = null;
  private encryptionKeyPromise: Promise<CryptoKey> | null = null;
  private initializationPromise: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private syncing = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: OfflineSyncOptions = {}) {
    this.databaseName = options.databaseName ?? DATABASE_NAME;
    this.api = options.api ?? ApiClient;
    this.isOnline = options.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);
  }

  initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.openDatabase()
        .then(() => this.recoverInterruptedOperations())
        .then(() => this.migrateLegacyQueues())
        .then(() => this.startRetryTimer())
        .catch((error) => {
          this.emit();
          throw error;
        });
    }
    return this.initializationPromise;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    void this.initialize().then(() => this.emit()).catch((error) => console.error('Initialisation hors-ligne impossible.', error));
    return () => this.listeners.delete(listener);
  }

  async getSnapshot(): Promise<OfflineSyncSnapshot> {
    try {
      await this.initialize();
    } catch (error) {
      return {
        status: 'error',
        pendingCount: 0,
        reviewCount: 0,
        isOnline: this.isOnline(),
        errorMessage: errorMessage(error),
      };
    }
    const operations = await this.getStoredOperations();
    const pendingCount = operations.filter((operation) => operation.status === 'queued' || operation.status === 'syncing').length;
    const reviewCount = operations.filter((operation) => operation.status === 'needs_review').length;
    const isOnline = this.isOnline();
    const status = reviewCount > 0 ? 'error'
      : this.syncing ? 'syncing'
        : !isOnline && pendingCount > 0 ? 'offline'
          : pendingCount > 0 ? 'syncing'
            : 'synced';
    return { status, pendingCount, reviewCount, isOnline };
  }

  async getPendingCount(): Promise<number> {
    return (await this.getSnapshot()).pendingCount;
  }

  async getPendingSyncError(): Promise<string> {
    await this.initialize();
    const review = (await this.getStoredOperations()).find((operation) => operation.status === 'needs_review');
    return review?.lastError ?? '';
  }

  async getQueue(): Promise<OfflineOperation[]> {
    await this.initialize();
    return Promise.all((await this.getStoredOperations()).map((operation) => this.decryptOperation(operation)));
  }

  async getReviewOperations(): Promise<OfflineOperation[]> {
    return (await this.getQueue()).filter((operation) => operation.status === 'needs_review');
  }

  async getConflictLog(): Promise<OfflineConflict[]> {
    await this.initialize();
    const db = await this.openDatabase();
    const transaction = db.transaction(CONFLICTS_STORE, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult<OfflineConflict[]>(transaction.objectStore(CONFLICTS_STORE).getAll());
    await done;
    return records.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async enqueueSale(payload: Record<string, unknown>): Promise<OfflineOperation<Record<string, unknown>>> {
    const operationId = typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : undefined;
    return this.enqueue('sale.create', payload, operationId);
  }

  async enqueueStockMovement(productId: string, payload: Record<string, unknown>): Promise<OfflineOperation> {
    return this.enqueue('stock.move', { productId, ...payload });
  }

  async enqueuePayment(payload: Record<string, unknown>): Promise<OfflineOperation> {
    const operationId = typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : undefined;
    return this.enqueue('payment.create', payload, operationId);
  }

  async enqueueExpense(payload: Record<string, unknown>): Promise<OfflineOperation> {
    const operationId = typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : undefined;
    return this.enqueue('expense.create', payload, operationId);
  }

  async enqueueProductUpdate(productId: string, payload: Record<string, unknown>): Promise<OfflineOperation> {
    return this.enqueue('product.update', { productId, data: payload });
  }

  async retryOperation(operationId: string): Promise<void> {
    await this.updateOperation(operationId, {
      status: 'queued',
      attempts: 0,
      nextAttemptAt: 0,
      lastError: undefined,
    });
    await this.syncPendingSales();
  }

  async archiveOperation(operationId: string): Promise<void> {
    await this.updateOperation(operationId, { status: 'archived' });
    const db = await this.openDatabase();
    const transaction = db.transaction(CONFLICTS_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(CONFLICTS_STORE);
    const conflicts = await requestResult<OfflineConflict[]>(store.getAll());
    for (const conflict of conflicts.filter((item) => item.operationId === operationId && item.status === 'open')) {
      store.put({ ...conflict, status: 'archived' });
    }
    await done;
    this.emit();
  }

  async syncPendingSales(onProgress?: (synced: number, total: number) => void): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    await this.initialize();
    if (!this.isOnline() || this.syncing) return { synced: 0, failed: 0, errors: [] };
    this.syncing = true;
    this.emit();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    try {
      const operations = (await this.getStoredOperations())
        .filter((operation) => operation.status === 'queued' && operation.nextAttemptAt <= Date.now())
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (let index = 0; index < operations.length; index += 1) {
        if (!this.isOnline()) break;
        const operation = await this.decryptOperation(operations[index]);
        try {
          await this.sendOperation(operation);
          await this.updateOperation(operation.id, {
            status: 'synced',
            lastError: undefined,
            nextAttemptAt: 0,
          });
          await this.resolveConflicts(operation.id);
          synced += 1;
        } catch (error) {
          const message = errorMessage(error);
          failed += 1;
          errors.push(`${operation.type} ${operation.id}: ${message}`);
          if (isRetryable(error)) {
            const attempts = operation.attempts + 1;
            const delay = Math.min(1000 * (2 ** Math.min(attempts - 1, 16)), MAX_BACKOFF_MS);
            await this.updateOperation(operation.id, {
              status: 'queued',
              attempts,
              nextAttemptAt: Date.now() + delay,
              lastError: message,
            });
          } else {
            await this.updateOperation(operation.id, {
              status: 'needs_review',
              attempts: operation.attempts + 1,
              lastError: message,
            });
            await this.recordConflict(operation, message);
          }
        }
        this.emit();
        onProgress?.(synced, operations.length);
      }
    } finally {
      this.syncing = false;
      this.emit();
      void this.scheduleRetry();
    }
    return { synced, failed, errors };
  }

  async clearCompleted(): Promise<void> {
    await this.initialize();
    const db = await this.openDatabase();
    const transaction = db.transaction(OPERATIONS_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(OPERATIONS_STORE);
    const operations = await requestResult<StoredOperation[]>(store.getAll());
    const completed = operations.filter((operation) => operation.status === 'synced')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const operation of completed.slice(50)) store.delete(operation.id);
    await done;
    this.emit();
  }

  private async enqueue<T>(type: OfflineOperationType, payload: T, operationId?: string): Promise<OfflineOperation<T>> {
    await this.initialize();
    const operation: OfflineOperation<T> = {
      id: operationId ?? createUuid(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: 'queued',
      attempts: 0,
      nextAttemptAt: 0,
    };
    await this.storeOperation(operation);
    this.emit();
    if (this.isOnline()) void this.syncPendingSales();
    return operation;
  }

  private async sendOperation(operation: OfflineOperation): Promise<void> {
    const payload = operation.payload as Record<string, any>;
    switch (operation.type) {
      case 'sale.create':
        await this.api.createSale({ ...payload, idempotencyKey: operation.id });
        return;
      case 'stock.move': {
        const { productId, ...movement } = payload;
        await this.api.createStockMovement(productId, { ...movement, idempotencyKey: operation.id });
        return;
      }
      case 'payment.create':
        await this.api.createPayment({ ...payload, idempotencyKey: operation.id });
        return;
      case 'expense.create':
        await this.api.createExpense({ ...payload, idempotencyKey: operation.id });
        return;
      case 'product.update': {
        const { productId, data } = payload;
        await this.api.updateProduct(productId, data);
        return;
      }
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    if (!globalThis.indexedDB) throw new Error('IndexedDB indisponible : vérifiez que le navigateur autorise le stockage local.');
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.databaseName, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(OPERATIONS_STORE)) {
            const operations = db.createObjectStore(OPERATIONS_STORE, { keyPath: 'id' });
            operations.createIndex('status', 'status');
            operations.createIndex('createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains(CONFLICTS_STORE)) {
            const conflicts = db.createObjectStore(CONFLICTS_STORE, { keyPath: 'id' });
            conflicts.createIndex('operationId', 'operationId');
          }
          if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Impossible d’ouvrir la file hors-ligne.'));
        request.onblocked = () => reject(new Error('La file hors-ligne est utilisée par un autre onglet. Fermez-le puis réessayez.'));
      });
    }
    return this.databasePromise;
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    if (!this.encryptionKeyPromise) {
      this.encryptionKeyPromise = (async () => {
        const db = await this.openDatabase();
        const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        const write = db.transaction(META_STORE, 'readwrite');
        const done = transactionDone(write);
        const store = write.objectStore(META_STORE);
        const existing = await requestResult<CryptoKey | undefined>(store.get('encryption-key'));
        if (existing) {
          await done;
          return existing;
        }
        store.put(generated, 'encryption-key');
        await done;
        return generated;
      })();
    }
    return this.encryptionKeyPromise;
  }

  private async encrypt(value: unknown): Promise<EncryptedPayload> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return { iv, ciphertext };
  }

  private async decryptOperation(operation: StoredOperation): Promise<OfflineOperation> {
    const key = await this.getEncryptionKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: operation.payload.iv },
      key,
      operation.payload.ciphertext,
    );
    return {
      ...operation,
      payload: JSON.parse(new TextDecoder().decode(plaintext)),
    };
  }

  private async storeOperation(operation: OfflineOperation): Promise<void> {
    const encryptedPayload = await this.encrypt(operation.payload);
    const record: StoredOperation = { ...operation, payload: encryptedPayload };
    const db = await this.openDatabase();
    const transaction = db.transaction(OPERATIONS_STORE, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(OPERATIONS_STORE).put(record);
    await done;
  }

  private async updateOperation(id: string, changes: Partial<OfflineOperation>): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(OPERATIONS_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(OPERATIONS_STORE);
    const stored = await requestResult<StoredOperation | undefined>(store.get(id));
    if (!stored) throw new Error(`L’opération ${id} est introuvable dans la file hors-ligne.`);
    store.put({ ...stored, ...changes });
    await done;
  }

  private async getStoredOperations(): Promise<StoredOperation[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction(OPERATIONS_STORE, 'readonly');
    const done = transactionDone(transaction);
    const operations = await requestResult<StoredOperation[]>(transaction.objectStore(OPERATIONS_STORE).getAll());
    await done;
    return operations;
  }

  private async recoverInterruptedOperations(): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(OPERATIONS_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(OPERATIONS_STORE);
    const operations = await requestResult<StoredOperation[]>(store.getAll());
    for (const operation of operations.filter((item) => item.status === 'syncing')) {
      store.put({ ...operation, status: 'queued', nextAttemptAt: 0 });
    }
    await done;
  }

  private async migrateLegacyQueues(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const db = await this.openDatabase();
    for (const key of LEGACY_KEYS) {
      const markerKey = `legacy-migrated:${key}`;
      const check = db.transaction(META_STORE, 'readonly');
      const checkDone = transactionDone(check);
      const migrated = await requestResult<boolean | undefined>(check.objectStore(META_STORE).get(markerKey));
      await checkDone;
      if (migrated) continue;

      const raw = localStorage.getItem(key);
      if (!raw) {
        const marker = db.transaction(META_STORE, 'readwrite');
        const markerDone = transactionDone(marker);
        marker.objectStore(META_STORE).put(true, markerKey);
        await markerDone;
        continue;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error(`L’ancienne file hors-ligne (${key}) est invalide et a été conservée.`);
      const migratedOperations = await Promise.all(parsed.map(async (entry: Record<string, any>, index: number) => {
        const payload = legacySalePayload(entry);
        const valid = payload.items && Array.isArray(payload.items) && payload.items.length > 0;
        const alreadySynced = entry.synced === true || entry.status === 'SYNCED';
        const paymentMissing = payload.immediatePayment === true && (payload.payments as unknown[]).length === 0;
        const needsReview = !valid
          || entry.status === 'ERROR'
          || Boolean(entry.syncError || entry.errorMessage)
          || paymentMissing;
        const message = entry.syncError
          || entry.errorMessage
          || (!valid ? 'Ancienne vente incomplète : vérifiez ses articles avant de la synchroniser.' : undefined)
          || (paymentMissing ? 'Ancienne vente sans règlement enregistré : vérifiez son paiement avant de la synchroniser.' : undefined)
          || (needsReview ? 'Ancienne vente en erreur : vérifiez les données avant de la synchroniser.' : undefined);
        const operation: OfflineOperation = {
          id: await createLegacyUuid(key, index, entry),
          type: 'sale.create',
          payload,
          createdAt: entry.createdAt ?? new Date().toISOString(),
          status: alreadySynced ? 'synced' : needsReview ? 'needs_review' : 'queued',
          attempts: 0,
          nextAttemptAt: 0,
          lastError: alreadySynced ? undefined : message,
        };
        const encrypted = await this.encrypt(payload);
        const conflict: OfflineConflict | undefined = needsReview && !alreadySynced
          ? {
            id: createUuid(),
            operationId: operation.id,
            operationType: operation.type,
            occurredAt: new Date().toISOString(),
            message: message ?? 'Ancienne vente à vérifier avant synchronisation.',
            status: 'open',
          }
          : undefined;
        return { operation: { ...operation, payload: encrypted, legacyId: entry.id ?? entry.offlineId }, conflict };
      }));

      const existingOperations = new Map((await this.getStoredOperations()).map((operation) => [operation.id, operation]));
      const transaction = db.transaction([OPERATIONS_STORE, CONFLICTS_STORE, META_STORE], 'readwrite');
      const done = transactionDone(transaction);
      const operationStore = transaction.objectStore(OPERATIONS_STORE);
      for (const { operation, conflict } of migratedOperations) {
        const existing = existingOperations.get(operation.id);
        if (existing) {
          if (operation.status === 'synced' && existing.status !== 'synced') {
            operationStore.put({ ...existing, status: 'synced', lastError: undefined });
          }
          continue;
        }
        operationStore.put(operation);
        if (conflict) transaction.objectStore(CONFLICTS_STORE).put(conflict);
      }
      transaction.objectStore(META_STORE).put(true, markerKey);
      await done;
      localStorage.removeItem(key);
    }
  }

  private async recordConflict(operation: OfflineOperation, message: string): Promise<void> {
    const conflict: OfflineConflict = {
      id: createUuid(),
      operationId: operation.id,
      operationType: operation.type,
      occurredAt: new Date().toISOString(),
      message,
      status: 'open',
    };
    const db = await this.openDatabase();
    const transaction = db.transaction(CONFLICTS_STORE, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(CONFLICTS_STORE).put(conflict);
    await done;
  }

  private async resolveConflicts(operationId: string): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(CONFLICTS_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(CONFLICTS_STORE);
    const conflicts = await requestResult<OfflineConflict[]>(store.getAll());
    for (const conflict of conflicts.filter((item) => item.operationId === operationId && item.status === 'open')) {
      store.put({ ...conflict, status: 'resolved' });
    }
    await done;
  }

  private startRetryTimer(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    void this.scheduleRetry();
  }

  private readonly handleOnline = () => {
    this.emit();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    void this.syncPendingSales();
  };

  private readonly handleOffline = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.emit();
  };

  private async scheduleRetry(): Promise<void> {
    if (typeof window === 'undefined' || !this.isOnline()) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const queued = (await this.getStoredOperations())
      .filter((operation) => operation.status === 'queued');
    if (queued.length === 0) return;
    const nextAttemptAt = Math.min(...queued.map((operation) => operation.nextAttemptAt));
    const delay = Math.max(0, nextAttemptAt - Date.now());
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.syncPendingSales();
    }, delay);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const offlineSync = new OfflineSyncService();
