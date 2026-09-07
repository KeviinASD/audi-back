// governance/governance.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { HardwareSnapshot } from 'src/modules/hardware/entities/hardware-snapshot.entity';
import { SecuritySnapshot } from 'src/modules/security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from 'src/modules/performance/entities/performance-snapshot.entity';
import { SoftwareInstalled } from 'src/modules/software/entities/software-installed.entity';
import { GovernanceThreshold } from './entities/governance-threshold.entity';
import { GovernanceService } from './governance.service';
import { ThresholdEvaluatorService } from './services/threshold-evaluator.service';
import { SnapshotLoaderService } from './services/snapshot-loader.service';
import { GovernanceController } from './governance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GovernanceThreshold,
      Equipment,
      HardwareSnapshot,
      SecuritySnapshot,
      PerformanceSnapshot,
      SoftwareInstalled,
    ]),
  ],
  controllers: [GovernanceController],
  providers: [GovernanceService, ThresholdEvaluatorService, SnapshotLoaderService],
  exports: [GovernanceService, ThresholdEvaluatorService],
})
export class GovernanceModule {}
