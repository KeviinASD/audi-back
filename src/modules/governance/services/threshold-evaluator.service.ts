// governance/services/threshold-evaluator.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { GovernanceThreshold } from '../entities/governance-threshold.entity';
import { SnapshotLoaderService } from './snapshot-loader.service';
import {
  FIELD_RESOLVERS, daysSince,
  type SnapshotBundle, type ResolvedValue, type EvidenceSource,
} from './field-resolvers';

export type ComplianceStatus = 'compliant' | 'breached' | 'no-data' | 'not-evaluable';

/**
 * Antigüedad máxima de una captura para que su veredicto se considere vigente.
 * Alineado con UMB-OPE-01 (7 días sin sincronizar).
 */
const STALE_AFTER_DAYS = 7;

export interface ThresholdEvaluation {
  thresholdId: number;
  code: string;
  label: string;
  category: string;
  field: string;

  status: ComplianceStatus;
  actual: string;
  expected: string;
  message: string;
  detail?: string;

  /** De qué captura salió el dato y de cuándo es. Sin fecha no hay evidencia. */
  evidenceSource: EvidenceSource;
  evidenceDate: Date | null;
  evidenceAgeDays: number | null;
  /** El dato existe pero es viejo: el veredicto describe el pasado, no el presente. */
  isStale: boolean;

  severityOnBreach: string;
  cobitObjective: string;
  isoClause: string | null;
  isApproved: boolean;
}

export interface DataFreshness {
  security: Date | null;
  hardware: Date | null;
  performance: Date | null;
  software: Date | null;
  /** La más reciente de todas: cuándo se supo algo de este equipo. */
  mostRecent: Date | null;
  ageDays: number | null;
  isStale: boolean;
}

export interface EquipmentCompliance {
  equipment: {
    id: number;
    code: string;
    name: string;
    lastConnection: Date | null;
  };
  freshness: DataFreshness;
  summary: ComplianceSummary;
  evaluations: ThresholdEvaluation[];
}

export interface ComplianceSummary {
  evaluated: number;
  compliant: number;
  breached: number;
  noData: number;
  stale: number;
  complianceRate: number;
  breachesBySeverity: Record<string, number>;
}

@Injectable()
export class ThresholdEvaluatorService {
  private readonly logger = new Logger(ThresholdEvaluatorService.name);

  constructor(
    @InjectRepository(GovernanceThreshold)
    private readonly thresholdRepo: Repository<GovernanceThreshold>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    private readonly snapshotLoader: SnapshotLoaderService,
  ) {}

  // ── API pública ─────────────────────────────────────────────────

  async evaluateEquipment(equipmentId: number): Promise<EquipmentCompliance> {
    const equipment = await this.equipmentRepo.findOne({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`No existe el equipo con id ${equipmentId}`);
    }

    const [thresholds, bundles] = await Promise.all([
      this.getActiveThresholds(),
      this.snapshotLoader.loadBundles([equipment]),
    ]);

    const bundle = bundles.get(equipment.id)!;
    return this.buildCompliance(equipment, bundle, thresholds);
  }

  /**
   * Cumplimiento agregado de todo el parque.
   *
   * Coste fijo: 2 consultas de catálogo + 4 de capturas = 6 en total,
   * sin importar cuántos equipos haya. La evaluación en sí es CPU pura.
   */
  async evaluateAll() {
    const started = Date.now();

    const [thresholds, equipments] = await Promise.all([
      this.getActiveThresholds(),
      this.equipmentRepo.find({ where: { isActive: true }, order: { code: 'ASC' } }),
    ]);

    const bundles = await this.snapshotLoader.loadBundles(equipments);

    const evaluated: EquipmentCompliance[] = [];
    let skipped = 0;

    for (const equipment of equipments) {
      const bundle = bundles.get(equipment.id);
      if (!bundle) { skipped++; continue; }
      try {
        evaluated.push(this.buildCompliance(equipment, bundle, thresholds));
      } catch (error) {
        // Un equipo con datos corruptos no puede tumbar el reporte entero.
        this.logger.error(
          `Fallo al evaluar el equipo ${equipment.code} (id ${equipment.id})`,
          error instanceof Error ? error.stack : String(error),
        );
        skipped++;
      }
    }

    this.logger.log(
      `Cumplimiento de ${evaluated.length} equipos × ${thresholds.length} umbrales ` +
      `en ${Date.now() - started} ms.`,
    );

    return {
      summary: { ...this.summarizePark(evaluated), skipped },
      byThreshold: this.summarizeByThreshold(thresholds, evaluated),
      equipments: evaluated,
    };
  }

  // ── Construcción del resultado ──────────────────────────────────

  private buildCompliance(
    equipment: Equipment,
    bundle: SnapshotBundle,
    thresholds: GovernanceThreshold[],
  ): EquipmentCompliance {
    const freshness = this.buildFreshness(bundle);
    const evaluations = thresholds.map(t => this.evaluate(t, bundle));

    return {
      equipment: {
        id: equipment.id,
        code: equipment.code,
        name: equipment.name,
        lastConnection: equipment.lastConnection ?? null,
      },
      freshness,
      summary: this.summarize(evaluations),
      evaluations,
    };
  }

  private buildFreshness(bundle: SnapshotBundle): DataFreshness {
    const dates = {
      security:    bundle.security?.capturedAt ?? null,
      hardware:    bundle.hardware?.capturedAt ?? null,
      performance: bundle.performance?.capturedAt ?? null,
      software:    bundle.softwareCapturedAt,
    };

    const timestamps = Object.values(dates)
      .filter((d): d is Date => !!d)
      .map(d => new Date(d).getTime());

    const mostRecent = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
    const ageDays = daysSince(mostRecent);

    return {
      ...dates,
      mostRecent,
      ageDays,
      isStale: ageDays !== null && ageDays > STALE_AFTER_DAYS,
    };
  }

  // ── Evaluación ──────────────────────────────────────────────────

  private evaluate(
    threshold: GovernanceThreshold,
    bundle: SnapshotBundle,
  ): ThresholdEvaluation {

    const resolver = FIELD_RESOLVERS[threshold.field];
    const evidenceDate = resolver ? this.evidenceDateFor(resolver.source, bundle) : null;
    const evidenceAgeDays = daysSince(evidenceDate);

    const base = {
      thresholdId: threshold.id,
      code: threshold.code,
      label: threshold.label,
      category: threshold.category,
      field: threshold.field,
      expected: this.describeExpected(threshold),
      evidenceSource: resolver?.source ?? ('equipment' as EvidenceSource),
      evidenceDate,
      evidenceAgeDays,
      isStale: evidenceAgeDays !== null && evidenceAgeDays > STALE_AFTER_DAYS,
      severityOnBreach: threshold.severityOnBreach,
      cobitObjective: threshold.cobitObjective,
      isoClause: threshold.isoClause,
      isApproved: !!threshold.approvedAt,
    };

    // Umbral declarado sobre un campo que ningún resolutor sabe leer.
    // Se reporta explícitamente en vez de fingir que cumple.
    if (!resolver) {
      return {
        ...base,
        status: 'not-evaluable',
        actual: '—',
        message: `El campo "${threshold.field}" todavía no tiene resolutor implementado.`,
      };
    }

    const resolved = resolver.resolve(bundle);

    if (!resolved.available) {
      return {
        ...base,
        status: 'no-data',
        actual: resolved.display,
        message: 'El agente no reportó este dato. Es un punto ciego, no un cumplimiento.',
        detail: resolved.detail,
      };
    }

    const compliant = this.compare(threshold, resolved);
    const staleNote = base.isStale
      ? ` Atención: la evidencia tiene ${evidenceAgeDays} días — describe el pasado, no el estado actual.`
      : '';

    return {
      ...base,
      status: compliant ? 'compliant' : 'breached',
      actual: resolved.display,
      message: (compliant
        ? `${resolved.display} — dentro de lo aceptado (${base.expected}).`
        : `${resolved.display} — incumple: se exige ${base.expected}.`) + staleNote,
      detail: resolved.detail,
    };
  }

  private evidenceDateFor(source: EvidenceSource, bundle: SnapshotBundle): Date | null {
    switch (source) {
      case 'security':    return bundle.security?.capturedAt ?? null;
      case 'hardware':    return bundle.hardware?.capturedAt ?? null;
      case 'performance': return bundle.performance?.capturedAt ?? null;
      case 'software':    return bundle.softwareCapturedAt;
      case 'equipment':   return bundle.equipment.lastConnection ?? null;
      default:            return null;
    }
  }

  private compare(threshold: GovernanceThreshold, resolved: ResolvedValue): boolean {
    const { operator, value } = threshold;
    const actual = resolved.raw;

    switch (operator) {
      case 'is_true':  return actual === true;
      case 'is_false': return actual === false;
      case 'eq':       return String(actual) === String(value);
      case 'neq':      return String(actual) !== String(value);
      case 'lte':
      case 'gte': {
        const actualNum   = Number(actual);
        const expectedNum = Number(value);
        if (!Number.isFinite(expectedNum)) return true;
        // Infinity aparece a propósito (bloqueo de cuenta en 0 = sin límite):
        // no es finito, así que nunca cumple un "menor o igual".
        if (Number.isNaN(actualNum)) return false;
        return operator === 'lte' ? actualNum <= expectedNum : actualNum >= expectedNum;
      }
      default: return true;
    }
  }

  private describeExpected(threshold: GovernanceThreshold): string {
    const { operator, value, unit } = threshold;
    const suffix = unit ? ` ${unit}` : '';

    switch (operator) {
      case 'lte':      return `máximo ${value}${suffix}`;
      case 'gte':      return `mínimo ${value}${suffix}`;
      case 'eq':       return `exactamente "${value}"`;
      case 'neq':      return `distinto de "${value}"`;
      case 'is_true':  return 'que esté activo';
      case 'is_false': return 'que esté desactivado';
      default:         return String(value ?? '—');
    }
  }

  // ── Carga de datos ──────────────────────────────────────────────

  private async getActiveThresholds(): Promise<GovernanceThreshold[]> {
    return this.thresholdRepo.find({
      where: { isActive: true },
      order: { category: 'ASC', code: 'ASC' },
    });
  }


  // ── Resúmenes ───────────────────────────────────────────────────

  private summarize(evaluations: ThresholdEvaluation[]): ComplianceSummary {
    const breached  = evaluations.filter(e => e.status === 'breached');
    const compliant = evaluations.filter(e => e.status === 'compliant');
    const noData    = evaluations.filter(e => e.status === 'no-data');

    // La tasa se calcula sólo sobre lo evaluable: contar un dato ausente
    // como cumplido inflaría el resultado y ocultaría el punto ciego.
    const evaluable = compliant.length + breached.length;

    return {
      evaluated: evaluations.length,
      compliant: compliant.length,
      breached: breached.length,
      noData: noData.length,
      stale: evaluations.filter(e => e.isStale && e.status !== 'no-data').length,
      complianceRate: evaluable === 0 ? 0 : Math.round((compliant.length / evaluable) * 100),
      breachesBySeverity: {
        critical: breached.filter(e => e.severityOnBreach === 'critical').length,
        high:     breached.filter(e => e.severityOnBreach === 'high').length,
        medium:   breached.filter(e => e.severityOnBreach === 'medium').length,
        low:      breached.filter(e => e.severityOnBreach === 'low').length,
      },
    };
  }

  private summarizePark(perEquipment: EquipmentCompliance[]) {
    const totals = perEquipment.reduce(
      (acc, e) => ({
        compliant: acc.compliant + e.summary.compliant,
        breached:  acc.breached  + e.summary.breached,
        noData:    acc.noData    + e.summary.noData,
        stale:     acc.stale     + e.summary.stale,
        critical:  acc.critical  + e.summary.breachesBySeverity.critical,
        high:      acc.high      + e.summary.breachesBySeverity.high,
        medium:    acc.medium    + e.summary.breachesBySeverity.medium,
        low:       acc.low       + e.summary.breachesBySeverity.low,
      }),
      { compliant: 0, breached: 0, noData: 0, stale: 0, critical: 0, high: 0, medium: 0, low: 0 },
    );

    const evaluable = totals.compliant + totals.breached;

    return {
      equipmentCount: perEquipment.length,
      staleEquipments: perEquipment.filter(e => e.freshness.isStale).length,
      compliant: totals.compliant,
      breached: totals.breached,
      noData: totals.noData,
      stale: totals.stale,
      complianceRate: evaluable === 0 ? 0 : Math.round((totals.compliant / evaluable) * 100),
      breachesBySeverity: {
        critical: totals.critical,
        high: totals.high,
        medium: totals.medium,
        low: totals.low,
      },
    };
  }

  /** Qué umbral falla en cuántos equipos — para priorizar dónde actuar. */
  private summarizeByThreshold(
    thresholds: GovernanceThreshold[],
    perEquipment: EquipmentCompliance[],
  ) {
    return thresholds
      .map((threshold) => {
        const results = perEquipment
          .map(e => e.evaluations.find(v => v.thresholdId === threshold.id))
          .filter((v): v is ThresholdEvaluation => !!v);

        const breached  = results.filter(r => r.status === 'breached').length;
        const compliant = results.filter(r => r.status === 'compliant').length;
        const evaluable = breached + compliant;

        return {
          thresholdId: threshold.id,
          code: threshold.code,
          label: threshold.label,
          category: threshold.category,
          severityOnBreach: threshold.severityOnBreach,
          cobitObjective: threshold.cobitObjective,
          breached,
          compliant,
          noData: results.filter(r => r.status === 'no-data').length,
          complianceRate: evaluable === 0 ? 0 : Math.round((compliant / evaluable) * 100),
        };
      })
      .sort((a, b) => b.breached - a.breached);
  }
}
