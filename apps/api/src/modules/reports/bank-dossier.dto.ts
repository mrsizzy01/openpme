import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class BankDossierQueryDto {
  @ApiPropertyOptional({ enum: [6, 12], default: 12, description: 'Nombre de mois à inclure.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([6, 12])
  months?: number;
}
