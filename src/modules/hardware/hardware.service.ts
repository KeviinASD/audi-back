// hardware/hardware.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { HardwareSnapshot } from './entities/hardware-snapshot.entity';
import { HardwareSnapshotDto } from './dto/hardware-snapshot.dto';
import { Equipment } from '../equipos/entities/equipment.entity';

@Injectable()
export class HardwareService {

  constructor(
    @InjectRepository(HardwareSnapshot)
    private readonly repo: Repository<HardwareSnapshot>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: HardwareSnapshotDto,
    capturedAt: Date,
  ): Promise<HardwareSnapshot> {

    const snapshot = this.repo.create({
      equipment,
      capturedAt,
      cpuModel:          dto.cpu.model,
      cpuCores:          dto.cpu.cores,
      cpuFrequencyGHz:   dto.cpu.frequencyGHz,
      cpuUsagePercent:   dto.cpu.usagePercent,
      cpuTemperatureC:   dto.cpu.temperatureC ?? null,
      ramTotalGB:        dto.ram.totalGB,
      ramUsedGB:         dto.ram.usedGB,
      ramType:           dto.ram.type ?? null,
      ramFrequencyMHz:   dto.ram.frequencyMHz ?? null,
      diskCapacityGB:    dto.disk.capacityGB,
      diskUsedGB:        dto.disk.usedGB,
      diskType:          dto.disk.type ?? null,
      diskModel:         dto.disk.model ?? null,
      diskSmartStatus:   dto.disk.smartStatus ?? 'unknown',
      brand:             dto.physicalEquipment.brand ?? null,
      model:             dto.physicalEquipment.model ?? null,
      serialNumber:      dto.physicalEquipment.serialNumber ?? null,
      manufactureYear:   dto.physicalEquipment.manufactureYear ?? null,
      architecture:      dto.physicalEquipment.architecture ?? null,
      isObsolete:        this.calculateObsolescence(dto),
    });

    return this.repo.save(snapshot);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: number): Promise<HardwareSnapshot | null> {
    return this.repo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });
  }

  async getHistory(
    equipmentId: number,
    from: Date,
    to: Date,
  ): Promise<HardwareSnapshot[]> {
    return this.repo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: Between(from, to),
      },
      order: { capturedAt: 'DESC' },
    });
  }

  async getObsoleteEquipments(): Promise<HardwareSnapshot[]> {
    const snapshots = await this.repo.find({
      where: { isObsolete: true },
      relations: ['equipment'],
      order: { capturedAt: 'DESC' },
    });

    const seen = new Set<number>();
    return snapshots.filter(s => {
      if (seen.has(s.equipment.id)) return false;
      seen.add(s.equipment.id);
      return true;
    });
  }

  // ── Lógica interna ────────────────────────────────────────────

  private calculateObsolescence(dto: HardwareSnapshotDto): boolean {
    const currentYear     = new Date().getFullYear();
    const manufactureYear = dto.physicalEquipment.manufactureYear
      ? parseInt(dto.physicalEquipment.manufactureYear.substring(0, 4))
      : null;

    // Antigüedad > 7 años: equipo demasiado viejo para software académico moderno
    const tooOld = manufactureYear ? (currentYear - manufactureYear) > 7 : false;

    // RAM < 4 GB: insuficiente para ejecutar SO + navegador + herramientas de desarrollo
    const insufficientRam = dto.ram.totalGB < 4;

    // HDD no es criterio de obsolescencia — es un factor de rendimiento
    // (se registra en PerformanceSnapshot y puede flaguearse desde ahí)

    return tooOld || insufficientRam;
  }
}