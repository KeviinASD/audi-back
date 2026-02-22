// agent/agent.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HardwareModule } from '../hardware/hardware.module';
import { SoftwareModule } from '../software/software.module';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { Equipment } from '../equipos/entities/equipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment]),
    HardwareModule,
    SoftwareModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}