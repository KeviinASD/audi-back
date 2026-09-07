// governance/dto/update-threshold.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsIn, IsOptional, IsString, MaxLength,
} from 'class-validator';

export class UpdateThresholdDto {
  @ApiPropertyOptional({
    example: '30',
    description: 'Valor de comparación del umbral. Texto para soportar números, booleanos y enumerados.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  value?: string;

  @ApiPropertyOptional({
    example: 'lte',
    enum: ['lte', 'gte', 'eq', 'neq', 'is_true', 'is_false'],
  })
  @IsOptional()
  @IsIn(['lte', 'gte', 'eq', 'neq', 'is_true', 'is_false'])
  operator?: string;

  @ApiPropertyOptional({
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical'],
    description: 'Severidad del hallazgo generado cuando el umbral se incumple.',
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severityOnBreach?: string;

  @ApiPropertyOptional({
    description: 'Justificación de por qué se eligió este valor. Es lo que se defiende en la auditoría.',
  })
  @IsOptional()
  @IsString()
  rationale?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Un umbral inactivo se conserva como historial pero no se evalúa.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
