// dev/dev.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from '../equipos/entities/equipment.entity';
import { HardwareSnapshot } from '../hardware/entities/hardware-snapshot.entity';
import { SoftwareInstalled } from '../software/entities/software-installed.entity';
import { SecuritySnapshot } from '../security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from '../performance/entities/performance-snapshot.entity';
import { DevService } from './dev.service';
import { DevController } from './dev.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Equipment,
      HardwareSnapshot,
      SoftwareInstalled,
      SecuritySnapshot,
      PerformanceSnapshot,
    ]),
  ],
  controllers: [DevController],
  providers:   [DevService],
})
export class DevModule {}
