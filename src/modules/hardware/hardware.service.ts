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
    return this.repo
      .createQueryBuilder('hs')
      .distinctOn(['hs.equipment_id'])
      .leftJoinAndSelect('hs.equipment', 'equipment')
      .where('hs.is_obsolete = true')
      .orderBy('hs.equipment_id')
      .addOrderBy('hs.captured_at', 'DESC')
      .getMany();
  }

  // ── Lógica interna ────────────────────────────────────────────

  private calculateObsolescence(dto: HardwareSnapshotDto): boolean {
    const currentYear     = new Date().getFullYear();
    const manufactureYear = dto.physicalEquipment.manufactureYear
      ? parseInt(dto.physicalEquipment.manufactureYear.substring(0, 4))
      : null;

    const tooOld          = manufactureYear ? (currentYear - manufactureYear) > 5 : false;
    const insufficientRam = dto.ram.totalGB < 4;
    const mechanicalDisk  = dto.disk.type?.toUpperCase() === 'HDD';

    return tooOld || insufficientRam || mechanicalDisk;
  }
}