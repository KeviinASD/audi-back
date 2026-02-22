// hardware/hardware.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HardwareSnapshot } from './entities/hardware-snapshot.entity';
import { HardwareService } from './hardware.service';
import { HardwareController } from './hardware.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HardwareSnapshot])],
  controllers: [HardwareController],
  providers: [HardwareService],
  exports: [HardwareService],         // exportado para AgentModule
})
export class HardwareModule {}