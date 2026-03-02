// audit-analysis/audit-analysis.controller.ts

import {
  Controller, Get, Post, Patch,
  Param, Query, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DailyConsolidatorService } from './services/daily-consolidator.service';
import { AiAnalysisService } from './services/ai-analysis.service';
import { FindingService } from './services/finding.service';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';

@ApiTags('Audit Analysis')
@Controller('audit-analysis')
export class AuditAnalysisController {

  constructor(
    private readonly consolidatorService: DailyConsolidatorService,
    private readonly aiAnalysisService:   AiAnalysisService,
    private readonly findingService:       FindingService,
  ) {}

  // ── Heat map — carga liviana ───────────────────────────────────
  // Renderiza el grid de PCs con status y flags básicos

  @Get('daily')
  @ApiOperation({ summary: 'Vista heat map del laboratorio — status y flags por equipo' })
  @ApiQuery({ name: 'laboratoryId', type: Number })
  @ApiQuery({ name: 'date', type: String, example: '2026-02-22' })
  getDailyHeatMap(
    @Query('laboratoryId', ParseIntPipe) laboratoryId: number,
    @Query('date') date: string,
  ) {
    return this.consolidatorService.getDailyHeatMap(laboratoryId, new Date(date));
  }

  // ── Detalle de equipo — carga pesada ──────────────────────────
  // Solo se llama al hacer click en una PC del heat map

  @Get('equipment-detail')
  @ApiOperation({ summary: 'Detalle completo de una PC — 4 snapshots con staleness' })
  @ApiQuery({ name: 'equipmentId', type: Number })
  @ApiQuery({ name: 'date', type: String, example: '2026-02-22' })
  getEquipmentDetail(
    @Query('equipmentId', ParseIntPipe) equipmentId: number,
    @Query('date') date: string,
  ) {
    return this.consolidatorService.getEquipmentDetail(equipmentId, new Date(date));
  }

  // ── Análisis IA ───────────────────────────────────────────────

  @Post('ai')
  @ApiOperation({ summary: 'Lanza análisis IA para un equipo o laboratorio' })
  analyze(@Body() dto: AiAnalysisRequestDto) {
    return this.aiAnalysisService.analyzeEquipment(dto);
  }

  @Get('ai/history')
  @ApiOperation({ summary: 'Historial de análisis IA de un laboratorio' })
  @ApiQuery({ name: 'laboratoryId', type: Number })
  getAiHistory(@Query('laboratoryId', ParseIntPipe) laboratoryId: number) {
    return this.aiAnalysisService.getReportHistory(laboratoryId);
  }

  // ── Hallazgos ─────────────────────────────────────────────────

  @Get('findings')
  @ApiOperation({ summary: 'Hallazgos abiertos de un laboratorio' })
  @ApiQuery({ name: 'laboratoryId', type: Number })
  getOpenFindings(@Query('laboratoryId', ParseIntPipe) laboratoryId: number) {
    return this.findingService.getOpenFindings(laboratoryId);
  }

  @Get('findings/equipment/:equipmentId')
  @ApiOperation({ summary: 'Historial de hallazgos de un equipo' })
  getFindingsByEquipment(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.findingService.getFindingsByEquipment(equipmentId);
  }

  @Get('findings/trends')
  @ApiOperation({ summary: 'Tendencias agrupadas por prueba de auditoría' })
  @ApiQuery({ name: 'laboratoryId', type: Number })
  getTrends(@Query('laboratoryId', ParseIntPipe) laboratoryId: number) {
    return this.findingService.getTrendsByAuditTest(laboratoryId);
  } 

  @Get('findings/recurring')
  @ApiOperation({ summary: 'Equipos con hallazgos reincidentes' })
  @ApiQuery({ name: 'laboratoryId', type: Number })
  @ApiQuery({ name: 'min', required: false, type: Number })
  getRecurring(
    @Query('laboratoryId', ParseIntPipe) laboratoryId: number,
    @Query('min') min: string,
  ) {
    return this.findingService.getRecurringEquipments(
      laboratoryId,
      min ? parseInt(min) : 3,
    );
  }

  @Patch('findings/:id/status')
  @ApiOperation({ summary: 'Actualizar estado de un hallazgo' })
  updateFindingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; auditorNotes?: string },
  ) {
    return this.findingService.updateStatus(id, body.status, body.auditorNotes);
  }
}
