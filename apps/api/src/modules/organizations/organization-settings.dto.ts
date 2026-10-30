import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

const decimalString = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value);

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({ enum: Currency, example: Currency.CDF })
  @IsOptional()
  @IsEnum(Currency)
  primaryCurrency?: Currency;

  @ApiPropertyOptional({ enum: Currency, example: Currency.USD })
  @IsOptional()
  @IsEnum(Currency)
  secondaryCurrency?: Currency;

  @ApiPropertyOptional({ example: '2850.0000', description: 'Taux journalier pour 1 USD en CDF' })
  @IsOptional()
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,4' })
  exchangeRateUsdToCdf?: string;

  @ApiPropertyOptional({ example: '16.00' })
  @IsOptional()
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  taxRatePercent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableTax?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quotePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptPrefix?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  invoiceNextNumber?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quoteNextNumber?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  paymentTermsDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceFooterNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankDetails?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileMoneyDetails?: string | null;

  @ApiPropertyOptional({ example: '15.00' })
  @IsOptional()
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  alertMaxDiscountPercent?: string;

  @ApiPropertyOptional({ example: '1000000.00' })
  @IsOptional()
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  alertLargeExpenseThreshold?: string;

  @ApiPropertyOptional({ example: '10000.00' })
  @IsOptional()
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  alertCashDiscrepancyThreshold?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  themeMode?: string;
}
