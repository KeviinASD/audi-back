// dev/dev.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Matches } from 'class-validator';
import { DevService } from './dev.service';

const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?$/;

class CloneSnapshotsDto {
  @ApiProperty({ example: 12, description: 'ID del equipo origen' })
  @IsInt()
  sourceEquipmentId: number;

  @ApiProperty({
    example: '2026-02-27T10:30:00Z',
    description: 'Datetime exacto del snapshot origen (ISO 8601, UTC). Se busca con ventana de ±2 min.',
  })
  @IsString()
  @Matches(DATETIME_REGEX)
  sourceDateTime: string;

  @ApiProperty({ example: 15, description: 'ID del equipo destino' })
  @IsInt()
  targetEquipmentId: number;

  @ApiProperty({
    example: '2026-03-05T10:30:00Z',
    description: 'Datetime exacto con que se guardarán los snapshots clonados (ISO 8601, UTC).',
  })
  @IsString()
  @Matches(DATETIME_REGEX)
  targetDateTime: string;
}

@ApiTags('dev')
@Controller('dev')
export class DevController {

  constructor(private readonly devService: DevService) { }

  @Post('clone-snapshots')
  @ApiOperation({
    summary: 'Clonar snapshots de un equipo/datetime a otro equipo/datetime',
    description:
      'Duplica hardware, software, security y performance de un snapshot específico. ' +
      'Busca el snapshot más cercano al sourceDateTime (±2 min). Solo para uso en demo/expo.',
  })
  async cloneSnapshots(@Body() dto: CloneSnapshotsDto) {
    const result = await this.devService.cloneSnapshots(
      dto.sourceEquipmentId,
      dto.sourceDateTime,
      dto.targetEquipmentId,
      dto.targetDateTime,
    );
    return {
      message: 'Snapshots clonados exitosamente',
      cloned: result,
    };
  }
}
