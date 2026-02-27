// performance/performance.controller.ts

import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';

@ApiTags('Performance')
@Controller('performance')
export class PerformanceController {

  constructor(private readonly performanceService: PerformanceService) {}

  @Get('equipment/:equipmentId/latest')
  @ApiOperation({ summary: 'Last performance snapshot for an equipment' })
  @ApiResponse({ status: 200, description: 'Snapshot found.' })
  @ApiResponse({ status: 404, description: 'No data for this equipment.' })
  getLatest(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.performanceService.getLatestSnapshot(equipmentId);
  }

  @Get('equipment/:equipmentId/history')
  @ApiOperation({ summary: 'Performance snapshot history filtered by date range' })
  getHistory(
    @Param('equipmentId', ParseIntPipe) equipmentId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.performanceService.getHistory(
      equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('equipment/:equipmentId/averages')
  @ApiOperation({ summary: 'Average CPU/RAM/disk usage for an equipment in a date range' })
  getAverages(
    @Param('equipmentId', ParseIntPipe) equipmentId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.performanceService.getAverageMetrics(
      equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'All equipments with active performance alerts' })
  getWithAlerts() {
    return this.performanceService.getEquipmentsWithAlerts();
  }
}
