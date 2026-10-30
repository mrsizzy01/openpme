import { Transform } from 'class-transformer';
import { IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PaymentMethod } from '@prisma/client';

const decimalString = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value);

export class CreateExpenseDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Clé stable de rejeu pour une dépense hors ligne.' })
  @IsOptional()
  @IsUUID('4')
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: '12500.00' })
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiary: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CDF })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Obligatoire pour une dépense payée en espèces.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cashSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  financialAccountId?: string;
}
