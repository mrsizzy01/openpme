import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/api/client';
import { OfflineSyncService } from '../src/services/offlineSync';

let nextDatabaseId = 0;

function createApi() {
  return {
    createSale: vi.fn(async () => ({})),
    createStockMovement: vi.fn(async () => ({})),
    createPayment: vi.fn(async () => ({})),
    createExpense: vi.fn(async () => ({})),
    updateProduct: vi.fn(async () => ({})),
  };
}

function createService(api = createApi(), isOnline = () => false) {
  nextDatabaseId += 1;
  return new OfflineSyncService({
    databaseName: `offline-sync-test-${nextDatabaseId}`,
    api,
    isOnline,
  });
}

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  });
});

describe('IndexedDB offline queue', () => {
  it('keeps a sale after a lost response and retries with the same idempotency key', async () => {
    let online = false;
    let committedSales = 0;
    let firstRequest = true;
    const api = createApi();
    const serverKeys = new Set<string>();
    api.createSale.mockImplementation(async (payload: any) => {
      if (!serverKeys.has(payload.idempotencyKey)) {
        serverKeys.add(payload.idempotencyKey);
        committedSales += 1;
      }
      if (firstRequest) {
        firstRequest = false;
        throw new Error('Serveur API inaccessible.');
      }
      return {};
    });
    const service = createService(api, () => online);
    const operationKey = crypto.randomUUID();
    const operation = await service.enqueueSale({
      idempotencyKey: operationKey,
      currency: 'USD',
      immediatePayment: false,
      items: [{ productId: 'product-1', quantity: 1, unitPrice: '3.50' }],
    });

    online = true;
    const interrupted = await service.syncPendingSales();
    expect(interrupted.failed).toBe(1);
    expect(await service.getPendingCount()).toBe(1);
    expect(committedSales).toBe(1);
    expect((await service.getQueue()).find((item) => item.id === operation.id)?.attempts).toBe(1);
    expect(operation.id).toBe(operationKey);

    await new Promise((resolve) => setTimeout(resolve, 1_050));
    const resumed = await service.syncPendingSales();

    expect(resumed.synced).toBe(1);
    expect(committedSales).toBe(1);
    expect(api.createSale.mock.calls.map(([payload]) => (payload as any).idempotencyKey))
      .toEqual([operation.id, operation.id]);
    expect((await service.getQueue()).find((item) => item.id === operation.id)?.status).toBe('synced');
  });

  it('merges two offline stock deltas from separate device queues', async () => {
    let online = false;
    let stock = 10;
    const movementKeys = new Set<string>();
    const api = createApi();
    api.createStockMovement.mockImplementation(async (_productId: string, movement: any) => {
      if (!movementKeys.has(movement.idempotencyKey)) {
        movementKeys.add(movement.idempotencyKey);
        stock += movement.quantity;
      }
      return {};
    });
    const firstDevice = createService(api, () => online);
    const secondDevice = createService(api, () => online);
    await firstDevice.enqueueStockMovement('product-1', { quantity: 4, reason: 'Réception' });
    await secondDevice.enqueueStockMovement('product-1', { quantity: -3, reason: 'Vente terrain' });

    online = true;
    await Promise.all([firstDevice.syncPendingSales(), secondDevice.syncPendingSales()]);

    expect(stock).toBe(11);
    expect(movementKeys.size).toBe(2);
  });

  it('does not send an operation again once it has been synchronized', async () => {
    let online = false;
    const api = createApi();
    const service = createService(api, () => online);
    await service.enqueueExpense({ amount: '12.50', beneficiary: 'Transport', method: 'CASH' });

    online = true;
    expect((await service.syncPendingSales()).synced).toBe(1);
    expect((await service.syncPendingSales()).synced).toBe(0);
    expect(api.createExpense).toHaveBeenCalledTimes(1);
  });

  it('migrates both legacy sales queues before removing their localStorage entries', async () => {
    const savedQueues = new Map([
      ['smart_pme_offline_sales_queue', JSON.stringify([{
        id: 'legacy-one',
        createdAt: '2026-10-29T10:00:00.000Z',
        synced: true,
        immediatePayment: false,
        items: [{ productId: 'product-1', quantity: 1, unitPrice: 3.5 }],
      }])],
      ['SMART_PME_OFFLINE_SALES_QUEUE', JSON.stringify([{
        offlineId: 'legacy-two',
        createdAt: '2026-10-29T11:00:00.000Z',
        status: 'PENDING_SYNC',
        immediatePayment: false,
        items: [{ productId: 'product-2', quantity: 2, unitPrice: 4 }],
      }])],
    ]);
    const removedKeys: string[] = [];
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => savedQueues.get(key) ?? null,
      removeItem: (key: string) => {
        removedKeys.push(key);
        savedQueues.delete(key);
      },
      setItem: vi.fn(),
    });
    const service = createService();

    await service.initialize();

    const migrated = await service.getQueue();
    expect(migrated).toHaveLength(2);
    expect(migrated.map((operation) => operation.status).sort()).toEqual(['queued', 'synced']);
    expect(removedKeys.sort()).toEqual([
      'SMART_PME_OFFLINE_SALES_QUEUE',
      'smart_pme_offline_sales_queue',
    ]);
    expect(savedQueues.size).toBe(0);
  });

  it('encrypts operation payloads in IndexedDB', async () => {
    const service = createService();
    await service.enqueueExpense({ amount: '25.00', beneficiary: 'Nom confidentiel', method: 'CASH' });
    const databaseName = `offline-sync-test-${nextDatabaseId}`;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stored = await new Promise<any>((resolve, reject) => {
      const request = db.transaction('operations', 'readonly').objectStore('operations').getAll();
      request.onsuccess = () => resolve(request.result[0]);
      request.onerror = () => reject(request.error);
    });
    db.close();

    expect(stored.payload.ciphertext).toBeInstanceOf(ArrayBuffer);
    expect(JSON.stringify(stored.payload)).not.toContain('Nom confidentiel');
    expect((await service.getQueue())[0].payload).toMatchObject({ beneficiary: 'Nom confidentiel' });
  });

  it('keeps a permanent rejection in the conflict journal until explicitly archived', async () => {
    let online = false;
    const api = createApi();
    api.createPayment.mockRejectedValue(new ApiClientError('Session de caisse clôturée.', 400));
    const service = createService(api, () => online);
    const operation = await service.enqueuePayment({ amount: '5.00', currency: 'CDF', method: 'CASH' });

    online = true;
    await service.syncPendingSales();

    expect((await service.getSnapshot()).reviewCount).toBe(1);
    expect((await service.getConflictLog())[0].message).toContain('clôturée');
    await service.archiveOperation(operation.id);
    expect((await service.getSnapshot()).reviewCount).toBe(0);
    expect((await service.getConflictLog())[0].status).toBe('archived');
  });

  it('stores, reads and synchronizes a queue of 500 operations', async () => {
    let online = false;
    const api = createApi();
    const service = createService(api, () => online);
    await Promise.all(Array.from({ length: 500 }, (_, index) => service.enqueuePayment({
        amount: String(index + 1),
        currency: 'CDF',
        method: 'CASH',
        cashSessionId: 'session-1',
      })));

    expect(await service.getPendingCount()).toBe(500);
    expect((await service.getQueue()).length).toBe(500);
    online = true;
    const result = await service.syncPendingSales();
    expect(result.synced).toBe(500);
    expect(api.createPayment).toHaveBeenCalledTimes(500);
  });
});
