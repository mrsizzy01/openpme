import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { DesktopTerminalStatus } from '@prisma/client';
import { RemoteControlService } from '../src/modules/remote-control/remote-control.service';
import { hashSessionToken } from '../src/common/security/password';

const originalEnrollmentSecret = process.env.DESKTOP_ENROLLMENT_SECRET;

afterEach(() => {
  if (originalEnrollmentSecret === undefined) delete process.env.DESKTOP_ENROLLMENT_SECRET;
  else process.env.DESKTOP_ENROLLMENT_SECRET = originalEnrollmentSecret;
});

describe('remote desktop control', () => {
  it('rejects unauthenticated enrollment and stores only a hashed terminal credential', async () => {
    process.env.DESKTOP_ENROLLMENT_SECRET = 'test-enrollment-secret';
    const created: { data?: any } = {};
    const prisma = {
      organization: { findUnique: async () => ({ id: 'org-a' }) },
      desktopTerminal: {
        findFirst: async () => null,
        create: async ({ data }: any) => { created.data = data; return data; },
      },
    };
    const service = new RemoteControlService(prisma as any);

    await assert.rejects(
      service.enrollTerminal('wrong-key', {
        terminalId: 'DESKTOP-01',
        organizationId: 'org-a',
        displayName: 'Caisse 1',
      }),
      /Clé d’enrôlement/,
    );
    const enrolled = await service.enrollTerminal('test-enrollment-secret', {
      terminalId: 'DESKTOP-01',
      organizationId: 'org-a',
      displayName: 'Caisse 1',
    });
    assert.ok(enrolled.terminalToken);
    assert.equal(created.data.tokenHash, hashSessionToken(enrolled.terminalToken));
    assert.notEqual(created.data.tokenHash, enrolled.terminalToken);
  });

  it('authenticates heartbeat, records IP and reports status for version acknowledgement', async () => {
    const terminal = {
      id: 'record-1',
      terminalId: 'DESKTOP-01',
      organizationId: 'org-a',
      tokenHash: hashSessionToken('device-token'),
      tokenRevokedAt: null,
      status: DesktopTerminalStatus.LOCKED,
      lockReason: 'Vérification',
      stateVersion: 4,
      acknowledgedVersion: 3,
      offlineGraceHours: 24,
    };
    let update: any;
    const prisma = {
      desktopTerminal: {
        findUnique: async () => terminal,
        update: async (args: any) => { update = args; return args; },
      },
    };
    const service = new RemoteControlService(prisma as any);
    const response = await service.heartbeat('device-token', { acknowledgedVersion: 4 }, '192.0.2.4');

    assert.equal(update.data.acknowledgedVersion, 4);
    assert.equal(update.data.lastIpAddress, '192.0.2.4');
    assert.equal(response.status, DesktopTerminalStatus.LOCKED);
    assert.equal(response.acknowledged, true);
    assert.equal(response.stateVersion, 4);
  });

  it('rejects revoked or unknown terminal credentials', async () => {
    const prisma = {
      desktopTerminal: { findUnique: async () => null },
    };
    const service = new RemoteControlService(prisma as any);
    await assert.rejects(service.heartbeat('invalid-token', {}, '192.0.2.4'), /révoqué ou invalide/);
  });

  it('persists a scoped lock transition and its audit event', async () => {
    let auditEvent: any;
    const terminal = {
      id: 'record-1',
      terminalId: 'DESKTOP-01',
      organizationId: 'org-a',
      status: DesktopTerminalStatus.ACTIVE,
      lockReason: null,
      stateVersion: 2,
      acknowledgedVersion: 2,
      lastHeartbeatAt: new Date(),
    };
    const prisma = {
      desktopTerminal: {
        findFirst: async ({ where }: any) =>
          where.organizationId === 'org-a' ? terminal : null,
        update: async ({ data }: any) => ({
          ...terminal,
          status: data.status,
          stateVersion: terminal.stateVersion + data.stateVersion.increment,
        }),
      },
      $transaction: async (callback: any) => callback({
        desktopTerminal: { update: async ({ data }: any) => ({
          ...terminal,
          status: data.status,
          stateVersion: terminal.stateVersion + data.stateVersion.increment,
        }) },
        auditLog: { create: async ({ data }: any) => { auditEvent = data; } },
      }),
    };
    const service = new RemoteControlService(prisma as any);
    const response = await service.lockTerminal(
      'org-a',
      'DESKTOP-01',
      'manager-1',
      'Contrôle en cours',
      '192.0.2.10',
    );

    assert.equal(response.status, DesktopTerminalStatus.LOCKED);
    assert.equal(response.stateVersion, 3);
    assert.equal(auditEvent.organizationId, 'org-a');
    assert.equal(auditEvent.userId, 'manager-1');
    assert.equal(auditEvent.ipAddress, '192.0.2.10');
    assert.equal(auditEvent.newValues.reason, 'Contrôle en cours');
  });

  it('does not allow a manager to address a terminal from another organization', async () => {
    const service = new RemoteControlService({
      desktopTerminal: { findFirst: async () => null },
    } as any);
    await assert.rejects(
      service.lockTerminal('org-a', 'DESKTOP-OTHER', 'manager-a', 'Contrôle', '192.0.2.10'),
      /introuvable dans cette entreprise/,
    );
  });
});
