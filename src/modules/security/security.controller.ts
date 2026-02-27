// security/security.controller.ts

import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SecurityService } from './security.service';

@ApiTags('Security')
@Controller('security')
export class SecurityController {

  constructor(private readonly securityService: SecurityService) {}

  @Get('equipment/:equipmentId/latest')
  @ApiOperation({ summary: 'Last security snapshot for an equipment' })
  @ApiResponse({ status: 200, description: 'Snapshot found.' })
  @ApiResponse({ status: 404, description: 'No data for this equipment.' })
  getLatest(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.securityService.getLatestSnapshot(equipmentId);
  }

  @Get('equipment/:equipmentId/history')
  @ApiOperation({ summary: 'Security snapshot history filtered by date range' })
  getHistory(
    @Param('equipmentId', ParseIntPipe) equipmentId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.securityService.getHistory(
      equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('risks')
  @ApiOperation({ summary: 'All equipments with active security risk' })
  getWithRisk() {
    return this.securityService.getEquipmentsWithRisk();
  }

  @Get('no-antivirus')
  @ApiOperation({ summary: 'Equipments without active antivirus' })
  getWithoutAntivirus() {
    return this.securityService.getEquipmentsWithoutAntivirus();
  }

  @Get('pending-updates')
  @ApiOperation({ summary: 'Equipments with critical pending updates' })
  getWithPendingUpdates() {
    return this.securityService.getEquipmentsWithPendingUpdates();
  }
}
