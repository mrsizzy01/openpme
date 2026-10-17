import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TerminalState {
  id: string;
  organizationId: string;
  userId?: string;
  userName: string;
  userRole: string;
  clientType: 'DESKTOP_PYQT' | 'WEB_POS' | 'BROWSER';
  ipAddress: string;
  lastPing: Date;
  status: 'ONLINE' | 'LOCKED' | 'OFFLINE';
  pendingCommand: 'NONE' | 'LOCK' | 'UNLOCK' | 'KILL' | 'MESSAGE';
  commandMessage?: string;
  cashSessionId?: string;
}

@Injectable()
export class RemoteControlService {
  constructor(private prisma: PrismaService) {}

  // Registre en mémoire des terminaux connectés
  private terminals = new Map<string, TerminalState>();

  /**
   * Heartbeat envoyé régulièrement par les clients Desktop et Web
   */
  async registerHeartbeat(data: {
    terminalId: string;
    organizationId: string;
    userId?: string;
    clientType?: 'DESKTOP_PYQT' | 'WEB_POS' | 'BROWSER';
    ipAddress?: string;
  }) {
    const { terminalId, organizationId, userId, clientType = 'DESKTOP_PYQT', ipAddress = '127.0.0.1' } = data;

    let targetOrgId = organizationId;
    if (!targetOrgId || targetOrgId === 'org-pme-demo') {
      const firstOrg = await this.prisma.organization.findFirst({ select: { id: true } });
      if (firstOrg) targetOrgId = firstOrg.id;
    }

    let userName = clientType === 'DESKTOP_PYQT' ? 'Poste Caisse Windows' : 'Terminal Web';
    let userRole = 'CAISSIER';

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, role: true },
      });
      if (user) {
        userName = `${user.firstName} ${user.lastName}`;
        userRole = user.role;
      }
    }

    // Récupérer la session de caisse active éventuelle
    const activeSession = userId ? await this.prisma.cashSession.findFirst({
      where: { organizationId: targetOrgId, userId, status: 'OPEN' },
      select: { id: true },
    }) : null;

    let terminal = this.terminals.get(terminalId);

    if (!terminal) {
      terminal = {
        id: terminalId,
        organizationId: targetOrgId,
        userId,
        userName,
        userRole,
        clientType,
        ipAddress,
        lastPing: new Date(),
        status: 'ONLINE',
        pendingCommand: 'NONE',
        cashSessionId: activeSession?.id,
      };
      this.terminals.set(terminalId, terminal);
    } else {
      terminal.lastPing = new Date();
      terminal.organizationId = targetOrgId;
      if (userId) {
        terminal.userId = userId;
        terminal.userName = userName;
        terminal.userRole = userRole;
      }
      terminal.ipAddress = ipAddress;
      terminal.cashSessionId = activeSession?.id;
      if (terminal.status === 'OFFLINE' && terminal.pendingCommand === 'NONE') {
        terminal.status = 'ONLINE';
      }
    }

    const command = terminal.pendingCommand;
    const msg = terminal.commandMessage;

    // Si la commande était un KILL, on la consomme après livraison
    if (command === 'KILL') {
      terminal.pendingCommand = 'NONE';
      terminal.status = 'OFFLINE';
    }

    return { action: command, message: msg };
  }

  /**
   * Lister tous les terminaux de l'entreprise
   */
  async listTerminals(organizationId: string): Promise<TerminalState[]> {
    const now = Date.now();
    const result: TerminalState[] = [];

    for (const terminal of this.terminals.values()) {
      // Si le terminal est sur la démo ou sans org, le rattacher à l'organisation active
      if (
        terminal.organizationId === organizationId ||
        terminal.organizationId === 'org-pme-demo' ||
        !terminal.organizationId
      ) {
        terminal.organizationId = organizationId;
        // Considérer offline si pas de ping depuis plus de 40 secondes
        if (now - terminal.lastPing.getTime() > 40000) {
          terminal.status = 'OFFLINE';
        }
        result.push(terminal);
      }
    }

    return result;
  }

  /**
   * Verrouiller un ou tous les postes à distance
   */
  async lockTerminal(organizationId: string, terminalId: string, reason?: string) {
    if (terminalId === 'ALL') {
      for (const t of this.terminals.values()) {
        t.pendingCommand = 'LOCK';
        t.status = 'LOCKED';
        t.commandMessage = reason || 'Tous les postes ont été verrouillés par la Direction.';
      }
      return { success: true, message: 'Tous les terminaux ont été verrouillés.' };
    }

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new NotFoundException('Terminal introuvable.');
    }

    terminal.pendingCommand = 'LOCK';
    terminal.status = 'LOCKED';
    terminal.commandMessage = reason || 'Poste verrouillé par la Direction.';

    await this.prisma.auditLog.create({
      data: {
        organizationId: terminal.organizationId || organizationId,
        userId: terminal.userId || null,
        action: 'REMOTE_TERMINAL_LOCKED',
        entity: 'Terminal',
        entityId: terminalId,
        newValues: { reason: terminal.commandMessage, lockedAt: new Date().toISOString() },
      },
    }).catch(() => {});

    return { success: true, message: 'Commande de verrouillage transmise.' };
  }

  /**
   * Déverrouiller un ou tous les postes à distance
   */
  async unlockTerminal(organizationId: string, terminalId: string) {
    if (terminalId === 'ALL') {
      for (const t of this.terminals.values()) {
        t.pendingCommand = 'UNLOCK';
        t.status = 'ONLINE';
        t.commandMessage = undefined;
      }
      return { success: true, message: 'Tous les terminaux ont été déverrouillés.' };
    }

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new NotFoundException('Terminal introuvable.');
    }

    terminal.pendingCommand = 'UNLOCK';
    terminal.status = 'ONLINE';
    terminal.commandMessage = undefined;

    await this.prisma.auditLog.create({
      data: {
        organizationId: terminal.organizationId || organizationId,
        userId: terminal.userId || null,
        action: 'REMOTE_TERMINAL_UNLOCKED',
        entity: 'Terminal',
        entityId: terminalId,
        newValues: { unlockedAt: new Date().toISOString() },
      },
    }).catch(() => {});

    return { success: true, message: 'Poste déverrouillé avec succès.' };
  }

  /**
   * Forcer la fermeture / extinction du logiciel à distance (Kill switch)
   */
  async killTerminal(organizationId: string, terminalId: string, reason?: string) {
    const reasonMsg = reason || 'Fermeture forcée ordonnée par le Manager / Propriétaire.';

    if (terminalId === 'ALL') {
      let count = 0;
      for (const t of this.terminals.values()) {
        t.pendingCommand = 'KILL';
        t.status = 'OFFLINE';
        t.commandMessage = reasonMsg;
        count++;
      }
      return { success: true, message: `Ordre d'arrêt d'urgence envoyé à l'ensemble des ${count} terminaux.` };
    }

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new NotFoundException('Terminal introuvable.');
    }

    terminal.pendingCommand = 'KILL';
    terminal.status = 'OFFLINE';
    terminal.commandMessage = reasonMsg;

    // Journal d'audit
    if (terminal.userId) {
      await this.prisma.auditLog.create({
        data: {
          organizationId: terminal.organizationId || organizationId,
          userId: terminal.userId,
          action: 'REMOTE_TERMINAL_KILLED',
          entity: 'Terminal',
          entityId: terminalId,
          newValues: { reason: terminal.commandMessage, killedAt: new Date().toISOString() },
        },
      }).catch(() => {});
    }

    return { success: true, message: 'Ordre de fermeture immédiate envoyé au terminal.' };
  }

  /**
   * Déconnexion immédiate du terminal et libération de la session
   */
  async logoutTerminal(terminalId: string, reason?: string) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.status = 'OFFLINE';
      terminal.userId = undefined;
      terminal.userName = 'Poste Déconnecté';
      terminal.cashSessionId = undefined;
      terminal.pendingCommand = 'NONE';
      terminal.commandMessage = reason || 'Session déconnectée et fermée.';
    }
    return { success: true, message: 'Terminal déconnecté avec succès.' };
  }
}
