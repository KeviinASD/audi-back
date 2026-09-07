// governance/governance.controller.ts

import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { ThresholdEvaluatorService } from './services/threshold-evaluator.service';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { ApproveThresholdDto } from './dto/approve-threshold.dto';

@ApiTags('governance')
@Controller('governance')
export class GovernanceController {

  constructor(
    private readonly governanceService: GovernanceService,
    private readonly evaluator: ThresholdEvaluatorService,
  ) {}

  // ── Cumplimiento: acá se cruzan los umbrales con los datos reales ──

  @Get('compliance')
  @ApiOperation({
    summary: 'Cumplimiento de todo el parque de equipos',
    description:
      'Evalúa cada equipo activo contra todos los umbrales aprobados. Incluye el ' +
      'ranking de qué umbral falla en más equipos, para priorizar dónde actuar.',
  })
  getParkCompliance() {
    return this.evaluator.evaluateAll();
  }

  @Get('compliance/equipment/:equipmentId')
  @ApiOperation({
    summary: 'Cumplimiento de un equipo puntual',
    description:
      'Por cada umbral devuelve el valor real que reportó el equipo, lo que exige ' +
      'la política, y si cumple, incumple o no hay dato.',
  })
  getEquipmentCompliance(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.evaluator.evaluateEquipment(equipmentId);
  }

  // ── Umbrales ──────────────────────────────────────────────────────

  @Get('thresholds')
  @ApiOperation({
    summary: 'Listado plano de umbrales de gobierno',
  })
  findAll() {
    return this.governanceService.findAll();
  }

  @Get('thresholds/grouped')
  @ApiOperation({
    summary: 'Umbrales agrupados por categoría, con resumen y metadatos de presentación',
    description:
      'Vista principal del dashboard. Incluye qué mide cada umbral, por qué importa ' +
      'y de qué estándar o norma sale el valor.',
  })
  findGrouped() {
    return this.governanceService.findGrouped();
  }

  @Get('severity-matrix')
  @ApiOperation({
    summary: 'Criterio aprobado para clasificar la severidad de un hallazgo',
    description:
      'Reemplaza el criterio propio del modelo de IA por una definición humana declarada.',
  })
  getSeverityMatrix() {
    return this.governanceService.getSeverityMatrix();
  }

  @Get('thresholds/:id')
  @ApiOperation({ summary: 'Detalle de un umbral' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.governanceService.findOne(id);
  }

  @Patch('thresholds/:id')
  @ApiOperation({
    summary: 'Modificar un umbral',
    description:
      'Cambiar el valor, el operador o la severidad revoca la aprobación vigente: ' +
      'lo aprobado antes ya no es lo que rige, y debe volver a aprobarse.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateThresholdDto,
  ) {
    return this.governanceService.update(id, dto);
  }

  @Post('thresholds/:id/approve')
  @ApiOperation({
    summary: 'Aprobar formalmente un umbral',
    description: 'Registra quién asume la decisión y cuándo (COBIT EDM01).',
  })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveThresholdDto,
  ) {
    return this.governanceService.approve(id, dto);
  }
}
