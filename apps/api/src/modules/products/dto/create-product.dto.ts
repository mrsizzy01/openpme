import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ description: 'Nom commercial du produit ou service', example: 'Ciment Nyumba 50kg' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du produit est requis' })
  name: string;

  @ApiPropertyOptional({ description: 'Code de référence interne', example: 'PRD-CIM01' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Code-barres EAN/UPC', example: '6151234567890' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Description détaillée' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID de la catégorie parente' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Prix d’achat fournisseur', default: 0 })
  @IsNumber()
  @Min(0, { message: 'Le prix d’achat ne peut pas être négatif' })
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'Prix de vente standard', default: 0 })
  @IsNumber()
  @Min(0, { message: 'Le prix de vente ne peut pas être négatif' })
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CDF })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Seuil minimum d’alerte de stock', default: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockLevel?: number;

  @ApiPropertyOptional({ description: 'Stock initial disponible', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialStock?: number;

  @ApiPropertyOptional({ description: 'Unité de mesure (Pièce, Carton, Kg, Litre)', default: 'Pièce' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: 'S’agit-il d’une prestation de service sans gestion de stock ?', default: false })
  @IsBoolean()
  @IsOptional()
  isService?: boolean;
}

export class UpdateProductDto extends CreateProductDto {}
