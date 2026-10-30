import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Currency, Prisma, StockMovementType } from '@prisma/client';
import { decimalAmount } from '../../common/money/decimal-money';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { CreateStockMovementDto } from './stock-movement.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, search?: string, categoryId?: string) {
    const where: any = { organizationId, isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        warehouseStocks: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        warehouseStocks: { include: { warehouse: true } },
      },
    });

    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async create(organizationId: string, data: CreateProductDto) {
    const purchasePrice = decimalAmount(data.purchasePrice ?? '0', 'prix d’achat');
    const salePrice = decimalAmount(data.salePrice, 'prix de vente');
    if (purchasePrice.lt(0)) throw new BadRequestException('Le prix d’achat ne peut pas être négatif.');
    if (salePrice.lte(0)) throw new BadRequestException('Le prix de vente doit être supérieur à zéro.');
    if (data.categoryId) await this.ensureCategoryBelongsToOrganization(organizationId, data.categoryId);

    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { organizationId, isDefault: true },
    });

    const product = await this.prisma.product.create({
      data: {
        organizationId,
        code: data.code || `PRD-${Date.now().toString().slice(-6)}`,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        purchasePrice,
        salePrice,
        currency: data.currency || Currency.CDF,
        minStockLevel: data.minStockLevel ?? 5,
        currentStock: data.initialStock ?? 0,
        unit: data.unit || 'Pièce',
        isService: Boolean(data.isService),
      },
      include: { category: true },
    });

    if (defaultWarehouse && !product.isService) {
      await this.prisma.warehouseStock.create({
        data: {
          warehouseId: defaultWarehouse.id,
          productId: product.id,
          quantity: product.currentStock,
        },
      });
    }

    return product;
  }

  async update(organizationId: string, id: string, data: UpdateProductDto) {
    await this.findById(organizationId, id);
    if (data.categoryId) await this.ensureCategoryBelongsToOrganization(organizationId, data.categoryId);

    const updateData: Prisma.ProductUncheckedUpdateInput = {
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      currency: data.currency,
      minStockLevel: data.minStockLevel,
      unit: data.unit,
      isActive: data.isActive,
    };
    if (data.purchasePrice !== undefined) {
      const purchasePrice = decimalAmount(data.purchasePrice, 'prix d’achat');
      if (purchasePrice.lt(0)) throw new BadRequestException('Le prix d’achat ne peut pas être négatif.');
      updateData.purchasePrice = purchasePrice;
    }
    if (data.salePrice !== undefined) {
      const salePrice = decimalAmount(data.salePrice, 'prix de vente');
      if (salePrice.lte(0)) throw new BadRequestException('Le prix de vente doit être supérieur à zéro.');
      updateData.salePrice = salePrice;
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async createStockMovement(
    organizationId: string,
    userId: string,
    productId: string,
    data: CreateStockMovementDto,
  ) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.stockMovement.findFirst({
        where: { organizationId, idempotencyKey: data.idempotencyKey },
      });
      if (existing) return existing;

      const locked = await transaction.$queryRaw<Array<{ currentStock: number; isService: boolean }>>(Prisma.sql`
        SELECT "currentStock", "isService"
        FROM "products"
        WHERE "id" = ${productId} AND "organizationId" = ${organizationId}
        FOR UPDATE
      `);
      const product = locked[0];
      if (!product) throw new NotFoundException('Produit introuvable dans cette entreprise.');
      if (product.isService) throw new BadRequestException('Les prestations de service ne gèrent pas de stock.');

      const newStock = product.currentStock + data.quantity;
      if (newStock < 0) {
        throw new BadRequestException(
          `Stock insuffisant : il reste ${product.currentStock} article(s), la sortie demandée dépasse le disponible.`,
        );
      }

      const warehouse = await transaction.warehouse.findFirst({
        where: { organizationId, isDefault: true },
        select: { id: true },
      });
      if (!warehouse) throw new BadRequestException('Aucun dépôt de stockage par défaut configuré.');

      await transaction.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });
      await transaction.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId,
          },
        },
        create: {
          warehouseId: warehouse.id,
          productId,
          quantity: newStock,
        },
        update: { quantity: newStock },
      });

      return transaction.stockMovement.create({
        data: {
          organizationId,
          idempotencyKey: data.idempotencyKey,
          warehouseId: warehouse.id,
          productId,
          userId,
          type: data.quantity > 0 ? StockMovementType.IN_ADJUSTMENT : StockMovementType.OUT_ADJUSTMENT,
          quantity: Math.abs(data.quantity),
          previousStock: product.currentStock,
          newStock,
          reference: `OFFLINE-${data.idempotencyKey}`,
          reason: data.reason,
        },
      });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.stockMovement.findFirst({
          where: { organizationId, idempotencyKey: data.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async delete(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    const saleItemsCount = await this.prisma.saleItem.count({ where: { productId: id } });
    if (saleItemsCount > 0) {
      return this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }
    await this.prisma.warehouseStock.deleteMany({ where: { productId: id } });
    return this.prisma.product.delete({ where: { id } });
  }

  async getLowStock(organizationId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        isService: false,
        isActive: true,
      },
      include: { category: true },
    });

    return products.filter((p) => p.currentStock <= p.minStockLevel);
  }

  async listCategories(organizationId: string) {
    return this.prisma.category.findMany({
      where: { organizationId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(organizationId: string, name: string, description?: string) {
    return this.prisma.category.create({
      data: {
        organizationId,
        name,
        description,
      },
    });
  }

  private async ensureCategoryBelongsToOrganization(organizationId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, organizationId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable dans cette entreprise.');
  }
}
