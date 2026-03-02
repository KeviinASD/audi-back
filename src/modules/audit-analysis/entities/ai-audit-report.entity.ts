// audit-analysis/entities/ai-audit-report.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Laboratory } from 'src/modules/equipos/entities/laboratory.entity';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';

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
  auditTest: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

@Entity('ai_audit_reports')
export class AiAuditReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  scope: string;                        // "laboratory" | "equipment"

  @ManyToOne(() => Laboratory, { nullable: true, eager: false })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory | null;

  @ManyToOne(() => Equipment, { nullable: true, eager: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment | null;

  @Column({ type: 'date' })
  auditDate: Date;

  @Column({ type: 'jsonb' })
  sentContext: object;

  @Column({ type: 'jsonb' })
  analysis: AiAnalysisResult;

  @Column({ default: 0 })
  tokensUsed: number;

  @CreateDateColumn()
  createdAt: Date;
}
