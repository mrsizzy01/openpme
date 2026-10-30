import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterOrganizationDto } from './auth.dto';
import { UserRole, Currency } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { hashPassword, hashSessionToken, verifyPassword } from '../../common/security/password';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
  terminalId?: string;
  terminalToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private createAccessToken(user: { id: string; email: string; role: UserRole; organizationId: string }, sessionId: string) {
    return this.jwtService.signAsync({
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    }, { expiresIn: ACCESS_TOKEN_TTL });
  }

  private buildAuthResponse(user: any, accessToken: string, refreshToken: string) {
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        legalName: user.organization.legalName,
        taxId: user.organization.taxId,
        rccm: user.organization.rccm,
        idNat: user.organization.idNat,
        email: user.organization.email,
        phone: user.organization.phone,
        address: user.organization.address,
        city: user.organization.city,
        country: user.organization.country,
        logoUrl: user.organization.logoUrl,
        sector: user.organization.sector,
        settings: user.organization.settings,
        createdAt: user.organization.createdAt.toISOString(),
      },
    };
  }

  private async createSession(user: any, context: SessionContext) {
    const sessionId = randomUUID();
    const refreshToken = randomBytes(48).toString('base64url');
    const accessToken = await this.createAccessToken(user, sessionId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        terminalId: context.terminalId,
        token: hashSessionToken(accessToken),
        refreshToken: hashSessionToken(refreshToken),
        userAgent: context.userAgent?.slice(0, 512),
        ipAddress: context.ipAddress?.slice(0, 64),
        expiresAt,
        lastSeenAt: now,
      },
    });

    return this.buildAuthResponse(user, accessToken, refreshToken);
  }

  async login(dto: LoginDto, context: SessionContext = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        organization: {
          include: { settings: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants de connexion invalides.');
    }

    const passwordVerification = await verifyPassword(dto.password, user.passwordHash);
    if (!passwordVerification.valid) {
      throw new UnauthorizedException('Identifiants de connexion invalides.');
    }

    if (!user.isActive || !user.organization.isActive) {
      throw new UnauthorizedException('Compte ou entreprise désactivé(e).');
    }

    if (context.terminalId) {
      const terminal = await this.prisma.desktopTerminal.findFirst({
        where: {
          terminalId: context.terminalId,
          organizationId: user.organizationId,
          tokenHash: hashSessionToken(context.terminalToken ?? ''),
          tokenRevokedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!terminal) {
        throw new UnauthorizedException('Poste desktop verrouillé, révoqué ou non enrôlé.');
      }
    }

    if (passwordVerification.upgradedHash) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: passwordVerification.upgradedHash },
      });
    }

    return this.createSession(user, context);
  }

  async refreshSession(refreshToken: string | undefined, context: SessionContext = {}) {
    if (!refreshToken) {
      throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
    }

    const previousRefreshHash = hashSessionToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: previousRefreshHash },
      include: {
        user: { include: { organization: { include: { settings: true } } } },
      },
    });
    const now = new Date();

    if (!session || session.revoked || session.expiresAt <= now
      || !session.user.isActive || !session.user.organization.isActive) {
      throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
    }
    if (session.terminalId) {
      const terminal = await this.prisma.desktopTerminal.findFirst({
        where: {
          terminalId: session.terminalId,
          organizationId: session.user.organizationId,
          tokenHash: hashSessionToken(context.terminalToken ?? ''),
          tokenRevokedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!terminal) {
        throw new UnauthorizedException('Poste desktop verrouillé ou révoqué.');
      }
    }

    const nextRefreshToken = randomBytes(48).toString('base64url');
    const accessToken = await this.createAccessToken(session.user, session.id);
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const rotation = await this.prisma.session.updateMany({
      where: { id: session.id, refreshToken: previousRefreshHash, revoked: false, expiresAt: { gt: now } },
      data: {
        token: hashSessionToken(accessToken),
        refreshToken: hashSessionToken(nextRefreshToken),
        expiresAt,
        lastSeenAt: now,
        userAgent: context.userAgent?.slice(0, 512) ?? session.userAgent,
        ipAddress: context.ipAddress?.slice(0, 64) ?? session.ipAddress,
      },
    });

    if (rotation.count !== 1) {
      throw new UnauthorizedException('Session déjà renouvelée ou révoquée.');
    }

    return this.buildAuthResponse(session.user, accessToken, nextRefreshToken);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;

    await this.prisma.session.updateMany({
      where: { refreshToken: hashSessionToken(refreshToken), revoked: false },
      data: { revoked: true },
    });
  }

  async registerOrganization(dto: RegisterOrganizationDto, context: SessionContext = {}) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    const passwordHash = await hashPassword(dto.password);

    // Create organization, settings, default warehouse, and owner user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          email: dto.email,
          phone: dto.phone,
          country: 'République démocratique du Congo',
          sector: 'Commerce Général & PME',
        },
      });

      await tx.organizationSettings.create({
        data: {
          organizationId: org.id,
          primaryCurrency: Currency.CDF,
          secondaryCurrency: Currency.USD,
          exchangeRateUsdToCdf: 2850.00,
          taxRatePercent: 16.00,
          enableTax: true,
          invoicePrefix: 'FAC-2026-',
          quotePrefix: 'DEV-2026-',
          receiptPrefix: 'REC-2026-',
          invoiceNextNumber: 1001,
          quoteNextNumber: 1001,
          primaryColor: '#1E40AF',
          themeMode: 'light',
        },
      });

      await tx.warehouse.create({
        data: {
          organizationId: org.id,
          name: 'Dépôt Principal',
          isDefault: true,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: UserRole.ORG_OWNER,
        },
      });

      return { org, user };
    });

    return this.login({ email: dto.email, password: dto.password }, context);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { settings: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      organization: user.organization,
    };
  }
}
