import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UserRole } from '@prisma/client';
import { ProductsController } from '../src/modules/products/products.controller';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';

describe('product permissions', () => {
  it('allows cashiers to read products needed by the sales screen', () => {
    for (const handler of [
      ProductsController.prototype.findAll,
      ProductsController.prototype.listCategories,
      ProductsController.prototype.findById,
    ]) {
      const roles = Reflect.getMetadata(ROLES_KEY, handler) as UserRole[];
      assert.ok(roles.includes(UserRole.CASHIER));
    }
  });

  it('does not allow cashiers to change product catalog data', () => {
    for (const handler of [
      ProductsController.prototype.create,
      ProductsController.prototype.update,
      ProductsController.prototype.remove,
      ProductsController.prototype.createCategory,
    ]) {
      const roles = Reflect.getMetadata(ROLES_KEY, handler) as UserRole[];
      assert.ok(!roles.includes(UserRole.CASHIER));
    }
  });
});
