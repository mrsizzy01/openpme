import { Transform } from 'class-transformer';
import { IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

const decimalString = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value);

export class OpenCashSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cashRegisterId: string;

  @ApiProperty({ example: '50000', default: '0' })
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  openingBalance: string;

  @ApiProperty({ enum: Currency, default: Currency.CDF })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseCashSessionDto {
  @ApiProperty({ example: '75000' })
  @Transform(decimalString)
  @IsDecimal({ decimal_digits: '0,2' })
  closingCountedBalance: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
