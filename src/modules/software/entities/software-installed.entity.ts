// software/entities/software-installed.entity.ts

import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { LicenseStatus } from 'src/common/enums/license-status.enum';
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';

@Entity('software_installed')
export class SoftwareInstalled {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipment, { eager: false, nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  // Fecha del snapshot al que pertenece este item
  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  @Column()
  name: string;                       // "Python 3.11.4"

  @Column({ nullable: true })
  version: string;

  @Column({ nullable: true })
  publisher: string;                  // "Python Software Foundation"

  @Column({ type: 'date', nullable: true })
  installedAt: Date;

  @Column({
    type: 'enum',
    enum: LicenseStatus,
    default: LicenseStatus.UNKNOWN,
  })
  licenseStatus: LicenseStatus;

  @Column({ default: false })
  isWhitelisted: boolean;             // cruzado con AuthorizedSoftware

  @Column({ default: false })
  isRisk: boolean;
  // true si: no en whitelist AND más de 30 días instalado

  @CreateDateColumn()
  createdAt: Date;
}
