# Documentación Técnica — Módulo AuditAnalysis

Sistema de Auditoría Informática — Laboratorios EPIS UNT
Stack: NestJS · TypeORM · PostgreSQL · Anthropic Claude API

---

## Índice

1. [Visión general del módulo](#1-visión-general-del-módulo)
2. [Helper compartido — calculateEquipmentStatus](#2-helper-compartido--calculateequipmentstatus)
3. [Flujo completo de usuario](#3-flujo-completo-de-usuario)
4. [Entidades](#4-entidades)
5. [DTOs de respuesta](#5-dtos-de-respuesta)
6. [Servicio — Consolidador diario](#6-servicio--consolidador-diario)
7. [Servicio — Análisis IA](#7-servicio--análisis-ia)
8. [Servicio — Hallazgos](#8-servicio--hallazgos)
9. [Controlador](#9-controlador)
10. [Módulo NestJS](#10-módulo-nestjs)
11. [Estructura de carpetas](#11-estructura-de-carpetas)
12. [Ejemplos de respuesta](#12-ejemplos-de-respuesta)

> **Decisión de diseño — separación heat map / detalle:**
> `GET /audit-analysis/daily` retorna solo data liviana para renderizar el heat map
> (status + conteos). `GET /audit-analysis/equipment-detail` retorna los 4 snapshots
> completos de una PC y se llama únicamente al hacer click. Esto evita ejecutar
> 20 × 6 queries simultáneas en la carga inicial del laboratorio.

---

## 1. Visión general del módulo

El módulo `AuditAnalysis` es el núcleo analítico del sistema. Orquesta tres
responsabilidades:

```
AuditAnalysisModule
  ├── DailyConsolidatorService   → agrupa todos los snapshots del día por laboratorio
  ├── AiAnalysisService          → envía el contexto a Claude y procesa la respuesta
  └── FindingService             → persiste hallazgos en BD y permite gestionarlos
```

**Regla de lectura:** Este módulo solo **lee** de los módulos Hardware, Software,
Security y Performance. No escribe en sus tablas. Solo escribe en sus propias
tablas: `ai_audit_reports` y `audit_findings`.

**Regla de status histórico:** El `equipment.status` de la entidad refleja el
estado **actual** del equipo (calculado en el último sync). Para el heat map y
el detalle diario, el status se recalcula siempre desde los snapshots del día
consultado, garantizando fidelidad histórica.

---

## 2. Helper compartido — `calculateEquipmentStatus`

Esta función es la única fuente de verdad para calcular el estado de un equipo.
Se usa en dos lugares: `AgentService` al procesar un sync, y `DailyConsolidatorService`
al construir la vista histórica. Extraerla evita duplicar lógica y garantiza
consistencia entre el estado actual y el histórico.

```typescript
// shared/utils/equipment-status.util.ts

import { HardwareSnapshot } from '../../hardware/entities/hardware-snapshot.entity';
import { SecuritySnapshot } from '../../security/entities/security-snapshot.entity';

export type EquipmentStatus = 'operative' | 'degraded' | 'critical' | 'no-data';

export function calculateEquipmentStatus(
  hw: HardwareSnapshot | null,
  sec: SecuritySnapshot | null,
): EquipmentStatus {

  // Sin datos de ninguno de los dos módulos clave
  if (!hw && !sec) return 'no-data';

  // ── Crítico ──────────────────────────────────────────────────
  const criticalTemp = (hw?.cpuTemperatureC ?? 0) > 85;
  const diskFailed   = hw?.diskSmartStatus === 'failed';
  const noAntivirus  = sec ? !sec.antivirusEnabled : false;
  const firewallOff  = sec ? !sec.firewallEnabled  : false;
  if (criticalTemp || diskFailed || noAntivirus || firewallOff) return 'critical';

  // ── Degradado ────────────────────────────────────────────────
  const highTemp       = (hw?.cpuTemperatureC ?? 0) > 70;
  const highRamUsage   = hw && hw.ramTotalGB > 0
    ? (hw.ramUsedGB / hw.ramTotalGB) > 0.90
    : false;
  const criticalUpdate = sec?.isCriticalUpdatePending ?? false;
  const longNoUpdate   = (sec?.daysSinceLastUpdate ?? 0) > 90;
  if (highTemp || highRamUsage || criticalUpdate || longNoUpdate) return 'degraded';

  return 'operative';
}
```

**Uso en `AgentService`** — reemplaza el método privado `calculateEquipmentStatus`:

```typescript
// agent/agent.service.ts
import { calculateEquipmentStatus } from '../shared/utils/equipment-status.util';

// ...dentro de processSync, modo full:
const newStatus = calculateEquipmentStatus(hardwareSnapshot, securitySnapshot);
await this.equipmentRepo.update(equipment.id, {
  lastConnection: capturedAt,
  status: newStatus,
});
```

---

## 3. Flujo completo de usuario

```
[Dashboard — auditor]
        │
        │  Selecciona: laboratoryId + date
        │
        ▼
GET /audit-analysis/daily                        ← carga liviana (heat map)
        │
        │  Solo retorna: status, conteos y flags por PC
        │  NO carga snapshots completos
        ▼
[Heat Map del laboratorio]
  ┌─────┬─────┬─────┬─────┬─────┐
  │ 🟢  │ 🟡  │ 🔴  │ 🟢  │ 🔴  │   ← PC01..PC05
  │ 🟢  │ 🟢  │ 🟡  │ ⚫  │ 🟢  │   ← PC06..PC10
  └─────┴─────┴─────┴─────┴─────┘
   🟢 operative  🟡 degraded  🔴 critical  ⚫ no-data
        │
        │  Click en una PC  →  navega a página de detalle
        ▼
GET /audit-analysis/equipment-detail             ← carga pesada (solo 1 PC)
        │
        │  Retorna los 4 snapshots completos + stale flags
        ▼
[Página de detalle — LAB01-PC05]
  ├── Hardware snapshot   (fecha: 2026-02-22 ✓ | stale: false)
  ├── Software snapshot   (fecha: 2026-02-22 ✓ | stale: false)
  ├── Security snapshot   (fecha: 2026-02-20 ⚠ | stale: true )
  └── Performance snapshot(fecha: 2026-02-22 ✓ | stale: false)
        │
        │  Botón "Analizar con IA"
        ▼
POST /audit-analysis/ai
        │
        │  Backend usa el detalle ya cargado como contexto
        │  Envía a Claude con prompt especializado en auditoría
        │  Claude responde con hallazgos mapeados a PS-HW/PS-SW
        ▼
[Resultado IA]
  ├── Resumen ejecutivo
  ├── Hallazgos críticos    → se auto-crean en audit_findings
  ├── Observaciones generales
  ├── Aspectos positivos
  └── Recomendaciones priorizadas
```

---

## 4. Entidades

### 3.1 `AiAuditReport`

Guarda el contexto enviado y la respuesta de la IA para trazabilidad y
comparación entre días.

```typescript
// audit-analysis/entities/ai-audit-report.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Laboratory } from '../../laboratories/entities/laboratory.entity';
import { Equipment } from '../../equipments/entities/equipment.entity';

@Entity('ai_audit_reports')
export class AiAuditReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Puede ser análisis de laboratorio completo o de una sola PC
  @Column()
  scope: string;                      // "laboratory" | "equipment"

  @ManyToOne(() => Laboratory, { nullable: true, eager: false })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory | null;

  @ManyToOne(() => Equipment, { nullable: true, eager: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment | null;

  @Column({ type: 'date' })
  auditDate: Date;                    // fecha analizada (filtro del dashboard)

  // Contexto JSON que se le envió a la IA (para auditoría y debug)
  @Column({ type: 'jsonb' })
  sentContext: object;

  // Respuesta estructurada de la IA
  @Column({ type: 'jsonb' })
  analysis: AiAnalysisResult;

  // Tokens consumidos (para control de costos)
  @Column({ default: 0 })
  tokensUsed: number;

  @CreateDateColumn()
  createdAt: Date;
}

// Estructura de la respuesta de la IA
export interface AiAnalysisResult {
  executiveSummary: string;
  criticalFindings: AiFinding[];
  generalObservations: string[];
  positiveAspects: string[];
  prioritizedRecommendations: string[];
}

export interface AiFinding {
  equipmentCode: string;
  finding: string;
  auditTest: string;                  // "PS-SW-01", "PS-HW-03", etc.
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}
```

### 3.2 `AuditFinding`

Hallazgos persistidos en BD. Pueden venir de la IA (auto-creados) o
ser ingresados manualmente por el auditor.

```typescript
// audit-analysis/entities/audit-finding.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Equipment } from '../../equipments/entities/equipment.entity';
import { Laboratory } from '../../laboratories/entities/laboratory.entity';
import { AiAuditReport } from './ai-audit-report.entity';

@Entity('audit_findings')
export class AuditFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, { nullable: false, eager: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @ManyToOne(() => Laboratory, { nullable: false, eager: false })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory;

  // Referencia al reporte IA que lo generó (null si fue manual)
  @ManyToOne(() => AiAuditReport, { nullable: true, eager: false })
  @JoinColumn({ name: 'ai_report_id' })
  aiReport: AiAuditReport | null;

  @Column({ type: 'date' })
  findingDate: Date;                  // fecha del snapshot analizado

  // Prueba del plan de auditoría a la que corresponde
  @Column()
  auditTest: string;                  // "PS-SW-01", "PS-HW-03", etc.

  @Column()
  title: string;                      // "Parche crítico pendiente"

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  severity: string;

  @Column({ type: 'text', nullable: true })
  recommendation: string;

  @Column({
    type: 'enum',
    enum: ['open', 'in-progress', 'resolved', 'accepted-risk'],
    default: 'open',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['ai-generated', 'manual'],
    default: 'ai-generated',
  })
  source: string;

  // Permite al auditor agregar notas sobre el hallazgo
  @Column({ type: 'text', nullable: true })
  auditorNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 5. DTOs de respuesta

### 5.1 Heat map — respuesta liviana por laboratorio

```typescript
// audit-analysis/dto/daily-analysis.dto.ts

// ── Respuesta liviana para el heat map ────────────────────────
// Solo lo necesario para renderizar cada celda del grid

export interface EquipmentHeatMapItem {
  equipment: {
    id: string;
    code: string;
    name: string;
    location: string;
  };
  // Status calculado desde snapshots históricos del día consultado
  status: 'operative' | 'degraded' | 'critical' | 'no-data';
  statusCompareToPrevDay: 'improved' | 'same' | 'worsened' | 'unknown';

  // Flags para íconos de advertencia en la celda del heat map
  isObsolete: boolean;
  hasSecurityRisk: boolean;
  riskyAppsCount: number;

  // Fecha del sync más reciente disponible hasta el día consultado
  lastSync: Date | null;
}

export interface DailyLaboratoryHeatMap {
  laboratory: {
    id: string;
    name: string;
    location: string;
  };
  date: string;
  summary: {
    total: number;
    operative: number;
    degraded: number;
    critical: number;
    noData: number;
    withSecurityRisk: number;
    withRiskySoftware: number;
    obsolete: number;
  };
  equipments: EquipmentHeatMapItem[];
}
```

### 5.2 Detalle completo — respuesta pesada por equipo

```typescript
// audit-analysis/dto/equipment-detail.dto.ts

export interface SnapshotRef<T> {
  data: T | null;
  capturedAt: Date | null;
  stale: boolean;       // true si el dato es de una fecha distinta a la solicitada
  staleDays: number;    // cuántos días de diferencia tiene el dato
}

export interface EquipmentDailyDetail {
  equipment: {
    id: string;
    code: string;
    name: string;
    location: string;
  };
  status: 'operative' | 'degraded' | 'critical' | 'no-data';
  statusCompareToPrevDay: 'improved' | 'same' | 'worsened' | 'unknown';

  // 4 snapshots completos con su metadata de frescura
  hardware:    SnapshotRef<any>;
  software:    SnapshotRef<any> & { riskyCount: number; totalCount: number };
  security:    SnapshotRef<any> & { hasRisk: boolean };
  performance: SnapshotRef<any>;
}
```

### 5.3 Request para análisis IA

```typescript
// audit-analysis/dto/ai-analysis-request.dto.ts

export class AiAnalysisRequestDto {
  equipmentId?: string;       // análisis de una PC específica
  laboratoryId?: string;      // análisis de laboratorio completo
  date: string;               // "2026-02-22"
  autoCreateFindings: boolean; // si true, auto-crea registros en audit_findings
}
```

---

## 6. Servicio — Consolidador diario

```typescript
// audit-analysis/services/daily-consolidator.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { differenceInDays, endOfDay, subDays } from 'date-fns';
import { Equipment } from '../../equipments/entities/equipment.entity';
import { HardwareSnapshot } from '../../hardware/entities/hardware-snapshot.entity';
import { SoftwareInstalled } from '../../software/entities/software-installed.entity';
import { SecuritySnapshot } from '../../security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from '../../performance/entities/performance-snapshot.entity';
import { DailyLaboratoryHeatMap, EquipmentHeatMapItem } from '../dto/daily-analysis.dto';
import { EquipmentDailyDetail, SnapshotRef } from '../dto/equipment-detail.dto';
import {
  calculateEquipmentStatus,
  EquipmentStatus,
} from '../../shared/utils/equipment-status.util';

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
  // Llamado por GET /audit-analysis/daily
  // Solo calcula status y flags por equipo, sin cargar snapshots completos

  async getDailyHeatMap(
    laboratoryId: string,
    date: Date,
  ): Promise<DailyLaboratoryHeatMap> {

    const equipments = await this.equipmentRepo.find({
      where: { laboratory: { id: laboratoryId }, isActive: true },
      relations: ['laboratory'],
    });

    if (!equipments.length) {
      throw new NotFoundException(`Laboratory ${laboratoryId} not found or has no active equipments`);
    }

    const laboratory = equipments[0].laboratory;
    const upTo        = endOfDay(date);
    const upToPrevDay = endOfDay(subDays(date, 1));

    const items = await Promise.all(
      equipments.map(eq => this.buildHeatMapItem(eq, date, upTo, upToPrevDay)),
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
    date: Date,
    upTo: Date,
    upToPrevDay: Date,
  ): Promise<EquipmentHeatMapItem> {

    // Solo cargamos hardware y security (los únicos necesarios para calcular status)
    // y el conteo de software de riesgo (sin cargar los items)
    const [hardware, security, prevHardware, prevSecurity, riskyAppsCount, lastSync] =
      await Promise.all([
        this.getLatestUpTo(this.hardwareRepo,  equipment.id, upTo),
        this.getLatestUpTo(this.securityRepo,  equipment.id, upTo),
        this.getLatestUpTo(this.hardwareRepo,  equipment.id, upToPrevDay),
        this.getLatestUpTo(this.securityRepo,  equipment.id, upToPrevDay),
        this.softwareRepo.count({
          where: { equipment: { id: equipment.id }, isRisk: true },
        }),
        // Última fecha de sync disponible (cualquier módulo)
        this.getLastSyncDate(equipment.id, upTo),
      ]);

    const currentStatus  = calculateEquipmentStatus(hardware, security);
    const previousStatus = calculateEquipmentStatus(prevHardware, prevSecurity);

    return {
      equipment: {
        id:       equipment.id,
        code:     equipment.code,
        name:     equipment.name,
        location: equipment.location,
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
  // Llamado por GET /audit-analysis/equipment-detail
  // Solo se ejecuta cuando el usuario hace click en una PC del heat map

  async getEquipmentDetail(
    equipmentId: string,
    date: Date,
  ): Promise<EquipmentDailyDetail> {

    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipmentId, isActive: true },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment ${equipmentId} not found or inactive`);
    }

    const upTo        = endOfDay(date);
    const upToPrevDay = endOfDay(subDays(date, 1));

    // Carga completa de los 4 snapshots + día anterior para comparar
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
        location: equipment.location,
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
    equipmentId: string,
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

  private async getSoftwareUpTo(equipmentId: string, upTo: Date) {
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

  private async getLastSyncDate(equipmentId: string, upTo: Date): Promise<Date | null> {
    // Busca el sync más reciente en hardware (el módulo más representativo)
    const snap = await this.hardwareRepo.findOne({
      where: {
        equipment: { id: equipmentId } as any,
        capturedAt: LessThanOrEqual(upTo),
      } as any,
      order: { capturedAt: 'DESC' } as any,
    });
    return snap?.capturedAt ?? null;
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
```

---

## 7. Servicio — Análisis IA

```typescript
// audit-analysis/services/ai-analysis.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { AiAuditReport, AiAnalysisResult } from '../entities/ai-audit-report.entity';
import { AuditFinding } from '../entities/audit-finding.entity';
import { DailyConsolidatorService } from './daily-consolidator.service';
import { AiAnalysisRequestDto } from '../dto/ai-analysis-request.dto';
import { Equipment } from '../../equipments/entities/equipment.entity';
import { Laboratory } from '../../laboratories/entities/laboratory.entity';

@Injectable()
export class AiAnalysisService {

  private readonly anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  constructor(
    @InjectRepository(AiAuditReport)
    private readonly reportRepo: Repository<AiAuditReport>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(Laboratory)
    private readonly laboratoryRepo: Repository<Laboratory>,
    private readonly consolidatorService: DailyConsolidatorService,
  ) {}

  async analyzeEquipment(dto: AiAnalysisRequestDto): Promise<AiAuditReport> {
    if (!dto.equipmentId && !dto.laboratoryId) {
      throw new BadRequestException('equipmentId or laboratoryId is required');
    }

    const date = new Date(dto.date);

    // 1. Construir contexto según scope
    const { context, equipment, laboratory } = dto.equipmentId
      ? await this.buildEquipmentContext(dto.equipmentId, date)
      : await this.buildLaboratoryContext(dto.laboratoryId!, date);

    // 2. Llamar a Claude
    const { analysis, tokensUsed } = await this.callClaude(context, dto.equipmentId ? 'equipment' : 'laboratory');

    // 3. Persistir reporte
    const report = await this.reportRepo.save(
      this.reportRepo.create({
        scope:       dto.equipmentId ? 'equipment' : 'laboratory',
        laboratory:  laboratory ?? null,
        equipment:   equipment ?? null,
        auditDate:   date,
        sentContext: context,
        analysis,
        tokensUsed,
      }),
    );

    // 4. Auto-crear hallazgos si se solicitó
    if (dto.autoCreateFindings && analysis.criticalFindings?.length) {
      await this.autoCreateFindings(analysis.criticalFindings, report, date);
    }

    return report;
  }

  // ── Construcción de contexto ──────────────────────────────────

  private async buildEquipmentContext(equipmentId: string, date: Date) {
    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipmentId },
      relations: ['laboratory'],
    });

    const detail = await this.consolidatorService.buildEquipmentDetail(equipment!, date);

    // Contexto limpio y estructurado para la IA
    const context = {
      auditDate:  date.toISOString().split('T')[0],
      laboratory: equipment!.laboratory.name,
      equipment:  detail.equipment,
      status:     detail.status,
      statusChange: detail.statusCompareToPrevDay,
      hardware:   detail.hardware.data,
      hardwareStale: detail.hardware.stale,
      software: {
        riskyCount:    (detail.software as any).riskyCount,
        totalCount:    (detail.software as any).totalCount,
        latestCapture: detail.software.capturedAt,
        stale:         detail.software.stale,
        snapshot:      detail.software.data,
      },
      security:    detail.security.data,
      securityStale: detail.security.stale,
      performance: detail.performance.data,
    };

    return { context, equipment, laboratory: equipment!.laboratory };
  }

  private async buildLaboratoryContext(laboratoryId: string, date: Date) {
    const daily = await this.consolidatorService.getDailyAnalysis(laboratoryId, date);
    const laboratory = await this.laboratoryRepo.findOne({ where: { id: laboratoryId } });

    // Para análisis de laboratorio enviamos el resumen + equipos problemáticos
    const context = {
      auditDate:  date.toISOString().split('T')[0],
      laboratory: daily.laboratory,
      summary:    daily.summary,
      // Solo enviamos detalle de equipos no-operativos para mantener el contexto manejable
      problematicEquipments: daily.equipments
        .filter(e => e.status !== 'operative')
        .map(e => ({
          code:          e.equipment.code,
          status:        e.status,
          statusChange:  e.statusCompareToPrevDay,
          hasSecRisk:    e.security.hasRisk,
          riskyApps:     (e.software as any).riskyCount,
          isObsolete:    (e.hardware.data as any)?.isObsolete ?? false,
          cpuTemp:       (e.hardware.data as any)?.cpuTemperatureC,
          diskSmart:     (e.hardware.data as any)?.diskSmartStatus,
          antivirusOk:   (e.security.data as any)?.antivirusEnabled,
          firewallOk:    (e.security.data as any)?.firewallEnabled,
          pendingUpdate: (e.security.data as any)?.isCriticalUpdatePending,
          daysSinceUpd:  (e.security.data as any)?.daysSinceLastUpdate,
        })),
    };

    return { context, equipment: null, laboratory };
  }

  // ── Llamada a Claude ──────────────────────────────────────────

  private async callClaude(
    context: object,
    scope: 'equipment' | 'laboratory',
  ): Promise<{ analysis: AiAnalysisResult; tokensUsed: number }> {

    const scopeLabel = scope === 'equipment'
      ? 'una computadora específica de laboratorio universitario'
      : 'un laboratorio de cómputo universitario completo';

    const systemPrompt = `
Eres un auditor informático experto especializado en auditorías de infraestructura tecnológica
en instituciones de educación superior. Analizas datos técnicos recopilados automáticamente
de equipos de cómputo y generas hallazgos formales de auditoría.

Tu análisis debe basarse ÚNICAMENTE en los datos proporcionados. No inventes información.
Si un campo es null o stale (dato desactualizado), indícalo como limitación.

El marco normativo aplicable es: COBIT 2019, ISO/IEC 27001:2022, ISO/IEC 27002
y la normativa peruana (Ley N° 30096, NTP-ISO/IEC 17799).

Las pruebas del plan de auditoría son:
Hardware: PS-HW-01 (estado físico), PS-HW-02 (inventario), PS-HW-03 (rendimiento/temperatura),
          PS-HW-04 (mantenimiento), PS-HW-05 (obsolescencia), PS-HW-06 (protección eléctrica),
          PS-HW-07 (disposición de equipos)
Software: PS-SW-01 (actualizaciones SO), PS-SW-02 (antimalware), PS-SW-03 (licencias),
          PS-SW-04 (control de acceso), PS-SW-05 (rendimiento), PS-SW-06 (software no autorizado),
          PS-SW-07 (gestión de incidentes)

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin bloques de código,
sin explicaciones fuera del JSON. Usa exactamente esta estructura:
{
  "executiveSummary": "string — párrafo ejecutivo formal para el informe de auditoría",
  "criticalFindings": [
    {
      "equipmentCode": "string — código del equipo afectado",
      "finding": "string — descripción técnica del hallazgo",
      "auditTest": "string — código de prueba: PS-HW-01 a PS-HW-07 o PS-SW-01 a PS-SW-07",
      "severity": "low | medium | high | critical",
      "recommendation": "string — acción correctiva concreta y priorizada"
    }
  ],
  "generalObservations": ["string"],
  "positiveAspects": ["string"],
  "prioritizedRecommendations": ["string — ordenadas de mayor a menor urgencia"]
}
`.trim();

    const userMessage = `
Analiza los siguientes datos de auditoría correspondientes a ${scopeLabel}:

${JSON.stringify(context, null, 2)}

Genera el análisis formal de auditoría siguiendo el formato JSON indicado.
`.trim();

    const response = await this.anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('');

    const analysis: AiAnalysisResult = JSON.parse(rawText);
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return { analysis, tokensUsed };
  }

  // ── Auto-creación de hallazgos ────────────────────────────────

  private async autoCreateFindings(
    aiFindings: AiAnalysisResult['criticalFindings'],
    report: AiAuditReport,
    date: Date,
  ): Promise<void> {

    const findings = await Promise.all(
      aiFindings.map(async (f) => {
        const equipment = await this.equipmentRepo.findOne({
          where: { code: f.equipmentCode },
          relations: ['laboratory'],
        });

        if (!equipment) return null;

        return this.findingRepo.create({
          equipment,
          laboratory:      equipment.laboratory,
          aiReport:        report,
          findingDate:     date,
          auditTest:       f.auditTest,
          title:           f.finding.substring(0, 100),
          description:     f.finding,
          severity:        f.severity,
          recommendation:  f.recommendation,
          status:          'open',
          source:          'ai-generated',
        });
      }),
    );

    const validFindings = findings.filter(Boolean) as any[];
    if (validFindings.length) {
      await this.findingRepo.save(validFindings);
    }
  }

  // ── Historial de reportes ─────────────────────────────────────

  async getReportHistory(laboratoryId: string): Promise<AiAuditReport[]> {
    return this.reportRepo.find({
      where: { laboratory: { id: laboratoryId }, scope: 'laboratory' },
      order: { auditDate: 'DESC' },
      take: 30,
    });
  }
}
```

---

## 8. Servicio — Hallazgos

```typescript
// audit-analysis/services/finding.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditFinding } from '../entities/audit-finding.entity';

@Injectable()
export class FindingService {

  constructor(
    @InjectRepository(AuditFinding)
    private readonly repo: Repository<AuditFinding>,
  ) {}

  // Hallazgos abiertos de un laboratorio
  async getOpenFindings(laboratoryId: string): Promise<AuditFinding[]> {
    return this.repo.find({
      where: { laboratory: { id: laboratoryId }, status: 'open' },
      relations: ['equipment'],
      order: { severity: 'DESC', findingDate: 'DESC' },
    });
  }

  // Hallazgos de un equipo específico (historial completo)
  async getFindingsByEquipment(equipmentId: string): Promise<AuditFinding[]> {
    return this.repo.find({
      where: { equipment: { id: equipmentId } },
      order: { findingDate: 'DESC' },
    });
  }

  // Tendencias: hallazgos agrupados por prueba de auditoría
  async getTrendsByAuditTest(laboratoryId: string): Promise<TrendResult[]> {
    return this.repo
      .createQueryBuilder('f')
      .select('f.audit_test', 'auditTest')
      .addSelect('f.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('f.laboratory_id = :laboratoryId', { laboratoryId })
      .groupBy('f.audit_test')
      .addGroupBy('f.severity')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  // Equipos reincidentes: más de N hallazgos abiertos
  async getRecurringEquipments(
    laboratoryId: string,
    minFindings: number = 3,
  ): Promise<any[]> {
    return this.repo
      .createQueryBuilder('f')
      .select('f.equipment_id', 'equipmentId')
      .addSelect('COUNT(*)', 'findingCount')
      .leftJoin('f.equipment', 'equipment')
      .addSelect('equipment.code', 'equipmentCode')
      .where('f.laboratory_id = :laboratoryId', { laboratoryId })
      .andWhere('f.status = :status', { status: 'open' })
      .groupBy('f.equipment_id')
      .addGroupBy('equipment.code')
      .having('COUNT(*) >= :minFindings', { minFindings })
      .orderBy('findingCount', 'DESC')
      .getRawMany();
  }

  // Actualizar estado del hallazgo (el auditor lo gestiona)
  async updateStatus(
    id: string,
    status: string,
    auditorNotes?: string,
  ): Promise<AuditFinding> {
    const finding = await this.repo.findOne({ where: { id } });
    if (!finding) throw new NotFoundException(`Finding ${id} not found`);

    finding.status       = status;
    finding.auditorNotes = auditorNotes ?? finding.auditorNotes;
    return this.repo.save(finding);
  }
}

interface TrendResult {
  auditTest: string;
  severity: string;
  count: string;
}
```

---

## 9. Controlador

```typescript
// audit-analysis/audit-analysis.controller.ts

import {
  Controller, Get, Post, Patch,
  Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyConsolidatorService } from './services/daily-consolidator.service';
import { AiAnalysisService } from './services/ai-analysis.service';
import { FindingService } from './services/finding.service';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';

@Controller('audit-analysis')
@UseGuards(JwtAuthGuard)
export class AuditAnalysisController {

  constructor(
    private readonly consolidatorService: DailyConsolidatorService,
    private readonly aiAnalysisService:   AiAnalysisService,
    private readonly findingService:       FindingService,
  ) {}

  // ── Heat map — carga liviana ───────────────────────────────────
  // Renderiza el grid de PCs con status y flags básicos
  // Params: laboratoryId, date

  @Get('daily')
  getDailyHeatMap(
    @Query('laboratoryId') laboratoryId: string,
    @Query('date') date: string,
  ) {
    return this.consolidatorService.getDailyHeatMap(laboratoryId, new Date(date));
  }

  // ── Detalle de equipo — carga pesada ──────────────────────────
  // Se llama solo al hacer click en una PC del heat map
  // Retorna los 4 snapshots completos con stale flags
  // Params: equipmentId, date

  @Get('equipment-detail')
  getEquipmentDetail(
    @Query('equipmentId') equipmentId: string,
    @Query('date') date: string,
  ) {
    return this.consolidatorService.getEquipmentDetail(equipmentId, new Date(date));
  }

  // ── Análisis IA ───────────────────────────────────────────────

  @Post('ai')
  analyze(@Body() dto: AiAnalysisRequestDto) {
    return this.aiAnalysisService.analyzeEquipment(dto);
  }

  @Get('ai/history')
  getAiHistory(@Query('laboratoryId') laboratoryId: string) {
    return this.aiAnalysisService.getReportHistory(laboratoryId);
  }

  // ── Hallazgos ─────────────────────────────────────────────────

  @Get('findings')
  getOpenFindings(@Query('laboratoryId') laboratoryId: string) {
    return this.findingService.getOpenFindings(laboratoryId);
  }

  @Get('findings/equipment/:equipmentId')
  getFindingsByEquipment(@Param('equipmentId') equipmentId: string) {
    return this.findingService.getFindingsByEquipment(equipmentId);
  }

  @Get('findings/trends')
  getTrends(@Query('laboratoryId') laboratoryId: string) {
    return this.findingService.getTrendsByAuditTest(laboratoryId);
  }

  @Get('findings/recurring')
  getRecurring(
    @Query('laboratoryId') laboratoryId: string,
    @Query('min') min: string,
  ) {
    return this.findingService.getRecurringEquipments(
      laboratoryId,
      min ? parseInt(min) : 3,
    );
  }

  @Patch('findings/:id/status')
  updateFindingStatus(
    @Param('id') id: string,
    @Body() body: { status: string; auditorNotes?: string },
  ) {
    return this.findingService.updateStatus(id, body.status, body.auditorNotes);
  }
}
```

---

## 10. Módulo NestJS

```typescript
// audit-analysis/audit-analysis.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAuditReport } from './entities/ai-audit-report.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { Equipment } from '../equipments/entities/equipment.entity';
import { Laboratory } from '../laboratories/entities/laboratory.entity';
import { HardwareSnapshot } from '../hardware/entities/hardware-snapshot.entity';
import { SoftwareInstalled } from '../software/entities/software-installed.entity';
import { SecuritySnapshot } from '../security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from '../performance/entities/performance-snapshot.entity';
import { DailyConsolidatorService } from './services/daily-consolidator.service';
import { AiAnalysisService } from './services/ai-analysis.service';
import { FindingService } from './services/finding.service';
import { AuditAnalysisController } from './audit-analysis.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiAuditReport,
      AuditFinding,
      Equipment,
      Laboratory,
      HardwareSnapshot,
      SoftwareInstalled,
      SecuritySnapshot,
      PerformanceSnapshot,
    ]),
  ],
  controllers: [AuditAnalysisController],
  providers: [
    DailyConsolidatorService,
    AiAnalysisService,
    FindingService,
  ],
})
export class AuditAnalysisModule {}
```

---

## 11. Estructura de carpetas

```
src/
├── shared/
│   └── utils/
│       └── equipment-status.util.ts  ← helper compartido entre Agent y AuditAnalysis
│
└── audit-analysis/
    ├── dto/
    │   ├── daily-analysis.dto.ts      ← EquipmentHeatMapItem, DailyLaboratoryHeatMap
    │   ├── equipment-detail.dto.ts    ← SnapshotRef, EquipmentDailyDetail
    │   └── ai-analysis-request.dto.ts
    ├── entities/
    │   ├── ai-audit-report.entity.ts
    │   └── audit-finding.entity.ts
    ├── services/
    │   ├── daily-consolidator.service.ts
    │   ├── ai-analysis.service.ts
    │   └── finding.service.ts
    ├── audit-analysis.controller.ts
    └── audit-analysis.module.ts
```

---

## 12. Ejemplos de respuesta

### `GET /audit-analysis/daily?laboratoryId=xxx&date=2026-02-22` — Heat map liviano

```json
{
  "laboratory": {
    "id": "uuid-lab-01",
    "name": "Laboratorio 1",
    "location": "Pabellón H, 2do piso"
  },
  "date": "2026-02-22",
  "summary": {
    "total": 20,
    "operative": 13,
    "degraded": 4,
    "critical": 2,
    "noData": 1,
    "withSecurityRisk": 5,
    "withRiskySoftware": 3,
    "obsolete": 8
  },
  "equipments": [
    {
      "equipment": {
        "id": "uuid-eq-05",
        "code": "LAB01-PC05",
        "name": "PC 05",
        "location": "Fila 1 - Puesto 5"
      },
      "status": "critical",
      "statusCompareToPrevDay": "worsened",
      "isObsolete": true,
      "hasSecurityRisk": true,
      "riskyAppsCount": 2,
      "lastSync": "2026-02-22T07:00:00Z"
    },
    {
      "equipment": {
        "id": "uuid-eq-06",
        "code": "LAB01-PC06",
        "name": "PC 06",
        "location": "Fila 1 - Puesto 6"
      },
      "status": "operative",
      "statusCompareToPrevDay": "same",
      "isObsolete": false,
      "hasSecurityRisk": false,
      "riskyAppsCount": 0,
      "lastSync": "2026-02-22T07:00:00Z"
    }
  ]
}
```

### `GET /audit-analysis/equipment-detail?equipmentId=uuid-eq-05&date=2026-02-22` — Detalle completo

```json
{
  "equipment": {
    "id": "uuid-eq-05",
    "code": "LAB01-PC05",
    "name": "PC 05",
    "location": "Fila 1 - Puesto 5"
  },
  "status": "critical",
  "statusCompareToPrevDay": "worsened",
  "hardware": {
    "data": {
      "cpuModel": "Intel Core i5-10400",
      "cpuTemperatureC": 87,
      "ramTotalGB": 8,
      "ramUsedGB": 7.3,
      "diskType": "HDD",
      "diskSmartStatus": "warning",
      "isObsolete": true
    },
    "capturedAt": "2026-02-22T07:00:00Z",
    "stale": false,
    "staleDays": 0
  },
  "software": {
    "data": { "capturedAt": "2026-02-22T07:00:00Z" },
    "capturedAt": "2026-02-22T07:00:00Z",
    "stale": false,
    "staleDays": 0,
    "riskyCount": 2,
    "totalCount": 18
  },
  "security": {
    "data": {
      "antivirusEnabled": true,
      "firewallEnabled": false,
      "hasSecurityRisk": true,
      "isCriticalUpdatePending": true,
      "daysSinceLastUpdate": 104
    },
    "capturedAt": "2026-02-20T07:00:00Z",
    "stale": true,
    "staleDays": 2,
    "hasRisk": true
  },
  "performance": {
    "data": {
      "cpuUsagePercent": 92,
      "ramUsagePercent": 91,
      "hasCpuAlert": true,
      "hasRamAlert": true
    },
    "capturedAt": "2026-02-22T07:00:00Z",
    "stale": false,
    "staleDays": 0
  }
}
```

### `POST /audit-analysis/ai` — Respuesta de Claude

```json
{
  "id": "uuid-report-01",
  "scope": "equipment",
  "auditDate": "2026-02-22",
  "tokensUsed": 1240,
  "analysis": {
    "executiveSummary": "El equipo LAB01-PC05 presenta un nivel de riesgo CRÍTICO al 22 de febrero de 2026. Se identificaron vulnerabilidades graves en temperatura de CPU (87°C, superando el umbral crítico de 85°C), firewall deshabilitado, y software no autorizado activo. El estado empeoró respecto al día anterior, lo que indica una tendencia de deterioro que requiere atención inmediata.",
    "criticalFindings": [
      {
        "equipmentCode": "LAB01-PC05",
        "finding": "Temperatura de CPU en 87°C supera el umbral crítico de 85°C, indicando posible falla inminente por sobrecalentamiento",
        "auditTest": "PS-HW-03",
        "severity": "critical",
        "recommendation": "Suspender uso del equipo de forma inmediata. Realizar limpieza de ventilador y disipador. Verificar pasta térmica."
      },
      {
        "equipmentCode": "LAB01-PC05",
        "finding": "Firewall de Windows deshabilitado en todos los perfiles, exponiendo el equipo a accesos no autorizados en la red del laboratorio",
        "auditTest": "PS-SW-02",
        "severity": "critical",
        "recommendation": "Habilitar firewall de forma inmediata mediante política de grupo. Investigar motivo de deshabilitación."
      },
      {
        "equipmentCode": "LAB01-PC05",
        "finding": "2 aplicaciones no autorizadas detectadas con más de 30 días de instalación",
        "auditTest": "PS-SW-06",
        "severity": "high",
        "recommendation": "Desinstalar software no autorizado y revisar quién tiene permisos de instalación en este equipo."
      }
    ],
    "generalObservations": [
      "El dato de seguridad tiene 2 días de antigüedad (stale), lo que puede subestimar el riesgo real actual",
      "El equipo está clasificado como obsoleto según los criterios de antigüedad y tipo de disco"
    ],
    "positiveAspects": [
      "Antivirus activo y con definiciones actualizadas",
      "UAC habilitado"
    ],
    "prioritizedRecommendations": [
      "1. Suspender uso del equipo y atender el problema de temperatura (riesgo de daño físico)",
      "2. Habilitar firewall de Windows mediante GPO",
      "3. Desinstalar software no autorizado",
      "4. Programar renovación del equipo por obsolescencia",
      "5. Forzar sync del agente para obtener dato de seguridad actualizado"
    ]
  }
}
```

### `GET /audit-analysis/findings/trends?laboratoryId=xxx`

```json
[
  { "auditTest": "PS-HW-05", "severity": "high",     "count": "14" },
  { "auditTest": "PS-SW-01", "severity": "medium",   "count": "9"  },
  { "auditTest": "PS-SW-06", "severity": "high",     "count": "7"  },
  { "auditTest": "PS-SW-02", "severity": "critical",  "count": "3"  }
]
```

> Esta vista de tendencias muestra que `PS-HW-05` (obsolescencia) es el
> hallazgo más recurrente del laboratorio, lo que sustenta una recomendación
> formal de renovación tecnológica en el informe final.

---

## Resumen de endpoints

| Método | Ruta | Carga | Descripción |
|---|---|---|---|
| GET | `/audit-analysis/daily` | Liviana | Heat map — status y flags por PC del laboratorio |
| GET | `/audit-analysis/equipment-detail` | Pesada | 4 snapshots completos de una PC (al hacer click) |
| POST | `/audit-analysis/ai` | — | Análisis IA para un equipo o laboratorio |
| GET | `/audit-analysis/ai/history` | — | Historial de análisis IA de un laboratorio |
| GET | `/audit-analysis/findings` | — | Hallazgos abiertos de un laboratorio |
| GET | `/audit-analysis/findings/equipment/:id` | — | Historial de hallazgos de una PC |
| GET | `/audit-analysis/findings/trends` | — | Tendencias agrupadas por prueba de auditoría |
| GET | `/audit-analysis/findings/recurring` | — | Equipos con hallazgos reincidentes |
| PATCH | `/audit-analysis/findings/:id/status` | — | Actualizar estado de un hallazgo |

---

*Documentación generada para el sistema de auditoría EPIS-UNT · 2026*