// dev/dev.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Equipment } from '../equipos/entities/equipment.entity';
import { HardwareSnapshot } from '../hardware/entities/hardware-snapshot.entity';
import { SoftwareInstalled } from '../software/entities/software-installed.entity';
import { SecuritySnapshot } from '../security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from '../performance/entities/performance-snapshot.entity';

export interface CloneResult {
  sourceSnapshot: string;
  hardware: number;
  software: number;
  security: number;
  performance: number;
}

@Injectable()
export class DevService {

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
  ) { }

  async cloneSnapshots(
    sourceEquipmentId: number,
    sourceDateTimeStr: string,
    targetEquipmentId: number,
    targetDateTimeStr: string,
  ): Promise<CloneResult> {

    const [source, target] = await Promise.all([
      this.equipmentRepo.findOne({ where: { id: sourceEquipmentId } }),
      this.equipmentRepo.findOne({ where: { id: targetEquipmentId } }),
    ]);
    if (!source) throw new NotFoundException(`Source equipment ${sourceEquipmentId} not found`);
    if (!target) throw new NotFoundException(`Target equipment ${targetEquipmentId} not found`);

    // Parsear como UTC: si no tiene Z, se la agregamos
    const toUtc = (s: string) => new Date(s.includes('Z') || s.includes('+') ? s : s + 'Z');
    const sourceTs = toUtc(sourceDateTimeStr);
    const targetTs = toUtc(targetDateTimeStr);

    // Ventana de ±2 minutos alrededor del datetime origen para encontrar el snapshot exacto
    const windowFrom = new Date(sourceTs.getTime() - 2 * 60 * 1000);
    const windowTo = new Date(sourceTs.getTime() + 2 * 60 * 1000);

    // Primero resolvemos el capturedAt exacto usando hardware como referencia
    // (si no hay hardware, usamos security, etc.)
    const refSnap = await this.hardwareRepo.findOne({
      where: { equipment: { id: sourceEquipmentId }, capturedAt: Between(windowFrom, windowTo) },
      order: { capturedAt: 'ASC' },
    }) ?? await this.securityRepo.findOne({
      where: { equipment: { id: sourceEquipmentId }, capturedAt: Between(windowFrom, windowTo) },
      order: { capturedAt: 'ASC' },
    });

    if (!refSnap) {
      throw new NotFoundException(
        `No snapshot found for equipment ${sourceEquipmentId} near ${sourceDateTimeStr} (±2 min)`,
      );
    }

    const exactCapturedAt = refSnap.capturedAt;

    // Buscar todos los registros con ese capturedAt exacto
    const [hw, sw, sec, perf] = await Promise.all([
      this.hardwareRepo.find({
        where: { equipment: { id: sourceEquipmentId }, capturedAt: exactCapturedAt as any },
      }),
      this.softwareRepo.find({
        where: { equipment: { id: sourceEquipmentId }, capturedAt: exactCapturedAt as any },
      }),
      this.securityRepo.find({
        where: { equipment: { id: sourceEquipmentId }, capturedAt: exactCapturedAt as any },
      }),
      this.performanceRepo.find({
        where: { equipment: { id: sourceEquipmentId }, capturedAt: exactCapturedAt as any },
      }),
    ]);

    // Clonar — reemplaza equipment y capturedAt, descarta id y createdAt
    const newHw = hw.map(({ id: _id, createdAt: _c, equipment: _e, capturedAt: _t, ...rest }) =>
      this.hardwareRepo.create({ ...rest, equipment: target, capturedAt: targetTs }),
    );
    const newSec = sec.map(({ id: _id, createdAt: _c, equipment: _e, capturedAt: _t, ...rest }) =>
      this.securityRepo.create({ ...rest, equipment: target, capturedAt: targetTs }),
    );
    const newPerf = perf.map(({ id: _id, createdAt: _c, equipment: _e, capturedAt: _t, ...rest }) =>
      this.performanceRepo.create({ ...rest, equipment: target, capturedAt: targetTs }),
    );
    const newSw = sw.map(({ id: _id, createdAt: _c, equipment: _e, capturedAt: _t, ...rest }) =>
      this.softwareRepo.create({ ...rest, equipment: target, capturedAt: targetTs }),
    );

    await Promise.all([
      newHw.length ? this.hardwareRepo.save(newHw) : Promise.resolve(),
      newSec.length ? this.securityRepo.save(newSec) : Promise.resolve(),
      newPerf.length ? this.performanceRepo.save(newPerf) : Promise.resolve(),
      newSw.length ? this.softwareRepo.save(newSw) : Promise.resolve(),
    ]);

    return {
      sourceSnapshot: exactCapturedAt.toISOString(),
      hardware: newHw.length,
      software: newSw.length,
      security: newSec.length,
      performance: newPerf.length,
    };
  }
}
