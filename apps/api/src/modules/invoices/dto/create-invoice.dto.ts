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
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, InvoiceType } from '@prisma/client';

export class InvoiceItemDto {
  @ApiPropertyOptional({ description: 'ID du produit référencé' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Désignation de la ligne de facturation' })
  @IsString()
  @IsNotEmpty({ message: 'La désignation de l’article est requise' })
  description: string;

  @ApiProperty({ description: 'Quantité facturée', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Prix unitaire hors taxe' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Pourcentage de remise accordé (0 à 100)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Taux de TVA applicable (%)', default: 16.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRatePercent?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'ID du client destinataire' })
  @IsString()
  @IsNotEmpty({ message: 'Le client est obligatoire pour émettre une facture' })
  customerId: string;

  @ApiPropertyOptional({ enum: InvoiceType, default: InvoiceType.STANDARD })
  @IsEnum(InvoiceType)
  @IsOptional()
  type?: InvoiceType;

  @ApiPropertyOptional({ description: 'Date d’échéance du règlement' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CDF })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ type: [InvoiceItemDto], description: 'Lignes de facturation' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiPropertyOptional({ description: 'Conditions de règlement ou mentions particulières' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ description: 'Remarques ou instructions' })
  @IsString()
  @IsOptional()
  notes?: string;
}
