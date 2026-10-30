import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { RemoteControlService } from './remote-control.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class EnrollDesktopDto {
  @ApiProperty({ example: 'DESKTOP-CAISSE-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  terminalId: string;

  @ApiProperty({ description: 'Identifiant de l’entreprise configurée sur le poste' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: 'Caisse principale' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName: string;
}

class HeartbeatDto {
  @ApiProperty({ required: false, description: 'Version de statut appliquée localement' })
  @IsOptional()
  @IsInt()
  @Min(0)
  acknowledgedVersion?: number;
}

class TerminalActionDto {
  @ApiProperty({ example: 'Vérification administrative' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

@ApiTags('Remote Control & Supervision')
@Controller('remote-control')
export class RemoteControlController {
  constructor(private remoteControlService: RemoteControlService) {}

  @Post('enroll')
  @ApiOperation({ summary: 'Enrôler un poste desktop avec un jeton distinct et révocable' })
  async enroll(
    @Body() body: EnrollDesktopDto,
    @Headers('x-desktop-enrollment-key') enrollmentKey: string,
  ) {
    return this.remoteControlService.enrollTerminal(enrollmentKey, body);
  }

  @Post('heartbeat')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Heartbeat authentifié et accusé de réception de l’état du poste' })
  async heartbeat(
    @Headers('authorization') authorization: string,
    @Body() body: HeartbeatDto,
    @Ip() ipAddress: string,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    return this.remoteControlService.heartbeat(token, body, ipAddress || 'unknown');
  }

  @Get('terminals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les postes enregistrés de l’entreprise courante' })
  async listTerminals(@CurrentUser('organizationId') organizationId: string) {
    return this.remoteControlService.listTerminals(organizationId);
  }

  @Post('terminals/:id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verrouiller un poste et inscrire l’action dans le journal d’audit' })
  async lockTerminal(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') terminalId: string,
    @Body() body: TerminalActionDto,
    @Ip() ipAddress: string,
  ) {
    return this.remoteControlService.lockTerminal(
      organizationId,
      terminalId,
      actorId,
      body.reason,
      ipAddress || 'unknown',
    );
  }

  @Post('terminals/:id/unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déverrouiller un poste et inscrire l’action dans le journal d’audit' })
  async unlockTerminal(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') terminalId: string,
    @Body() body: TerminalActionDto,
    @Ip() ipAddress: string,
  ) {
    return this.remoteControlService.unlockTerminal(
      organizationId,
      terminalId,
      actorId,
      body.reason,
      ipAddress || 'unknown',
    );
  }

  @Post('terminals/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Révoquer le jeton du poste et bloquer ses sessions desktop' })
  async revokeTerminal(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') terminalId: string,
    @Body() body: TerminalActionDto,
    @Ip() ipAddress: string,
  ) {
    return this.remoteControlService.revokeTerminal(
      organizationId,
      terminalId,
      actorId,
      body.reason,
      ipAddress || 'unknown',
    );
  }

  @Post('terminals/:id/kill')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre le poste en verrouillage d’urgence sans arrêter le client' })
  async killTerminal(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') terminalId: string,
    @Body() body: TerminalActionDto,
    @Ip() ipAddress: string,
  ) {
    return this.remoteControlService.lockTerminal(
      organizationId,
      terminalId,
      actorId,
      body.reason,
      ipAddress || 'unknown',
    );
  }
}
