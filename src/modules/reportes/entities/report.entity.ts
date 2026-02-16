import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, OneToOne, JoinColumn, OneToMany } from "typeorm";
import { Equipment } from "../../equipos/entities/equipment.entity";

@Entity('reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Equipment)
    @JoinColumn({ name: 'equipmentId' })
    equipment: Equipment;

    @Column()
    equipmentId: string;

    @Column({ type: 'timestamp' })
    agentTimestamp: Date;         // "2026-02-12 00:16:24" del agente

    @CreateDateColumn()
    receivedAt: Date;             // cuándo llegó al servidor

    @Column({ type: 'jsonb', nullable: true })
    rawPayload: object;           // JSON completo original (para auditoría)

    @Column({ default: 'processed' })
    status: string;               // 'processed' | 'error' | 'partial'

    // TODO: Add relationships to other modules as they are created
    // @OneToOne(() => SystemInfo, s => s.report)
    // systemInfo: SystemInfo;

    // @OneToOne(() => MetricsSnapshot, m => m.report)
    // metrics: MetricsSnapshot;

    // @OneToOne(() => StorageInfo, s => s.report)
    // storage: StorageInfo;

    // @OneToOne(() => SecuritySnapshot, s => s.report)
    // security: SecuritySnapshot;

    // @OneToMany(() => SoftwareLicense, s => s.report)
    // software: SoftwareLicense[];

    // @OneToMany(() => ProcessSnapshot, p => p.report)
    // processes: ProcessSnapshot[];
}
