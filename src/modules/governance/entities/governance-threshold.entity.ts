// governance/entities/governance-threshold.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * Un umbral de gobierno es una DECISIÓN documentada sobre qué valor
 * es aceptable para un dato que el agente ya recolecta.
 *
 * Sin umbral, el sistema sólo MIDE. Con umbral, EVALÚA contra una política
 * aprobada — que es la diferencia entre gestión y gobierno (COBIT 2019,
 * Principio 4: "Governance Distinct From Management").
 *
 * Cada registro es autoexplicativo a propósito: el frontend muestra
 * qué mide, por qué importa y de dónde sale el número.
 */
@Entity('governance_thresholds')
export class GovernanceThreshold {
  @PrimaryGeneratedColumn()
  id: number;

  /** Código estable del umbral: "UMB-PAR-01", "UMB-AVM-02", ... */
  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: [
      'patches',       // Actualizaciones del sistema operativo
      'antimalware',   // Protección antimalware
      'firewall',      // Firewall y superficie de ataque
      'passwords',     // Contraseñas y cuentas locales
      'hardware',      // Activos y estado físico
      'performance',   // Rendimiento y capacidad
      'software',      // Software y licenciamiento
      'operations',    // Operación y trazabilidad
    ],
  })
  category: string;

  /** Campo del snapshot que este umbral evalúa: "daysSinceLastUpdate" */
  @Column()
  field: string;

  /** Nombre legible: "Días sin actualizar el sistema operativo" */
  @Column()
  label: string;

  // ── Lo que el usuario necesita ENTENDER ────────────────────────

  /** Qué mide, en lenguaje llano. Sin jerga. */
  @Column({ type: 'text' })
  whatItMeasures: string;

  /** Qué riesgo real se corre si se incumple. El "¿y qué?". */
  @Column({ type: 'text' })
  whyItMatters: string;

  /** Cómo se evalúa, en texto: "Se incumple si supera los 30 días". */
  @Column({ type: 'text' })
  howItIsEvaluated: string;

  // ── El umbral en sí ─────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['lte', 'gte', 'eq', 'neq', 'is_true', 'is_false'],
  })
  operator: string;

  /**
   * Valor de comparación, siempre como texto para soportar
   * números, booleanos y enumerados con una sola columna.
   */
  @Column({ type: 'varchar', nullable: true })
  value: string | null;

  /** Unidad para mostrar: "días", "%", "°C", "caracteres", "intentos". */
  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  /** Severidad del hallazgo cuando este umbral se incumple. */
  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  severityOnBreach: string;

  // ── Trazabilidad de gobierno ────────────────────────────────────

  /** Objetivo COBIT 2019 al que aporta evidencia: "DSS05". */
  @Column()
  cobitObjective: string;

  /** Cláusula del Anexo A de ISO/IEC 27001:2022, si aplica. */
  @Column({ type: 'varchar', nullable: true })
  isoClause: string | null;

  /** Norma legal aplicable: "Ley N° 30096", "D. Leg. 822". */
  @Column({ type: 'varchar', nullable: true })
  legalBasis: string | null;

  /** De dónde sale el número: estándar, norma legal o criterio propio. */
  @Column({
    type: 'enum',
    enum: ['standard', 'regulation', 'professional_judgment'],
  })
  sourceType: string;

  /** Referencia concreta: "CIS Windows Benchmark", "NIST SP 800-63B". */
  @Column({ type: 'varchar', nullable: true })
  sourceReference: string | null;

  /** Por qué ESE número y no otro. Es lo que se defiende en la auditoría. */
  @Column({ type: 'text' })
  rationale: string;

  // ── Aprobación (EDM01: quién decidió, cuándo) ───────────────────

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
