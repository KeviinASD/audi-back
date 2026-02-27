// performance/entities/performance-snapshot.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  ramMB: number;
  status: string;
}

@Entity('performance_snapshots')
export class PerformanceSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipment, { eager: false, nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  @Column()
  mode: string;

  // ── CPU ──────────────────────────────────────────────
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuUsagePercent: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuTemperatureC: number;

  // ── RAM ──────────────────────────────────────────────
  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramTotalGB: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramUsedGB: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  ramUsagePercent: number;

  // ── Disk ─────────────────────────────────────────────
  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskTotalGB: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskUsedGB: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  diskUsagePercent: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  diskTemperatureC: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskReadSpeedMBs: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskWriteSpeedMBs: number;

  // ── Network ──────────────────────────────────────────
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  networkSentMBs: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  networkReceivedMBs: number;

  @Column({ nullable: true })
  networkAdapterName: string;

  // ── Uptime ───────────────────────────────────────────
  @Column({ nullable: true })
  uptimeSeconds: number;

  @Column({ nullable: true })
  lastBootTime: Date;

  // ── Top processes ────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  topProcessesByCpu: ProcessInfo[];

  @Column({ type: 'jsonb', nullable: true })
  topProcessesByRam: ProcessInfo[];

  // ── Performance flags ────────────────────────────────
  @Column({ default: false })
  hasCpuAlert: boolean;

  @Column({ default: false })
  hasRamAlert: boolean;

  @Column({ default: false })
  hasDiskAlert: boolean;

  @Column({ default: false })
  hasThermalAlert: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
