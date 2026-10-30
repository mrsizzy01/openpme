import { Transform } from 'class-transformer';
import { IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PaymentMethod } from '@prisma/client';

const decimalString = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value);

export class CreatePaymentDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Clé stable de rejeu pour un encaissement hors ligne.' })
  @IsOptional()
  @IsUUID('4')
  idempotencyKey?: string;

  @ApiProperty({ example: '12500.00' })
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Obligatoire pour un paiement en espèces.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cashSessionId?: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
