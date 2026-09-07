// governance/dto/approve-threshold.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Aprobar un umbral es el acto de gobierno: alguien con autoridad
 * declara que ese valor es el aceptable para la organización.
 * Sin aprobación, un umbral es sólo una sugerencia (COBIT EDM01).
 */
export class ApproveThresholdDto {
  @ApiProperty({
    example: 'Kevin Rivas — Responsable de TI',
    description: 'Nombre y cargo de quien aprueba el umbral.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  approvedBy: string;
}
