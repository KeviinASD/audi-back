// agent/agent.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HardwareService } from '../hardware/hardware.service';
import { SoftwareService } from '../software/software.service';
import { SecurityService } from '../security/security.service';
import { PerformanceService } from '../performance/performance.service';
import { HardwareSnapshot } from '../hardware/entities/hardware-snapshot.entity';
import { SecuritySnapshot } from '../security/entities/security-snapshot.entity';
import { SyncAgentDto } from './dto/sync-agent.dto';
import { Equipment } from '../equipos/entities/equipment.entity';

@Injectable()
export class AgentService {

  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    private readonly hardwareService: HardwareService,
    private readonly softwareService: SoftwareService,
    private readonly securityService: SecurityService,
    private readonly performanceService: PerformanceService,
  ) {}

  async processSync(dto: SyncAgentDto): Promise<{ ok: boolean; message: string }> {

    // 1. Buscar equipo por código
    const equipment = await this.equipmentRepo.findOne({
      where: { code: dto.equipmentCode, isActive: true },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Equipment with code "${dto.equipmentCode}" not found or inactive`,
      );
    }

    const capturedAt = new Date(dto.timestamp);

    // 2. Modo full: guarda los 4 snapshots en paralelo
    if (dto.mode === 'full') {
      if (!dto.hardware || !dto.software || !dto.security || !dto.performance) {
        throw new BadRequestException(
          'Fields "hardware", "software", "security" and "performance" are required in full mode',
        );
      }

      const [hardwareSnapshot, , securitySnapshot] = await Promise.all([
        this.hardwareService.saveSnapshot(equipment, dto.hardware, capturedAt),
        this.softwareService.saveSnapshot(equipment, dto.software, capturedAt),
        this.securityService.saveSnapshot(equipment, dto.security, capturedAt),
        this.performanceService.saveSnapshot(equipment, dto.performance, capturedAt, 'full'),
      ]);

      // 3. Recalcular estado del equipo con hardware + seguridad
      const newStatus = this.calculateEquipmentStatus(hardwareSnapshot, securitySnapshot);

      await this.equipmentRepo.update(equipment.id, {
        lastConnection: capturedAt,
        status: newStatus,
      });

    } else {
      // Modo quick: solo guarda performance y actualiza lastConnection
      if (dto.performance) {
        await this.performanceService.saveSnapshot(
          equipment, dto.performance, capturedAt, 'quick',
        );
      }
      await this.equipmentRepo.update(equipment.id, {
        lastConnection: capturedAt,
      });
    }

    return {
      ok: true,
      message: `Sync processed successfully for ${dto.equipmentCode}`,
    };
  }

  // ── Cálculo de estado del equipo ──────────────────────────────

  private calculateEquipmentStatus(
    hw: HardwareSnapshot,
    sec: SecuritySnapshot,
  ): 'operative' | 'degraded' | 'critical' {

    // Crítico
    const criticalTemp = (hw.cpuTemperatureC ?? 0) > 85;
    const diskFailed   = hw.diskSmartStatus === 'failed';
    const noAntivirus  = !sec.antivirusEnabled;
    const firewallOff  = !sec.firewallEnabled;
    if (criticalTemp || diskFailed || noAntivirus || firewallOff) return 'critical';

    // Degradado
    const highTemp       = (hw.cpuTemperatureC ?? 0) > 70;
    const highRamUsage   = hw.ramTotalGB > 0 && (hw.ramUsedGB / hw.ramTotalGB) > 0.90;
    const criticalUpdate = sec.isCriticalUpdatePending;
    const longNoUpdate   = sec.daysSinceLastUpdate > 90;
    if (highTemp || highRamUsage || criticalUpdate || longNoUpdate) return 'degraded';

    return 'operative';
  }
}
