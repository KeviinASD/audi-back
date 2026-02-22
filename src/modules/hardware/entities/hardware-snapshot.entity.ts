// hardware/entities/hardware-snapshot.entity.ts

import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';


@Entity('hardware_snapshots')
export class HardwareSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipment, { eager: false, nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  // Fecha en que el agente ejecutó el sync (viene del payload)
  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  // ── CPU ──────────────────────────────────────────────
  @Column({ nullable: true })
  cpuModel: string;                   // "Intel Core i5-10400"

  @Column({ nullable: true })
  cpuCores: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuFrequencyGHz: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuUsagePercent: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuTemperatureC: number;            // null si sensor no disponible

  // ── RAM ──────────────────────────────────────────────
  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramTotalGB: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramUsedGB: number;

  @Column({ nullable: true })
  ramType: string;                    // "DDR3" | "DDR4" | "DDR5"

  @Column({ nullable: true })
  ramFrequencyMHz: number;

  // ── Disk ─────────────────────────────────────────────
  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskCapacityGB: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskUsedGB: number;

  @Column({ nullable: true })
  diskType: string;                   // "HDD" | "SSD" | "NVMe"

  @Column({ nullable: true })
  diskModel: string;

  @Column({ default: 'unknown' })
  diskSmartStatus: string;            // "good" | "warning" | "failed" | "unknown"

  // ── Physical equipment ───────────────────────────────
  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true })
  manufactureYear: string;            // "2019" | "2020"

  @Column({ nullable: true })
  architecture: string;               // "64bit"

  // ── Calculated ───────────────────────────────────────
  @Column({ default: false })
  isObsolete: boolean;
  // true si: antigüedad > 5 años  OR  ramTotalGB < 4  OR  diskType === 'HDD'

  @CreateDateColumn()
  createdAt: Date;
}