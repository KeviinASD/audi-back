// governance/governance.service.ts

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovernanceThreshold } from './entities/governance-threshold.entity';
import { THRESHOLD_CATALOG, SEVERITY_MATRIX } from './catalogs/threshold-catalog';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { ApproveThresholdDto } from './dto/approve-threshold.dto';

/** Metadatos de presentación de cada categoría, para que el frontend no los invente. */
const CATEGORY_META: Record<string, { label: string; description: string; order: number }> = {
  patches: {
    label: 'Actualizaciones del sistema',
    description: 'Qué tan al día está el sistema operativo frente a vulnerabilidades conocidas.',
    order: 1,
  },
  antimalware: {
    label: 'Protección antimalware',
    description: 'Presencia, estado y vigencia de la protección contra software malicioso.',
    order: 2,
  },
  firewall: {
    label: 'Firewall y superficie de ataque',
    description: 'Servicios expuestos y controles de red activos en el equipo.',
    order: 3,
  },
  passwords: {
    label: 'Contraseñas y cuentas',
    description: 'Política de credenciales y control de cuentas administrativas locales.',
    order: 4,
  },
  hardware: {
    label: 'Activos y hardware',
    description: 'Vida útil, estado físico y salud predictiva de los componentes.',
    order: 5,
  },
  performance: {
    label: 'Rendimiento y capacidad',
    description: 'Consumo de recursos y condiciones operativas del equipo.',
    order: 6,
  },
  software: {
    label: 'Software y licenciamiento',
    description: 'Control de lo instalado y cumplimiento de derechos de uso.',
    order: 7,
  },
  operations: {
    label: 'Operación y trazabilidad',
    description: 'Cobertura del inventario y continuidad del monitoreo.',
    order: 8,
  },
};

@Injectable()
export class GovernanceService implements OnModuleInit {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    @InjectRepository(GovernanceThreshold)
    private readonly thresholdRepo: Repository<GovernanceThreshold>,
  ) {}

  /**
   * Siembra el catálogo base la primera vez. Sólo inserta los códigos
   * que faltan: nunca pisa un umbral que el auditor ya editó o aprobó.
   */
  async onModuleInit() {
    const existingCodes = new Set(
      (await this.thresholdRepo.find({ select: { code: true } })).map(t => t.code),
    );

    const missing = THRESHOLD_CATALOG.filter(t => !existingCodes.has(t.code));

    if (missing.length === 0) {
      this.logger.log(`Catálogo de umbrales completo (${existingCodes.size} registros).`);
      return;
    }

    await this.thresholdRepo.save(
      missing.map(seed => this.thresholdRepo.create({ ...seed, isActive: true })),
    );

    this.logger.log(`✅ ${missing.length} umbrales de gobierno sembrados.`);
  }

  // ── Consulta ────────────────────────────────────────────────────

  async findAll(): Promise<GovernanceThreshold[]> {
    return this.thresholdRepo.find({ order: { category: 'ASC', code: 'ASC' } });
  }

  async findOne(id: number): Promise<GovernanceThreshold> {
    const threshold = await this.thresholdRepo.findOne({ where: { id } });
    if (!threshold) {
      throw new NotFoundException(`No existe el umbral con id ${id}`);
    }
    return threshold;
  }

  /**
   * Devuelve los umbrales agrupados por categoría, con los metadatos
   * de presentación resueltos. El frontend renderiza sin traducir nada.
   */
  async findGrouped() {
    const thresholds = await this.findAll();

    const groups = Object.entries(CATEGORY_META)
      .map(([key, meta]) => ({
        category: key,
        label: meta.label,
        description: meta.description,
        order: meta.order,
        thresholds: thresholds.filter(t => t.category === key),
      }))
      .filter(group => group.thresholds.length > 0)
      .sort((a, b) => a.order - b.order);

    return { summary: this.buildSummary(thresholds), groups };
  }

  /** Matriz de severidad: el criterio humano que reemplaza al del modelo de IA. */
  getSeverityMatrix() {
    return SEVERITY_MATRIX;
  }

  // ── Mutación ────────────────────────────────────────────────────

  async update(id: number, dto: UpdateThresholdDto): Promise<GovernanceThreshold> {
    const threshold = await this.findOne(id);

    // Cambiar un umbral invalida su aprobación previa: lo decidido
    // ya no es lo vigente, y eso debe volver a aprobarse.
    const redefinesPolicy =
      (dto.value !== undefined && dto.value !== threshold.value) ||
      (dto.operator !== undefined && dto.operator !== threshold.operator) ||
      (dto.severityOnBreach !== undefined && dto.severityOnBreach !== threshold.severityOnBreach);

    Object.assign(threshold, dto);

    if (redefinesPolicy) {
      threshold.approvedBy = null;
      threshold.approvedAt = null;
    }

    return this.thresholdRepo.save(threshold);
  }

  async approve(id: number, dto: ApproveThresholdDto): Promise<GovernanceThreshold> {
    const threshold = await this.findOne(id);
    threshold.approvedBy = dto.approvedBy;
    threshold.approvedAt = new Date();
    return this.thresholdRepo.save(threshold);
  }

  // ── Interno ─────────────────────────────────────────────────────

  private buildSummary(thresholds: GovernanceThreshold[]) {
    const active = thresholds.filter(t => t.isActive);
    const approved = active.filter(t => !!t.approvedAt);

    return {
      total: thresholds.length,
      active: active.length,
      approved: approved.length,
      pendingApproval: active.length - approved.length,
      approvalRate: active.length === 0
        ? 0
        : Math.round((approved.length / active.length) * 100),
      bySeverity: {
        critical: active.filter(t => t.severityOnBreach === 'critical').length,
        high:     active.filter(t => t.severityOnBreach === 'high').length,
        medium:   active.filter(t => t.severityOnBreach === 'medium').length,
        low:      active.filter(t => t.severityOnBreach === 'low').length,
      },
      cobitObjectives: [...new Set(active.map(t => t.cobitObjective))].sort(),
    };
  }
}
