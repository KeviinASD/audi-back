// software/software.service.ts

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { SoftwareInstalled } from './entities/software-installed.entity';
import { AuthorizedSoftware } from './entities/authorized-software.entity';
import { SoftwareSnapshotDto, SoftwareItemDto } from './dto/software-snapshot.dto';
import { CreateAuthorizedSoftwareDto } from './dto/create-authorized-software.dto';
import { Equipment } from '../equipos/entities/equipment.entity';
import { LicenseStatus } from 'src/common/enums/license-status.enum';
import { checkLicenseStatus } from './catalogs/license-catalog';

@Injectable()
export class SoftwareService implements OnApplicationBootstrap {

  private readonly logger = new Logger(SoftwareService.name);

  constructor(
    @InjectRepository(SoftwareInstalled)
    private readonly installedRepo: Repository<SoftwareInstalled>,
    @InjectRepository(AuthorizedSoftware)
    private readonly authorizedRepo: Repository<AuthorizedSoftware>,
  ) { }

  // ── Startup backfills ─────────────────────────────────────────
  // Comentar cada línea una vez que los datos queden sincronizados.

  onApplicationBootstrap(): void {
    // this.backfillLicenseStatus().catch(err => this.logger.error('backfill licenseStatus failed', err));
    // this.backfillIsRisk().catch(err => this.logger.error('backfill isRisk failed', err));
  }

  private async backfillLicenseStatus(): Promise<void> {
    const BATCH = 500;
    let offset = 0;

    // Agrupa los IDs que necesitan cambiar por status destino
    const byStatus = new Map<LicenseStatus, number[]>();

    while (true) {
      const batch = await this.installedRepo.find({
        select: ['id', 'name', 'publisher', 'licenseStatus'],
        skip: offset,
        take: BATCH,
      });

      if (!batch.length) break;

      for (const record of batch) {
        const correct = checkLicenseStatus(record.name, record.publisher);
        if (record.licenseStatus !== correct) {
          const ids = byStatus.get(correct) ?? [];
          ids.push(record.id);
          byStatus.set(correct, ids);
        }
      }

      if (batch.length < BATCH) break;
      offset += BATCH;
    }

    if (!byStatus.size) {
      this.logger.log('SoftwareInstalled backfill: already up to date.');
      return;
    }

    // Un UPDATE por grupo de status — mucho más eficiente que save() individual
    let updated = 0;
    for (const [status, ids] of byStatus.entries()) {
      await this.installedRepo.update({ id: In(ids) }, { licenseStatus: status });
      updated += ids.length;
    }

    this.logger.log(`SoftwareInstalled backfill: ${updated} records updated.`);
  }

  private async backfillIsRisk(): Promise<void> {
    const BATCH = 500;
    let offset = 0;
    const toTrue: number[] = [];
    const toFalse: number[] = [];

    while (true) {
      const batch = await this.installedRepo.find({
        select: ['id', 'installedAt', 'isWhitelisted', 'isRisk'],
        skip: offset,
        take: BATCH,
      });

      if (!batch.length) break;

      for (const record of batch) {
        const correct = this.riskFromRecord(record.installedAt, record.isWhitelisted);
        if (record.isRisk !== correct) {
          (correct ? toTrue : toFalse).push(record.id);
        }
      }

      if (batch.length < BATCH) break;
      offset += BATCH;
    }

    if (toTrue.length) await this.installedRepo.update({ id: In(toTrue) }, { isRisk: true });
    if (toFalse.length) await this.installedRepo.update({ id: In(toFalse) }, { isRisk: false });

    const updated = toTrue.length + toFalse.length;
    if (!updated) {
      this.logger.log('isRisk backfill: already up to date.');
    } else {
      this.logger.log(`isRisk backfill: ${updated} records updated (→risk: ${toTrue.length}, →safe: ${toFalse.length}).`);
    }
  }

  private riskFromRecord(installedAt: Date | null, isWhitelisted: boolean): boolean {
    if (isWhitelisted) return false;
    if (!installedAt) return true;
    return differenceInDays(new Date(), installedAt) > 180;
  }

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: SoftwareSnapshotDto,
    capturedAt: Date,
  ): Promise<SoftwareInstalled[]> {

    const whitelist = await this.authorizedRepo.find({ where: { isActive: true } });

    const records = dto.items.map(item => {
      const isWhitelisted = this.checkWhitelist(item.name, whitelist);
      const licenseStatus = checkLicenseStatus(item.name, item.publisher);
      const isRisk = this.calculateRisk(item, isWhitelisted);

      return this.installedRepo.create({
        equipment,
        capturedAt,
        name: item.name,
        version: item.version ?? null,
        publisher: item.publisher ?? null,
        installedAt: item.installedAt ? new Date(item.installedAt) : null,
        licenseStatus,
        isWhitelisted,
        isRisk,
      });
    });

    return this.installedRepo.save(records);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: number): Promise<SoftwareInstalled[]> {
    const latest = await this.installedRepo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });

    if (!latest) return [];

    return this.installedRepo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: latest.capturedAt,
      },
    });
  }

  async getSnapshotHistory(equipmentId: number) {
    const records = await this.installedRepo.find({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC', name: 'ASC' },
    });

    if (!records.length) return [];

    // Agrupar por capturedAt — cada fecha única representa un sync distinto
    const grouped = new Map<string, SoftwareInstalled[]>();
    for (const record of records) {
      const key = record.capturedAt.toISOString();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    }

    return Array.from(grouped.entries()).map(([capturedAt, items]) => ({
      capturedAt,
      totalItems: items.length,
      riskyCount: items.filter(i => i.isRisk).length,
      unlicensedCount: items.filter(i => i.licenseStatus === LicenseStatus.UNLICENSED).length,
      items,
    }));
  }

  async getRiskyByEquipment(equipmentId: number): Promise<SoftwareInstalled[]> {
    return this.installedRepo.find({
      where: { equipment: { id: equipmentId }, isRisk: true },
      order: { capturedAt: 'DESC' },
    });
  }

  async getAllRisky(): Promise<SoftwareInstalled[]> {
    return this.installedRepo.find({
      where: { isRisk: true },
      relations: ['equipment'],
      order: { capturedAt: 'DESC' },
    });
  }

  async getUnlicensed(): Promise<SoftwareInstalled[]> {
    return this.installedRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.equipment', 'equipment')
      .where('si.is_whitelisted = false')
      .andWhere('si.is_risk = true')
      .distinctOn(['si.name'])
      .orderBy('si.name')
      .getMany();
  }

  // ── Whitelist CRUD ────────────────────────────────────────────

  async getWhitelist(): Promise<AuthorizedSoftware[]> {
    return this.authorizedRepo.find({ where: { isActive: true } });
  }

  async addToWhitelist(dto: CreateAuthorizedSoftwareDto): Promise<AuthorizedSoftware> {
    const entry = this.authorizedRepo.create({
      name: dto.name,
      publisher: dto.publisher ?? null,
      description: dto.description ?? null,
      laboratory: dto.laboratoryId ? { id: dto.laboratoryId } as any : null,
    });
    return this.authorizedRepo.save(entry);
  }

  async removeFromWhitelist(id: string): Promise<void> {
    await this.authorizedRepo.update(id, { isActive: false });
  }

  // ── Lógica interna ────────────────────────────────────────────

  private checkWhitelist(name: string, whitelist: AuthorizedSoftware[]): boolean {
    const nameLower = name.toLowerCase();
    return whitelist.some(entry =>
      nameLower.includes(entry.name.toLowerCase()),
    );
  }

  private calculateRisk(item: SoftwareItemDto, isWhitelisted: boolean): boolean {
    if (isWhitelisted) return false;

    // Sin fecha de instalación → riesgo por defecto
    if (!item.installedAt) return true;

    // Solo es riesgo si lleva más de 8 meses instalado
    const daysInstalled = differenceInDays(new Date(), new Date(item.installedAt));
    return daysInstalled > 240;
  }
}
