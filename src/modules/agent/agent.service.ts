// agent/agent.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HardwareService } from '../hardware/hardware.service';
import { SoftwareService } from '../software/software.service';
import { HardwareSnapshot } from '../hardware/entities/hardware-snapshot.entity';
import { SyncAgentDto } from './dto/sync-agent.dto';
import { Equipment } from '../equipos/entities/equipment.entity';

@Injectable()
export class AgentService {

  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    private readonly hardwareService: HardwareService,
    private readonly softwareService: SoftwareService,
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

    // 2. Modo full: guarda hardware y software en paralelo
    if (dto.mode === 'full') {
      if (!dto.hardware || !dto.software) {
        throw new BadRequestException(
          'Fields "hardware" and "software" are required in full mode',
        );
      }

      const [hardwareSnapshot] = await Promise.all([
        this.hardwareService.saveSnapshot(equipment, dto.hardware, capturedAt),
        this.softwareService.saveSnapshot(equipment, dto.software, capturedAt),
      ]);

      // 3. Recalcular estado del equipo
      const newStatus = this.calculateEquipmentStatus(hardwareSnapshot);

      await this.equipmentRepo.update(equipment.id, {
        lastConnection: capturedAt,
        status: newStatus,
      });

    } else {
      // Modo quick: solo actualiza lastConnection
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
  ): 'operative' | 'degraded' | 'critical' {

    const criticalTemp = hw.cpuTemperatureC > 85;
    const diskFailed   = hw.diskSmartStatus === 'failed';
    if (criticalTemp || diskFailed) return 'critical';

    const highTemp     = hw.cpuTemperatureC > 70;
    const highRamUsage = hw.ramTotalGB > 0 && (hw.ramUsedGB / hw.ramTotalGB) > 0.90;
    if (highTemp || highRamUsage) return 'degraded';

    return 'operative';
  }
}