// security/entities/security-snapshot.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';

export interface LocalUserInfo {
  username: string;
  isAdmin: boolean;
  isEnabled: boolean;
  lastLogin: string | null;
  passwordNeverExpires: boolean;
}

// Ver nota en hardware-snapshot.entity.ts: sin este índice compuesto,
// "la última captura de este equipo" ordena la tabla entera.
@Index(['equipment', 'capturedAt'])
@Entity('security_snapshots')
export class SecuritySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipment, { eager: false, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  // ── Operating System ─────────────────────────────────
  @Column({ nullable: true })
  osName: string;

  @Column({ nullable: true })
  osVersion: string;

  @Column({ nullable: true })
  osBuild: string;

  @Column({ nullable: true })
  osArchitecture: string;

  // ── Windows Update ───────────────────────────────────
  @Column({ nullable: true })
  lastUpdateDate: Date;

  @Column({ nullable: true })
  daysSinceLastUpdate: number;

  @Column({ default: 0 })
  pendingUpdatesCount: number;

  @Column({ default: false })
  isCriticalUpdatePending: boolean;

  // ── Antivirus ────────────────────────────────────────
  @Column({ default: false })
  antivirusInstalled: boolean;

  @Column({ default: false })
  antivirusEnabled: boolean;

  @Column({ nullable: true })
  antivirusName: string;

  @Column({ nullable: true })
  antivirusVersion: string;

  @Column({ default: false })
  antivirusDefinitionsUpdated: boolean;

  @Column({ nullable: true })
  antivirusLastScanDate: Date;

  // ── Firewall ─────────────────────────────────────────
  @Column({ default: false })
  firewallEnabled: boolean;

  @Column({ default: false })
  firewallDomainEnabled: boolean;

  @Column({ default: false })
  firewallPrivateEnabled: boolean;

  @Column({ default: false })
  firewallPublicEnabled: boolean;

  // ── Password Policy ──────────────────────────────────
  @Column({ nullable: true })
  passwordMinLength: number;

  @Column({ nullable: true })
  passwordMaxAgeDays: number;

  @Column({ nullable: true })
  passwordMinAgeDays: number;

  @Column({ default: false })
  passwordComplexityEnabled: boolean;

  @Column({ nullable: true })
  accountLockoutThreshold: number;

  // ── Local Users ──────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  localUsers: LocalUserInfo[];

  // ── Last Login ───────────────────────────────────────
  @Column({ nullable: true })
  lastLoggedUser: string;

  @Column({ nullable: true })
  lastLoginDate: Date;

  @Column({ nullable: true })
  currentLoggedUser: string;

  // ── UAC ──────────────────────────────────────────────
  @Column({ default: false })
  uacEnabled: boolean;

  // ── Remote Access ────────────────────────────────────
  @Column({ default: false })
  rdpEnabled: boolean;

  @Column({ default: false })
  remoteRegistryEnabled: boolean;

  // ── Risk flag ────────────────────────────────────────
  @Column({ default: false })
  hasSecurityRisk: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
