// audit-analysis/dto/ai-analysis-request.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AiAnalysisRequestDto {
  @ApiProperty({ required: false, example: 5, description: 'ID del equipo a analizar (exclusivo con laboratoryId)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  equipmentId?: number;

  @ApiProperty({ required: false, example: 1, description: 'ID del laboratorio a analizar (exclusivo con equipmentId)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  laboratoryId?: number;

  @ApiProperty({ example: '2026-02-22', description: 'Fecha del análisis (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: true, description: 'Si true, auto-crea hallazgos críticos en audit_findings' })
  @IsBoolean()
  autoCreateFindings: boolean;
}
