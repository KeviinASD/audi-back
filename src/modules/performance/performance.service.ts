// performance/performance.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PerformanceSnapshot } from './entities/performance-snapshot.entity';
import { PerformanceSnapshotDto } from './dto/performance-snapshot.dto';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';

@Injectable()
export class PerformanceService {

  constructor(
    @InjectRepository(PerformanceSnapshot)
    private readonly repo: Repository<PerformanceSnapshot>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: PerformanceSnapshotDto,
    capturedAt: Date,
    mode: string,
  ): Promise<PerformanceSnapshot> {

    const ramUsagePercent  = dto.ram.totalGB > 0
      ? (dto.ram.usedGB / dto.ram.totalGB) * 100
      : 0;

    const diskUsagePercent = dto.disk.totalGB > 0
      ? (dto.disk.usedGB / dto.disk.totalGB) * 100
      : 0;

    const snapshot = this.repo.create({
      equipment,
      capturedAt,
      mode,

      cpuUsagePercent:    dto.cpu.usagePercent,
      cpuTemperatureC:    dto.cpu.temperatureC ?? null,

      ramTotalGB:         dto.ram.totalGB,
      ramUsedGB:          dto.ram.usedGB,
      ramUsagePercent,

      diskTotalGB:        dto.disk.totalGB,
      diskUsedGB:         dto.disk.usedGB,
      diskUsagePercent,
      diskTemperatureC:   dto.disk.temperatureC ?? null,
      diskReadSpeedMBs:   dto.disk.readSpeedMBs ?? null,
      diskWriteSpeedMBs:  dto.disk.writeSpeedMBs ?? null,

      networkSentMBs:     dto.network.sentMBs,
      networkReceivedMBs: dto.network.receivedMBs,
      networkAdapterName: dto.network.adapterName ?? null,

      uptimeSeconds:      dto.uptimeSeconds,
      lastBootTime:       dto.lastBootTime ? new Date(dto.lastBootTime) : null,

      topProcessesByCpu:  dto.topProcessesByCpu,
      topProcessesByRam:  dto.topProcessesByRam,

      hasCpuAlert:        dto.cpu.usagePercent > 85,
      hasRamAlert:        ramUsagePercent > 90,
      hasDiskAlert:       diskUsagePercent > 90,
      hasThermalAlert:    (dto.cpu.temperatureC ?? 0) > 70 ||
                          (dto.disk.temperatureC ?? 0) > 55,
    });

    return this.repo.save(snapshot);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: number): Promise<PerformanceSnapshot | null> {
    return this.repo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });
  }

  async getHistory(equipmentId: number, from: Date, to: Date): Promise<PerformanceSnapshot[]> {
    return this.repo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: Between(from, to),
      },
      order: { capturedAt: 'ASC' },
    });
  }

  async getAverageMetrics(
    equipmentId: number,
    from: Date,
    to: Date,
  ): Promise<{ avgCpu: number; avgRam: number; avgDisk: number }> {
    const snapshots = await this.repo.find({
      where: { equipment: { id: equipmentId }, capturedAt: Between(from, to) },
    });

    const avg = (vals: number[]) =>
      vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    return {
      avgCpu:  avg(snapshots.map(s => Number(s.cpuUsagePercent)  || 0)),
      avgRam:  avg(snapshots.map(s => Number(s.ramUsagePercent)  || 0)),
      avgDisk: avg(snapshots.map(s => Number(s.diskUsagePercent) || 0)),
    };
  }

  async getEquipmentsWithAlerts(): Promise<PerformanceSnapshot[]> {
    const snapshots = await this.repo.find({
      where: [
        { hasCpuAlert:     true },
        { hasRamAlert:     true },
        { hasDiskAlert:    true },
        { hasThermalAlert: true },
      ],
      relations: ['equipment'],
      order: { capturedAt: 'DESC' },
    });

    // Keep only the latest snapshot per equipment
    const seen = new Set<number>();
    return snapshots.filter(s => {
      if (seen.has(s.equipment.id)) return false;
      seen.add(s.equipment.id);
      return true;
    });
  }
}
