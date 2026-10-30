import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'nom@entreprise.cd', description: 'Adresse email de connexion' })
  @IsEmail({}, { message: 'Format d’email invalide' })
  @IsNotEmpty({ message: 'L’email est requis' })
  email: string;

  @ApiProperty({ description: 'Mot de passe du compte' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}

export class RegisterOrganizationDto {
  @ApiProperty({ example: 'Nouvelle Entreprise SARL' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de l’entreprise est requis' })
  organizationName: string;

  @ApiProperty({ example: 'admin@nouvelle.cd' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Mot de passe choisi pour le nouveau compte administrateur' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Patrick' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Kabuya' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+243 81 234 5678', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
