import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BankDossierQueryDto } from './bank-dossier.dto';
import { BankDossierService } from './bank-dossier.service';

@ApiTags('Rapports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.AUDITOR)
export class BankDossierController {
  constructor(private readonly bankDossierService: BankDossierService) {}

  @Get('bank-dossier')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="dossier-banque-smart-pme.pdf"')
  @ApiOperation({ summary: 'Générer le dossier bancaire financier de l’entreprise' })
  @ApiQuery({ name: 'months', required: false, enum: [6, 12], example: 12 })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Document PDF à télécharger.', schema: { type: 'string', format: 'binary' } })
  @ApiBadRequestResponse({ description: 'La période doit être de 6 ou 12 mois.' })
  generate(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: BankDossierQueryDto,
  ): Promise<Buffer> {
    return this.bankDossierService.generatePdf(organizationId, query.months ?? 12);
  }
}
