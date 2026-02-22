// software/entities/authorized-software.entity.ts

import { Laboratory } from 'src/modules/equipos/entities/laboratory.entity';
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';

@Entity('authorized_software')
export class AuthorizedSoftware {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
  // Fragmento para matching parcial: "Python", "Visual Studio", "Cisco Packet Tracer"

  @Column({ nullable: true })
  publisher: string;

  @Column({ nullable: true })
  description: string;                // "IDE oficial — curso Redes"

  @Column({ default: true })
  isActive: boolean;

  // null = permitido en todos los laboratorios
  @ManyToOne(() => Laboratory, { nullable: true, eager: false })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory | null;

  @CreateDateColumn()
  createdAt: Date;
}