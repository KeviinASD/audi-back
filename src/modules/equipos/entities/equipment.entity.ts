import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Laboratory } from "./laboratory.entity";

@Entity()
export class Equipment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    code: string;               // "LAB01-PC05" — va en el agente

    @Column()
    name: string;

    @Column()
    ubication: string;            // "Laboratorio 1 - Puesto 5"

    @ManyToOne(() => Laboratory, lab => lab.equipos)
    laboratory: Laboratory;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    lastConnection: Date;         // Se actualiza con cada sync del agente

    @Column({ default: 'sin-datos' })
    status: string;               // 'operativo' | 'degradado' | 'critico' | 'sin-datos'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
