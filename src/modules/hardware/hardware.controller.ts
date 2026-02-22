// hardware/hardware.controller.ts

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { HardwareService } from './hardware.service';

@Controller('hardware')
export class HardwareController {

  constructor(private readonly hardwareService: HardwareService) {}

  @Get('equipment/:equipmentId/latest')
  getLatest(@Param('equipmentId') equipmentId: number) {
    return this.hardwareService.getLatestSnapshot(+equipmentId);
  }

  @Get('equipment/:equipmentId/history')
  getHistory(
    @Param('equipmentId') equipmentId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.hardwareService.getHistory(
      +equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('obsolete')
  getObsolete() {
    return this.hardwareService.getObsoleteEquipments();
  }
}