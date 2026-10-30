import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, NotEquals } from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'Quantité signée: positive pour une entrée, négative pour une sortie.' })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0)
  quantity: number;

  @ApiProperty({ minLength: 3, maxLength: 240 })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ format: 'uuid', description: 'Identifiant stable de cette opération hors ligne.' })
  @IsUUID('4')
  idempotencyKey: string;
}
