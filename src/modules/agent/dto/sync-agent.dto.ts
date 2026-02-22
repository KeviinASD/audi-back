// agent/dto/sync-agent.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HardwareSnapshotDto } from '../../hardware/dto/hardware-snapshot.dto';
import { SoftwareSnapshotDto } from '../../software/dto/software-snapshot.dto';

export class SyncAgentDto {
  @ApiProperty({
    example: 'LAB01-PC05',
    description: 'Unique code of the equipment registered in the system. Must match an existing equipment.',
  })
  @IsString()
  @IsNotEmpty()
  equipmentCode: string;

  @ApiProperty({
    example: 'full',
    enum: ['full', 'quick'],
    description: '"full" sends hardware + software data. "quick" only updates last connection timestamp.',
  })
  @IsEnum(['full', 'quick'])
  mode: 'full' | 'quick';

  @ApiProperty({
    example: '2026-02-22T07:00:00Z',
    description: 'Timestamp of the sync execution on the agent side (ISO 8601).',
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    type: () => HardwareSnapshotDto,
    required: false,
    description: 'Hardware snapshot. Required when mode is "full".',
    example: {
      cpu: { model: 'Intel Core i5-10400', cores: 6, frequencyGHz: 2.9, usagePercent: 34.5, temperatureC: 52 },
      ram: { totalGB: 8, usedGB: 4.2, type: 'DDR4', frequencyMHz: 2666 },
      disk: { capacityGB: 500, usedGB: 210.4, type: 'SSD', model: 'Samsung 870 EVO', smartStatus: 'good' },
      physicalEquipment: { brand: 'Dell', model: 'OptiPlex 5080', serialNumber: '4XB0S75674', manufactureYear: '2021', architecture: '64bit' },
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HardwareSnapshotDto)
  hardware?: HardwareSnapshotDto;

  @ApiProperty({
    type: () => SoftwareSnapshotDto,
    required: false,
    description: 'Installed software list. Required when mode is "full".',
    example: {
      items: [
        { name: 'Python 3.11.4', version: '3.11.4', publisher: 'Python Software Foundation', installedAt: '2024-03-15' },
        { name: 'Visual Studio Code', version: '1.87.0', publisher: 'Microsoft Corporation', installedAt: '2024-01-10' },
        { name: 'Cisco Packet Tracer', version: '8.2.1', publisher: 'Cisco', installedAt: '2023-08-20' },
      ],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SoftwareSnapshotDto)
  software?: SoftwareSnapshotDto;
}
