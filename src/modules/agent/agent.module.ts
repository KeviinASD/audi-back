// agent/agent.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HardwareModule } from '../hardware/hardware.module';
import { SoftwareModule } from '../software/software.module';
import { SecurityModule } from '../security/security.module';
import { PerformanceModule } from '../performance/performance.module';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { Equipment } from '../equipos/entities/equipment.entity';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment]),
    HardwareModule,
    SoftwareModule,
    SecurityModule,
    PerformanceModule,
  ],
  controllers: [AgentController],
  providers: [AgentService, ApiKeyGuard],
})
export class AgentModule {}