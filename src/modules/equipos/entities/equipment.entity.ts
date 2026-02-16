import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Laboratory } from "./laboratory.entity";
// import { Report } from "../../reportes/entities/report.entity"; // TODO: Uncomment when Report module is created

@Entity('equipment')
export class Equipment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    hostname: string;             // "ELMO" — clave natural del agente

    @Column({ nullable: true })
    currentUser: string;          // "elmot" — último usuario logueado

    @Column({ nullable: true })
    ipAddress: string;            // "192.168.100.4"

    @Column({ nullable: true })
    osVersion: string;            // "Microsoft Windows 11 Home..."

    @Column({ nullable: true })
    architecture: string;         // "64 bits"

    @ManyToOne(() => Laboratory, lab => lab.equipment, { nullable: true })
    laboratory: Laboratory;

    @Column({ nullable: true })
    laboratoryId: string;

    @Column({ default: 'unknown' })
    status: string;               // 'online' | 'offline' | 'warning' | 'critical'

    @Column({ nullable: true })
    lastSeenAt: Date;             // última vez que el agente envió datos

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relaciones hacia otros módulos
    // @OneToMany(() => Report, r => r.equipment)
    // reports: Report[];
}
