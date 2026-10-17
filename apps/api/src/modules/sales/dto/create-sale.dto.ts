import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PaymentMethod } from '@prisma/client';

export class SaleItemDto {
  @ApiProperty({ description: 'ID du produit vendu' })
  @IsString()
  @IsNotEmpty({ message: 'L’ID du produit est requis' })
  productId: string;

  @ApiProperty({ description: 'Quantité vendue', minimum: 1 })
  @IsNumber()
  @Min(1, { message: 'La quantité doit être supérieure à 0' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Prix unitaire appliqué' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Pourcentage de remise accordé (0 à 100)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Pourcentage de taxe TVA', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRatePercent?: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'ID du client (optionnel pour client comptoir)' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ type: [SaleItemDto], description: 'Articles de la vente' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiPropertyOptional({ description: 'Montant forfaitaire de remise globale' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CDF })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Générer automatiquement une facture liée', default: true })
  @IsBoolean()
  @IsOptional()
  autoInvoice?: boolean;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Montant réglé immédiatement à la caisse' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  paidAmount?: number;

  @ApiPropertyOptional({ description: 'Notes internes sur la vente' })
  @IsString()
  @IsOptional()
  notes?: string;
}
