import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword } from '../../common/security/password';

const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.MANAGER,
  UserRole.ACCOUNTANT,
  UserRole.CASHIER,
  UserRole.SALES_REP,
  UserRole.INVENTORY_MANAGER,
  UserRole.PURCHASER,
  UserRole.AUDITOR,
];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private generatePassword(): string {
    return randomBytes(18).toString('base64url');
  }

  private assertAssignableRole(role: UserRole) {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new BadRequestException('Le rôle propriétaire et le rôle super-admin ne peuvent pas être attribués à un collaborateur.');
    }
  }

  private assertManageableUser(user: { id: string; role: UserRole }, currentUserId: string) {
    if (user.id === currentUserId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier votre propre compte depuis la gestion de l’équipe.');
    }
    if (user.role === UserRole.ORG_OWNER || user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Le compte propriétaire et les comptes système sont protégés.');
    }
  }

  async findAll(organizationId: string) {
    const now = new Date();
    const onlineThreshold = new Date(now.getTime() - 2 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          where: { revoked: false, expiresAt: { gt: now } },
          select: { lastSeenAt: true },
          orderBy: { lastSeenAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ sessions, ...user }) => ({
      ...user,
      isOnline: user.isActive && sessions.some((session) => session.lastSeenAt >= onlineThreshold),
      activeSessionsCount: user.isActive ? sessions.length : 0,
      lastSeenAt: sessions[0]?.lastSeenAt ?? null,
    }));
  }

  async findById(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable dans cette entreprise.');
    }

    return user;
  }

  async create(organizationId: string, data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
  }) {
    const role = data.role || UserRole.CASHIER;
    this.assertAssignableRole(role);

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Cette adresse email est déjà utilisée par un autre collaborateur.');
    }

    const defaultPassword = data.password || this.generatePassword();
    const passwordHash = await hashPassword(defaultPassword);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role,
        phone: data.phone?.trim() || null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { ...user, temporaryPassword: defaultPassword };
  }

  async update(organizationId: string, currentUserId: string, id: string, data: {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    phone?: string;
    isActive?: boolean;
  }) {
    const user = await this.findById(organizationId, id);
    this.assertManageableUser(user, currentUserId);

    if (data.role !== undefined) this.assertAssignableRole(data.role);

    const updateData: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (data.isActive === false) {
      await this.prisma.session.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      });
    }

    return updatedUser;
  }

  async resetPassword(organizationId: string, currentUserId: string, id: string) {
    const user = await this.findById(organizationId, id);
    this.assertManageableUser(user, currentUserId);

    const temporaryPassword = this.generatePassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id },
        data: { passwordHash },
      });
      await transaction.session.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      });
    });

    return { id: user.id, email: user.email, temporaryPassword };
  }

  async delete(organizationId: string, currentUserId: string, id: string) {
    const user = await this.findById(organizationId, id);
    this.assertManageableUser(user, currentUserId);

    // Soft delete en basculant isActive = false pour préserver l'historique des ventes
    const deactivatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    await this.prisma.session.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    });

    return deactivatedUser;
  }
}
