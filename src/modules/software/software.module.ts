// software/software.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoftwareInstalled } from './entities/software-installed.entity';
import { AuthorizedSoftware } from './entities/authorized-software.entity';
import { SoftwareService } from './software.service';
import { SoftwareController } from './software.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SoftwareInstalled, AuthorizedSoftware])],
  controllers: [SoftwareController],
  providers: [SoftwareService],
  exports: [SoftwareService],         // exportado para AgentModule
})
export class SoftwareModule {}