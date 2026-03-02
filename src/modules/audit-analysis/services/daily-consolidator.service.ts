// audit-analysis/services/daily-consolidator.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { HardwareSnapshot } from 'src/modules/hardware/entities/hardware-snapshot.entity';
import { SoftwareInstalled } from 'src/modules/software/entities/software-installed.entity';
import { SecuritySnapshot } from 'src/modules/security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from 'src/modules/performance/entities/performance-snapshot.entity';
import { DailyLaboratoryHeatMap, EquipmentHeatMapItem } from '../dto/daily-analysis.dto';
import { EquipmentDailyDetail, SnapshotRef } from '../dto/equipment-detail.dto';
import {
  calculateEquipmentStatus,
  EquipmentStatus,
} from 'src/common/utils/equipment-status.util';

@Injectable()
export class DailyConsolidatorService {

  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(HardwareSnapshot)
    private readonly hardwareRepo: Repository<HardwareSnapshot>,
    @InjectRepository(SoftwareInstalled)
    private readonly softwareRepo: Repository<SoftwareInstalled>,
    @InjectRepository(SecuritySnapshot)
    private readonly securityRepo: Repository<SecuritySnapshot>,
    @InjectRepository(PerformanceSnapshot)
    private readonly performanceRepo: Repository<PerformanceSnapshot>,
  ) {}

  // ── Heat map — carga liviana ──────────────────────────────────
  // Solo hardware + security para calcular status y flags de cada celda

  async getDailyHeatMap(
    laboratoryId: number,
    date: Date,
  ): Promise<DailyLaboratoryHeatMap> {

    const equipments = await this.equipmentRepo.find({
      where: { laboratory: { id: laboratoryId }, isActive: true },
      relations: ['laboratory'],
    });

    if (!equipments.length) {
      throw new NotFoundException(
        `Laboratory ${laboratoryId} not found or has no active equipments`,
      );
    }

    const laboratory  = equipments[0].laboratory;
    const upTo        = this.utcEndOfDay(date);
    const upToPrevDay = this.utcEndOfDay(this.utcPrevDay(date));

    const items = await Promise.all(
      equipments.map(eq => this.buildHeatMapItem(eq, upTo, upToPrevDay)),
    );

    return {
      laboratory: { id: laboratory.id, name: laboratory.name, location: laboratory.location },
      date:       date.toISOString().split('T')[0],
      summary:    this.buildSummary(items),
      equipments: items,
    };
  }

  private async buildHeatMapItem(
    equipment: Equipment,
    upTo: Date,
    upToPrevDay: Date,
  ): Promise<EquipmentHeatMapItem> {

    const [hardware, security, prevHardware, prevSecurity, riskyAppsCount, lastSync] =
      await Promise.all([
        this.getLatestUpTo(this.hardwareRepo, equipment.id, upTo),
        this.getLatestUpTo(this.securityRepo, equipment.id, upTo),
        this.getLatestUpTo(this.hardwareRepo, equipment.id, upToPrevDay),
        this.getLatestUpTo(this.securityRepo, equipment.id, upToPrevDay),
        this.softwareRepo.count({
          where: { equipment: { id: equipment.id }, isRisk: true },
        }),
        this.getLastSyncDate(equipment.id, upTo),
      ]);

    const currentStatus  = calculateEquipmentStatus(hardware, security);
    const previousStatus = calculateEquipmentStatus(prevHardware, prevSecurity);

    return {
      equipment: {
        id:       equipment.id,
        code:     equipment.code,
        name:     equipment.name,
        location: equipment.ubication,
      },
      status:                currentStatus,
      statusCompareToPrevDay: this.compareStatus(currentStatus, previousStatus),
      isObsolete:            hardware?.isObsolete ?? false,
      hasSecurityRisk:       security?.hasSecurityRisk ?? false,
      riskyAppsCount,
      lastSync,
    };
  }

  // ── Detalle completo — carga pesada ───────────────────────────
  // Solo se llama al hacer click en una PC del heat map

  async getEquipmentDetail(
    equipmentId: number,
    date: Date,
  ): Promise<EquipmentDailyDetail> {

    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipmentId, isActive: true },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment ${equipmentId} not found or inactive`);
    }

    const upTo        = this.utcEndOfDay(date);
    const upToPrevDay = this.utcEndOfDay(this.utcPrevDay(date));

    const [hardware, softwareItems, security, performance, prevHardware, prevSecurity] =
      await Promise.all([
        this.getLatestUpTo(this.hardwareRepo,    equipment.id, upTo),
        this.getSoftwareUpTo(equipment.id, upTo),
        this.getLatestUpTo(this.securityRepo,    equipment.id, upTo),
        this.getLatestUpTo(this.performanceRepo, equipment.id, upTo),
        this.getLatestUpTo(this.hardwareRepo,    equipment.id, upToPrevDay),
        this.getLatestUpTo(this.securityRepo,    equipment.id, upToPrevDay),
      ]);

    const currentStatus  = calculateEquipmentStatus(hardware, security);
    const previousStatus = calculateEquipmentStatus(prevHardware, prevSecurity);

    return {
      equipment: {
        id:       equipment.id,
        code:     equipment.code,
        name:     equipment.name,
        location: equipment.ubication,
      },
      status:                currentStatus,
      statusCompareToPrevDay: this.compareStatus(currentStatus, previousStatus),
      hardware:    this.wrapSnapshot(hardware, date),
      software: {
        ...this.wrapSnapshot(softwareItems.latest, date),
        riskyCount: softwareItems.riskyCount,
        totalCount: softwareItems.totalCount,
      },
      security: {
        ...this.wrapSnapshot(security, date),
        hasRisk: security?.hasSecurityRisk ?? false,
      },
      performance: this.wrapSnapshot(performance, date),
    };
  }

  // ── Helpers de consulta ───────────────────────────────────────

  private async getLatestUpTo<T extends { capturedAt: Date }>(
    repo: Repository<T>,
    equipmentId: number,
    upTo: Date,
  ): Promise<T | null> {
    return repo.findOne({
      where: {
        equipment: { id: equipmentId } as any,
        capturedAt: LessThanOrEqual(upTo),
      } as any,
      order: { capturedAt: 'DESC' } as any,
    });
  }

  private async getSoftwareUpTo(equipmentId: number, upTo: Date) {
    const latest = await this.softwareRepo.findOne({
      where: { equipment: { id: equipmentId }, capturedAt: LessThanOrEqual(upTo) },
      order: { capturedAt: 'DESC' },
    });

    if (!latest) return { latest: null, riskyCount: 0, totalCount: 0 };

    const [riskyCount, totalCount] = await Promise.all([
      this.softwareRepo.count({
        where: { equipment: { id: equipmentId }, capturedAt: latest.capturedAt, isRisk: true },
      }),
      this.softwareRepo.count({
        where: { equipment: { id: equipmentId }, capturedAt: latest.capturedAt },
      }),
    ]);

    return { latest, riskyCount, totalCount };
  }

  private async getLastSyncDate(equipmentId: number, upTo: Date): Promise<Date | null> {
    const snap = await this.hardwareRepo.findOne({
      where: {
        equipment: { id: equipmentId } as any,
        capturedAt: LessThanOrEqual(upTo),
      } as any,
      order: { capturedAt: 'DESC' } as any,
    });
    return snap?.capturedAt ?? null;
  }

  // ── Helpers de fecha (UTC) ────────────────────────────────────
  // new Date('2026-03-01') se parsea como medianoche UTC.
  // endOfDay() de date-fns usa el timezone LOCAL del servidor, lo que
  // puede cortar datos capturados después de las 00:00 hora local.
  // Estos helpers operan puramente en UTC para evitar ese desfase.

  private utcEndOfDay(date: Date): Date {
    const d = date.toISOString().split('T')[0]; // '2026-03-01'
    return new Date(d + 'T23:59:59.999Z');
  }

  private utcPrevDay(date: Date): Date {
    const d = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d;
  }

  // ── Helpers de cálculo ────────────────────────────────────────

  private wrapSnapshot<T extends { capturedAt: Date }>(
    snapshot: T | null,
    requestedDate: Date,
  ): SnapshotRef<T> {
    if (!snapshot) {
      return { data: null, capturedAt: null, stale: false, staleDays: 0 };
    }
    const staleDays = differenceInDays(requestedDate, snapshot.capturedAt);
    return {
      data:       snapshot,
      capturedAt: snapshot.capturedAt,
      stale:      staleDays > 0,
      staleDays,
    };
  }

  private compareStatus(
    current: EquipmentStatus,
    previous: EquipmentStatus,
  ): 'improved' | 'same' | 'worsened' | 'unknown' {
    if (previous === 'no-data') return 'unknown';
    const rank: Record<EquipmentStatus, number> = {
      'operative': 0, 'degraded': 1, 'critical': 2, 'no-data': 3,
    };
    if (rank[current] < rank[previous]) return 'improved';
    if (rank[current] > rank[previous]) return 'worsened';
    return 'same';
  }

  private buildSummary(items: EquipmentHeatMapItem[]) {
    return {
      total:             items.length,
      operative:         items.filter(i => i.status === 'operative').length,
      degraded:          items.filter(i => i.status === 'degraded').length,
      critical:          items.filter(i => i.status === 'critical').length,
      noData:            items.filter(i => i.status === 'no-data').length,
      withSecurityRisk:  items.filter(i => i.hasSecurityRisk).length,
      withRiskySoftware: items.filter(i => i.riskyAppsCount > 0).length,
      obsolete:          items.filter(i => i.isObsolete).length,
    };
  }
}
