import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Equipment } from "./equipment.entity";


@Entity('laboratories')
export class Laboratory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;                 // e.g. "Laboratorio A", "Sala 201"

    @Column({ nullable: true })
    location: string;             // e.g. "Pabellón H, 2do piso"

    @Column({ nullable: true })
    responsible: string;          // e.g. "Dr. Luis Boy Chavil"

    @Column({ nullable: true })
    responsibleEmail: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Equipment, eq => eq.laboratory)
    equipos: Equipment[];
}
