// audit-analysis/entities/audit-finding.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { Laboratory } from 'src/modules/equipos/entities/laboratory.entity';
import { AiAuditReport } from './ai-audit-report.entity';

@Entity('audit_findings')
export class AuditFinding {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipment, { nullable: false, eager: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @ManyToOne(() => Laboratory, { nullable: false, eager: false })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory;

  @ManyToOne(() => AiAuditReport, { nullable: true, eager: false })
  @JoinColumn({ name: 'ai_report_id' })
  aiReport: AiAuditReport | null;

  @Column({ type: 'date' })
  findingDate: Date;

  @Column()
  auditTest: string;                    // "PS-SW-01", "PS-HW-03", etc.

  @Column()
  title: string;

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

  @Column({ type: 'text', nullable: true })
  auditorNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
