// software/software.controller.ts

import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { SoftwareService } from './software.service';
import { CreateAuthorizedSoftwareDto } from './dto/create-authorized-software.dto';

@Controller('software')
export class SoftwareController {

  constructor(private readonly softwareService: SoftwareService) {}

  // ── Snapshots ──────────────────────────────────────────────────
  @Get('equipment/:equipmentId/latest')
  getLatest(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.softwareService.getLatestSnapshot(equipmentId);
  }

  @Get('equipment/:equipmentId/history')
  getHistory(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.softwareService.getSnapshotHistory(equipmentId);
  }

  @Get('equipment/:equipmentId/risky')
  getRiskyByEquipment(@Param('equipmentId') equipmentId: number) {
    return this.softwareService.getRiskyByEquipment(+equipmentId);
  }

  @Get('risky')
  getAllRisky() {
    return this.softwareService.getAllRisky();
  }

  @Get('unlicensed')
  getUnlicensed() {
    return this.softwareService.getUnlicensed();
  }

  // ── Whitelist ──────────────────────────────────────────────────
  @Get('whitelist')
  getWhitelist() {
    return this.softwareService.getWhitelist();
  }

  @Post('whitelist')
  addToWhitelist(@Body() dto: CreateAuthorizedSoftwareDto) {
    return this.softwareService.addToWhitelist(dto);
  }

  @Delete('whitelist/:id')
  removeFromWhitelist(@Param('id') id: string) {
    return this.softwareService.removeFromWhitelist(id);
  }
}