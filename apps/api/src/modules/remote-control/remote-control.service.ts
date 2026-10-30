import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DesktopTerminalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashSessionToken } from '../../common/security/password';

const ONLINE_WINDOW_MS = 40_000;

@Injectable()
export class RemoteControlService {
  constructor(private prisma: PrismaService) {}

  async enrollTerminal(
    enrollmentKey: string | undefined,
    data: { terminalId: string; organizationId: string; displayName: string },
  ) {
    const configuredKey = process.env.DESKTOP_ENROLLMENT_SECRET;
    if (!configuredKey || !enrollmentKey || enrollmentKey !== configuredKey) {
      throw new UnauthorizedException('Clé d’enrôlement du poste invalide.');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: data.organizationId },
      select: { id: true },
    });
    if (!organization) throw new NotFoundException('Entreprise introuvable.');

    const existing = await this.prisma.desktopTerminal.findFirst({
      where: { terminalId: data.terminalId, organizationId: data.organizationId },
    });
    const credential = randomBytes(48).toString('base64url');
    const tokenHash = hashSessionToken(credential);

    if (existing) {
      await this.prisma.desktopTerminal.update({
        where: { id: existing.id },
        data: {
          displayName: data.displayName,
          tokenHash,
          tokenRevokedAt: null,
        },
      });
    } else {
      await this.prisma.desktopTerminal.create({
        data: {
          terminalId: data.terminalId,
          organizationId: data.organizationId,
          displayName: data.displayName,
          tokenHash,
        },
      });
    }

    return { terminalToken: credential };
  }

  async heartbeat(
    credential: string | undefined,
    data: { acknowledgedVersion?: number },
    ipAddress: string,
  ) {
    if (!credential) throw new UnauthorizedException('Jeton du poste manquant.');
    const terminal = await this.prisma.desktopTerminal.findUnique({
      where: { tokenHash: hashSessionToken(credential) },
    });
    if (!terminal || terminal.tokenRevokedAt) {
      throw new UnauthorizedException('Jeton du poste révoqué ou invalide.');
    }

    const now = new Date();
    const acknowledged = data.acknowledgedVersion === terminal.stateVersion;
    await this.prisma.desktopTerminal.update({
      where: { id: terminal.id },
      data: {
        lastHeartbeatAt: now,
        lastIpAddress: ipAddress.slice(0, 64),
        ...(acknowledged
          ? {
              acknowledgedVersion: terminal.stateVersion,
              lastAcknowledgedAt: now,
            }
          : {}),
      },
    });

    return {
      terminalId: terminal.terminalId,
      status: terminal.status,
      reason: terminal.lockReason,
      stateVersion: terminal.stateVersion,
      serverTime: now.toISOString(),
      lastHeartbeatAt: now.toISOString(),
      acknowledged,
      offlineGraceHours: terminal.offlineGraceHours,
      tokenRevoked: Boolean(terminal.tokenRevokedAt),
    };
  }

  async listTerminals(organizationId: string) {
    const now = Date.now();
    const terminals = await this.prisma.desktopTerminal.findMany({
      where: { organizationId },
      include: { lockedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return terminals.map((terminal) => {
      const online = Boolean(
        terminal.lastHeartbeatAt
        && now - terminal.lastHeartbeatAt.getTime() <= ONLINE_WINDOW_MS,
      );
      return {
        id: terminal.terminalId,
        terminalRecordId: terminal.id,
        organizationId: terminal.organizationId,
        userName: terminal.displayName,
        userRole: 'POSTE DESKTOP',
        clientType: 'DESKTOP_PYQT' as const,
        ipAddress: terminal.lastIpAddress ?? '',
        lastPing: terminal.lastHeartbeatAt,
        lastHeartbeatAt: terminal.lastHeartbeatAt,
        status: terminal.status === DesktopTerminalStatus.LOCKED
          ? 'LOCKED'
          : online ? 'ONLINE' : 'OFFLINE',
        lockReason: terminal.lockReason,
        lockedAt: terminal.lockedAt,
        lockedBy: terminal.lockedBy
          ? `${terminal.lockedBy.firstName} ${terminal.lockedBy.lastName}`
          : null,
        stateVersion: terminal.stateVersion,
        acknowledgedVersion: terminal.acknowledgedVersion,
        lastAcknowledgedAt: terminal.lastAcknowledgedAt,
        commandAcknowledged:
          terminal.acknowledgedVersion === terminal.stateVersion && online,
        offlineGraceHours: terminal.offlineGraceHours,
      };
    });
  }

  async lockTerminal(
    organizationId: string,
    terminalId: string,
    actorId: string,
    reason: string,
    ipAddress: string,
  ) {
    return this.updateState(
      organizationId,
      terminalId,
      actorId,
      DesktopTerminalStatus.LOCKED,
      reason,
      ipAddress,
    );
  }

  async unlockTerminal(
    organizationId: string,
    terminalId: string,
    actorId: string,
    reason: string,
    ipAddress: string,
  ) {
    return this.updateState(
      organizationId,
      terminalId,
      actorId,
      DesktopTerminalStatus.ACTIVE,
      reason,
      ipAddress,
    );
  }

  async revokeTerminal(
    organizationId: string,
    terminalId: string,
    actorId: string,
    reason: string,
    ipAddress: string,
  ) {
    const terminal = await this.prisma.desktopTerminal.findFirst({
      where: { terminalId, organizationId },
    });
    if (!terminal) throw new NotFoundException('Terminal introuvable dans cette entreprise.');
    if (status === DesktopTerminalStatus.ACTIVE && terminal.tokenRevokedAt) {
      throw new ForbiddenException('Le jeton de ce poste est révoqué; un réenrôlement est requis.');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.desktopTerminal.update({
        where: { id: terminal.id },
        data: {
          tokenRevokedAt: now,
          status: DesktopTerminalStatus.LOCKED,
          lockReason: reason,
          lockedAt: now,
          lockedById: actorId,
          stateVersion: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: actorId,
          action: 'REMOTE_TERMINAL_REVOKED',
          entity: 'DesktopTerminal',
          entityId: terminalId,
          oldValues: { status: terminal.status, tokenRevoked: false },
          newValues: {
            status: DesktopTerminalStatus.LOCKED,
            tokenRevoked: true,
            reason,
            stateVersion: result.stateVersion,
          },
          ipAddress: ipAddress.slice(0, 64),
        },
      });
      return result;
    });

    return {
      success: true,
      message: 'Jeton révoqué. Le poste devra être réenrôlé par un administrateur autorisé.',
      status: updated.status,
      stateVersion: updated.stateVersion,
      acknowledged: false,
    };
  }

  private async updateState(
    organizationId: string,
    terminalId: string,
    actorId: string,
    status: DesktopTerminalStatus,
    reason: string,
    ipAddress: string,
  ) {
    const terminal = await this.prisma.desktopTerminal.findFirst({
      where: { terminalId, organizationId },
    });
    if (!terminal) throw new NotFoundException('Terminal introuvable dans cette entreprise.');

    const previous = {
      status: terminal.status,
      reason: terminal.lockReason,
      stateVersion: terminal.stateVersion,
    };
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.desktopTerminal.update({
        where: { id: terminal.id },
        data: {
          status,
          lockReason: status === DesktopTerminalStatus.LOCKED ? reason : null,
          lockedAt: status === DesktopTerminalStatus.LOCKED ? now : null,
          lockedById: status === DesktopTerminalStatus.LOCKED ? actorId : null,
          stateVersion: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: actorId,
          action: status === DesktopTerminalStatus.LOCKED
            ? 'REMOTE_TERMINAL_LOCKED'
            : 'REMOTE_TERMINAL_UNLOCKED',
          entity: 'DesktopTerminal',
          entityId: terminalId,
          oldValues: previous,
          newValues: {
            status,
            reason,
            stateVersion: result.stateVersion,
            terminalId,
          },
          ipAddress: ipAddress.slice(0, 64),
        },
      });
      return result;
    });
    const online = Boolean(
      updated.lastHeartbeatAt
      && Date.now() - updated.lastHeartbeatAt.getTime() <= ONLINE_WINDOW_MS,
    );
    return {
      success: true,
      message: online
        ? 'Commande enregistrée; en attente de confirmation du poste.'
        : 'État enregistré; le poste appliquera la commande à sa reconnexion.',
      status: updated.status,
      stateVersion: updated.stateVersion,
      acknowledged: online && updated.acknowledgedVersion === updated.stateVersion,
    };
  }

  async assertTerminalActive(organizationId: string, terminalId: string) {
    const terminal = await this.prisma.desktopTerminal.findFirst({
      where: { organizationId, terminalId },
      select: { status: true, tokenRevokedAt: true },
    });
    if (!terminal || terminal.tokenRevokedAt) {
      throw new ForbiddenException('Poste desktop révoqué ou non enregistré.');
    }
    if (terminal.status === DesktopTerminalStatus.LOCKED) {
      throw new ForbiddenException('Poste verrouillé par la direction.');
    }
  }

  async authenticateTerminalToken(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Jeton du poste manquant.');
    const terminal = await this.prisma.desktopTerminal.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: { terminalId: true, organizationId: true, tokenRevokedAt: true },
    });
    if (!terminal || terminal.tokenRevokedAt) {
      throw new UnauthorizedException('Jeton du poste révoqué ou invalide.');
    }
    return terminal;
  }
}
