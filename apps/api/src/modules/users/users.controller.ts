import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users & RBAC')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les collaborateurs et leurs rôles RBAC' })
  async findAll(@CurrentUser('organizationId') orgId: string) {
    return this.usersService.findAll(orgId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Consulter le profil et rôle d\'un utilisateur' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.usersService.findById(orgId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Créer un nouvel utilisateur avec attribution de rôle' })
  async create(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      phone?: string;
    },
  ) {
    return this.usersService.create(orgId, body);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Modifier les informations, réinitialiser le mot de passe ou changer le rôle' })
  async update(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      role?: UserRole;
      phone?: string;
      isActive?: boolean;
    },
  ) {
    return this.usersService.update(orgId, currentUserId, id, body);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Générer un nouveau mot de passe, retourné une seule fois' })
  async resetPassword(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.resetPassword(orgId, currentUserId, id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Désactiver un compte collaborateur' })
  async remove(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.delete(orgId, currentUserId, id);
  }
}
