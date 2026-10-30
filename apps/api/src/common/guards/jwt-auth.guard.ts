import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { getJwtSecret } from '../config/security.config';
import { hashSessionToken } from '../security/password';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Jeton d’authentification manquant ou invalide.');
    }

    const token = authHeader.split(' ')[1];

    let payload: { sub: string; sid: string };
    try {
      payload = this.jwtService.verify(token, { secret: getJwtSecret() });
    } catch {
      throw new UnauthorizedException('Session expirée ou jeton d’accès non valide.');
    }

    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException('Jeton d’accès invalide.');
    }

    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      select: {
        id: true,
        userId: true,
        token: true,
        terminalId: true,
        revoked: true,
        expiresAt: true,
        lastSeenAt: true,
      },
    });

    if (!session || session.userId !== payload.sub || session.revoked || session.expiresAt <= now
      || session.token !== hashSessionToken(token)) {
      throw new UnauthorizedException('Session expirée ou révoquée.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: { include: { settings: true } } },
    });

    if (!user || !user.isActive || !user.organization.isActive) {
      throw new UnauthorizedException('Utilisateur ou entreprise désactivé(e).');
    }

    if (session.terminalId) {
      const terminal = await this.prisma.desktopTerminal.findFirst({
        where: {
          terminalId: session.terminalId,
          organizationId: user.organizationId,
          tokenRevokedAt: null,
        },
        select: { status: true },
      });
      if (!terminal || terminal.status === 'LOCKED') {
        throw new UnauthorizedException('Poste desktop verrouillé ou révoqué.');
      }
    }

    if (now.getTime() - session.lastSeenAt.getTime() >= 30_000) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
    }

    request.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
    };

    return true;
  }
}
