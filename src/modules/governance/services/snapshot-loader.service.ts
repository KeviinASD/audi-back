// governance/services/snapshot-loader.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { HardwareSnapshot } from 'src/modules/hardware/entities/hardware-snapshot.entity';
import { SecuritySnapshot } from 'src/modules/security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from 'src/modules/performance/entities/performance-snapshot.entity';
import { SoftwareInstalled } from 'src/modules/software/entities/software-installed.entity';
import type { SnapshotBundle } from './field-resolvers';

/**
 * Carga la última captura de cada tipo para MUCHOS equipos con un número
 * fijo de consultas (4), en vez de 5 por equipo.
 *
 * Por qué importa: la base es remota y cada ida y vuelta cuesta ~0.7s.
 * Con 20 equipos, el enfoque de 5 consultas por equipo son ~100 viajes
 * (~70 segundos) y el navegador cancela la petición mucho antes.
 * Acá son 4 viajes, sin importar cuántos equipos haya.
 *
 * Se usa SQL crudo porque `DISTINCT ON` (PostgreSQL) resuelve
 * "la fila más reciente por grupo" en una sola pasada, y el query builder
 * de TypeORM no expone la columna FK (`equipment_id`) como propiedad.
 *
 * Las columnas del resultado coinciden con las propiedades de la entidad:
 * ninguna declara `name` en su @Column, así que TypeORM usa el nombre de
 * la propiedad tal cual.
 */
@Injectable()
export class SnapshotLoaderService {
  private readonly logger = new Logger(SnapshotLoaderService.name);

  constructor(
    @InjectRepository(HardwareSnapshot)
    private readonly hardwareRepo: Repository<HardwareSnapshot>,
    @InjectRepository(SecuritySnapshot)
    private readonly securityRepo: Repository<SecuritySnapshot>,
    @InjectRepository(PerformanceSnapshot)
    private readonly performanceRepo: Repository<PerformanceSnapshot>,
    @InjectRepository(SoftwareInstalled)
    private readonly softwareRepo: Repository<SoftwareInstalled>,
  ) {}

  async loadBundles(equipments: Equipment[]): Promise<Map<number, SnapshotBundle>> {
    const ids = equipments.map(e => e.id);

    const bundles = new Map<number, SnapshotBundle>(
      equipments.map(equipment => [
        equipment.id,
        {
          equipment,
          hardware: null,
          security: null,
          performance: null,
          software: [],
          softwareCapturedAt: null,
        },
      ]),
    );

    if (ids.length === 0) return bundles;

    const started = Date.now();

    // 4 consultas en paralelo — son pocas, el pool las absorbe sin problema.
    const [security, hardware, performance, software] = await Promise.all([
      this.latestPerEquipment<SecuritySnapshot>(this.securityRepo, 'security_snapshots', ids),
      this.latestPerEquipment<HardwareSnapshot>(this.hardwareRepo, 'hardware_snapshots', ids),
      this.latestPerEquipment<PerformanceSnapshot>(this.performanceRepo, 'performance_snapshots', ids),
      this.latestSoftwareRows(ids),
    ]);

    for (const row of security) {
      const bundle = bundles.get(row.equipment_id);
      if (bundle) bundle.security = row as unknown as SecuritySnapshot;
    }
    for (const row of hardware) {
      const bundle = bundles.get(row.equipment_id);
      if (bundle) bundle.hardware = row as unknown as HardwareSnapshot;
    }
    for (const row of performance) {
      const bundle = bundles.get(row.equipment_id);
      if (bundle) bundle.performance = row as unknown as PerformanceSnapshot;
    }
    for (const row of software) {
      const bundle = bundles.get(row.equipment_id);
      if (!bundle) continue;
      bundle.software.push(row as unknown as SoftwareInstalled);
      if (!bundle.softwareCapturedAt) bundle.softwareCapturedAt = row.capturedAt;
    }

    this.logger.log(
      `Capturas de ${ids.length} equipos cargadas en 4 consultas (${Date.now() - started} ms).`,
    );

    return bundles;
  }

  /** La fila más reciente de cada equipo, en una sola consulta. */
  private latestPerEquipment<T>(
    repo: Repository<any>,
    table: string,
    ids: number[],
  ): Promise<Array<T & { equipment_id: number; capturedAt: Date }>> {
    return repo.query(
      `SELECT DISTINCT ON (equipment_id) *
         FROM ${table}
        WHERE equipment_id = ANY($1::int[])
        ORDER BY equipment_id, "capturedAt" DESC`,
      [ids],
    );
  }

  /**
   * El software es una lista: se necesitan TODAS las filas de la última
   * captura de cada equipo, no una sola. Se resuelve con un join contra
   * el máximo `capturedAt` por equipo.
   */
  private latestSoftwareRows(
    ids: number[],
  ): Promise<Array<SoftwareInstalled & { equipment_id: number }>> {
    return this.softwareRepo.query(
      `SELECT s.*
         FROM software_installed s
         JOIN (
           SELECT equipment_id, MAX("capturedAt") AS latest
             FROM software_installed
            WHERE equipment_id = ANY($1::int[])
            GROUP BY equipment_id
         ) l
           ON l.equipment_id = s.equipment_id
          AND l.latest = s."capturedAt"`,
      [ids],
    );
  }
}
