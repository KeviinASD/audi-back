// security/security.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SecuritySnapshot } from './entities/security-snapshot.entity';
import { SecuritySnapshotDto } from './dto/security-snapshot.dto';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';

@Injectable()
export class SecurityService {

  constructor(
    @InjectRepository(SecuritySnapshot)
    private readonly repo: Repository<SecuritySnapshot>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: SecuritySnapshotDto,
    capturedAt: Date,
  ): Promise<SecuritySnapshot> {

    const snapshot = this.repo.create({
      equipment,
      capturedAt,

      osName:                      dto.os.name,
      osVersion:                   dto.os.version,
      osBuild:                     dto.os.build,
      osArchitecture:              dto.os.architecture,

      lastUpdateDate:              dto.windowsUpdate.lastUpdateDate
                                     ? new Date(dto.windowsUpdate.lastUpdateDate)
                                     : null,
      daysSinceLastUpdate:         dto.windowsUpdate.daysSinceLastUpdate,
      pendingUpdatesCount:         dto.windowsUpdate.pendingUpdatesCount,
      isCriticalUpdatePending:     dto.windowsUpdate.isCriticalUpdatePending,

      antivirusInstalled:          dto.antivirus.installed,
      antivirusEnabled:            dto.antivirus.enabled,
      antivirusName:               dto.antivirus.name ?? null,
      antivirusVersion:            dto.antivirus.version ?? null,
      antivirusDefinitionsUpdated: dto.antivirus.definitionsUpdated,
      antivirusLastScanDate:       dto.antivirus.lastScanDate
                                     ? new Date(dto.antivirus.lastScanDate)
                                     : null,

      firewallEnabled:             dto.firewall.enabled,
      firewallDomainEnabled:       dto.firewall.domainEnabled,
      firewallPrivateEnabled:      dto.firewall.privateEnabled,
      firewallPublicEnabled:       dto.firewall.publicEnabled,

      passwordMinLength:           dto.passwordPolicy.minLength,
      passwordMaxAgeDays:          dto.passwordPolicy.maxAgeDays,
      passwordMinAgeDays:          dto.passwordPolicy.minAgeDays,
      passwordComplexityEnabled:   dto.passwordPolicy.complexityEnabled,
      accountLockoutThreshold:     dto.passwordPolicy.lockoutThreshold,

      localUsers:                  dto.localUsers,
      lastLoggedUser:              dto.lastLoggedUser ?? null,
      lastLoginDate:               dto.lastLoginDate
                                     ? new Date(dto.lastLoginDate)
                                     : null,
      currentLoggedUser:           dto.currentLoggedUser ?? null,

      uacEnabled:                  dto.uacEnabled,
      rdpEnabled:                  dto.rdpEnabled,
      remoteRegistryEnabled:       dto.remoteRegistryEnabled,

      hasSecurityRisk:             this.calculateSecurityRisk(dto),
    });

    return this.repo.save(snapshot);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: number): Promise<SecuritySnapshot | null> {
    return this.repo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });
  }

  async getHistory(equipmentId: number, from: Date, to: Date): Promise<SecuritySnapshot[]> {
    return this.repo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: Between(from, to),
      },
      order: { capturedAt: 'DESC' },
    });
  }

  async getEquipmentsWithRisk(): Promise<SecuritySnapshot[]> {
    return this.repo
      .createQueryBuilder('ss')
      .distinctOn(['ss.equipment_id'])
      .leftJoinAndSelect('ss.equipment', 'equipment')
      .where('ss.has_security_risk = true')
      .orderBy('ss.equipment_id')
      .addOrderBy('ss.captured_at', 'DESC')
      .getMany();
  }

  async getEquipmentsWithoutAntivirus(): Promise<SecuritySnapshot[]> {
    return this.repo
      .createQueryBuilder('ss')
      .distinctOn(['ss.equipment_id'])
      .leftJoinAndSelect('ss.equipment', 'equipment')
      .where('ss.antivirus_enabled = false')
      .orderBy('ss.equipment_id')
      .addOrderBy('ss.captured_at', 'DESC')
      .getMany();
  }

  async getEquipmentsWithPendingUpdates(): Promise<SecuritySnapshot[]> {
    return this.repo
      .createQueryBuilder('ss')
      .distinctOn(['ss.equipment_id'])
      .leftJoinAndSelect('ss.equipment', 'equipment')
      .where('ss.is_critical_update_pending = true')
      .orderBy('ss.equipment_id')
      .addOrderBy('ss.captured_at', 'DESC')
      .getMany();
  }

  // ── Lógica interna ────────────────────────────────────────────

  calculateSecurityRisk(dto: SecuritySnapshotDto): boolean {
    const noAntivirus    = !dto.antivirus.enabled;
    const firewallOff    = !dto.firewall.enabled;
    const criticalUpdate = dto.windowsUpdate.isCriticalUpdatePending;
    const longNoUpdate   = dto.windowsUpdate.daysSinceLastUpdate > 90;
    const weakPassword   = dto.passwordPolicy.minLength < 8 ||
                           !dto.passwordPolicy.complexityEnabled;
    const noLockout      = dto.passwordPolicy.lockoutThreshold === 0;
    const rdpExposed     = dto.rdpEnabled;

    return noAntivirus || firewallOff || criticalUpdate ||
           longNoUpdate || weakPassword || noLockout || rdpExposed;
  }
}
