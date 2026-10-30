import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProductsService } from '../src/modules/products/products.service';

describe('offline stock movement synchronization', () => {
  it('merges signed deltas and returns an existing movement for a replay', async () => {
    let currentStock = 10;
    const movements = new Map<string, Record<string, unknown>>();
    const stockMovement = {
      findFirst: async ({ where }: { where: { idempotencyKey: string } }) =>
        movements.get(where.idempotencyKey) ?? null,
      create: async ({ data }: { data: Record<string, any> }) => {
        const movement = { id: `movement-${movements.size + 1}`, ...data };
        movements.set(data.idempotencyKey, movement);
        return movement;
      },
    };
    const transaction = {
      stockMovement,
      $queryRaw: async () => [{ currentStock }],
      warehouse: { findFirst: async () => ({ id: 'warehouse-1' }) },
      product: {
        update: async ({ data }: { data: { currentStock: number } }) => {
          currentStock = data.currentStock;
        },
      },
      warehouseStock: { upsert: async () => undefined },
    };
    const prisma = {
      $transaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction),
      stockMovement,
    };
    const service = new ProductsService(prisma as any);

    await service.createStockMovement('org-1', 'user-1', 'product-1', {
      quantity: 4,
      reason: 'Entrée hors-ligne poste A',
      idempotencyKey: 'key-0001',
    });
    await service.createStockMovement('org-1', 'user-2', 'product-1', {
      quantity: -3,
      reason: 'Sortie hors-ligne poste B',
      idempotencyKey: 'key-0002',
    });
    const replay = await service.createStockMovement('org-1', 'user-1', 'product-1', {
      quantity: 4,
      reason: 'Entrée hors-ligne poste A',
      idempotencyKey: 'key-0001',
    });

    assert.equal(currentStock, 11);
    assert.equal(movements.size, 2);
    assert.equal(replay.id, 'movement-1');
  });
});
