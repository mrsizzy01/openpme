import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PaymentMethod } from '@prisma/client';

const decimalString = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value);

export class CreateSaleItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  taxRatePercent?: number;

  @ApiPropertyOptional({ description: 'Conservé pour la compatibilité des ventes hors ligne.' })
  @IsOptional()
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,4' })
  unitPrice?: string;
}

export class CreateSalePaymentDto {
  @ApiProperty({ example: '10000', description: 'Montant réellement remis dans cette devise.' })
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cashSessionId?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Clé stable de rejeu pour les ventes synchronisées hors ligne.' })
  @IsOptional()
  @IsUUID('4')
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CDF })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Compatibilité avec les anciens clients en espèces.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cashSessionId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  immediatePayment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiPropertyOptional({ type: [CreateSalePaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments?: CreateSalePaymentDto[];

  @ApiPropertyOptional({ description: 'ID de la session CDF servant à rendre la monnaie.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  changeCashSessionId?: string;
}
