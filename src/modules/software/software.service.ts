// software/software.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { SoftwareInstalled } from './entities/software-installed.entity';
import { AuthorizedSoftware } from './entities/authorized-software.entity';
import { SoftwareSnapshotDto, SoftwareItemDto } from './dto/software-snapshot.dto';
import { CreateAuthorizedSoftwareDto } from './dto/create-authorized-software.dto';
import { Equipment } from '../equipos/entities/equipment.entity';
import { LicenseStatus } from 'src/common/enums/license-status.enum';

@Injectable()
export class SoftwareService {

  constructor(
    @InjectRepository(SoftwareInstalled)
    private readonly installedRepo: Repository<SoftwareInstalled>,
    @InjectRepository(AuthorizedSoftware)
    private readonly authorizedRepo: Repository<AuthorizedSoftware>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: SoftwareSnapshotDto,
    capturedAt: Date,
  ): Promise<SoftwareInstalled[]> {

    const whitelist = await this.authorizedRepo.find({ where: { isActive: true } });

    const records = dto.items.map(item => {
      const isWhitelisted = this.checkWhitelist(item.name, whitelist);
      const isRisk        = this.calculateRisk(item, isWhitelisted);

      return this.installedRepo.create({
        equipment,
        capturedAt,
        name:          item.name,
        version:       item.version ?? null,
        publisher:     item.publisher ?? null,
        installedAt:   item.installedAt ? new Date(item.installedAt) : null,
        licenseStatus: item.licenseStatus ?? LicenseStatus.UNKNOWN,
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
      name:        dto.name,
      publisher:   dto.publisher ?? null,
      description: dto.description ?? null,
      laboratory:  dto.laboratoryId ? { id: dto.laboratoryId } as any : null,
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

    // Solo es riesgo si lleva más de 4 meses instalado
    const daysInstalled = differenceInDays(new Date(), new Date(item.installedAt));
    return daysInstalled > 120;
  }
}