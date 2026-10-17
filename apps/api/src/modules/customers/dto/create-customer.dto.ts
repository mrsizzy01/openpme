import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Nom complet du client ou contact principal', example: 'M. Jean Kalala' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du client est requis' })
  name: string;

  @ApiPropertyOptional({ description: 'Raison sociale de l’entreprise cliente', example: 'Congo Tech SARL' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone joignable', example: '+243810000001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Adresse email professionnelle', example: 'contact@congotech.cd' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Adresse physique / Commune / Ville', example: '12 Av. de la Paix, Gombe, Kinshasa' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Plafond de crédit autorisé', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CDF })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;
}

export class UpdateCustomerDto extends CreateCustomerDto {}
