import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products & Inventory')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les produits et services avec filtrage et recherche' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.findAll(orgId, search, categoryId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Lister les articles sous le seuil d’alerte de stock' })
  async getLowStock(@CurrentUser('organizationId') orgId: string) {
    return this.productsService.getLowStock(orgId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lister les catégories de produits' })
  async listCategories(@CurrentUser('organizationId') orgId: string) {
    return this.productsService.listCategories(orgId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Créer une nouvelle catégorie' })
  async createCategory(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.productsService.createCategory(orgId, body.name, body.description);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir les détails d’un produit par ID' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.productsService.findById(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau produit ou service' })
  async create(@CurrentUser('organizationId') orgId: string, @Body() body: CreateProductDto) {
    return this.productsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un produit ou service' })
  async update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
  ) {
    return this.productsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un produit ou service' })
  async remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.delete(orgId, id);
  }
}
