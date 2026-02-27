// agent/dto/sync-agent.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HardwareSnapshotDto } from '../../hardware/dto/hardware-snapshot.dto';
import { SoftwareSnapshotDto } from '../../software/dto/software-snapshot.dto';
import { SecuritySnapshotDto } from '../../security/dto/security-snapshot.dto';
import { PerformanceSnapshotDto } from '../../performance/dto/performance-snapshot.dto';

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

  @ApiProperty({
    type: () => SecuritySnapshotDto,
    required: false,
    description: 'Security snapshot. Required when mode is "full".',
    example: {
      os: { name: 'Windows 10 Pro', version: '10.0.19045', build: '19045.3803', architecture: '64-bit' },
      windowsUpdate: { lastUpdateDate: '2025-11-10', daysSinceLastUpdate: 104, pendingUpdatesCount: 3, isCriticalUpdatePending: true },
      antivirus: { installed: true, enabled: true, name: 'Windows Defender', version: '4.18.2310.9', definitionsUpdated: true, lastScanDate: '2026-02-21' },
      firewall: { enabled: true, domainEnabled: true, privateEnabled: true, publicEnabled: true },
      passwordPolicy: { minLength: 6, maxAgeDays: 0, minAgeDays: 0, complexityEnabled: false, lockoutThreshold: 0 },
      localUsers: [{ username: 'alumno', isAdmin: false, isEnabled: true, lastLogin: '2026-02-21T14:30:00Z', passwordNeverExpires: false }],
      lastLoggedUser: 'alumno',
      lastLoginDate: '2026-02-21T14:30:00Z',
      currentLoggedUser: 'Administrador',
      uacEnabled: true,
      rdpEnabled: false,
      remoteRegistryEnabled: false,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SecuritySnapshotDto)
  security?: SecuritySnapshotDto;

  @ApiProperty({
    type: () => PerformanceSnapshotDto,
    required: false,
    description: 'Performance snapshot. Required in full mode, optional in quick mode.',
    example: {
      cpu: { usagePercent: 18.4, temperatureC: 47.0 },
      ram: { totalGB: 8, usedGB: 3.8 },
      disk: { totalGB: 500, usedGB: 210.4, temperatureC: 38.0, readSpeedMBs: 85.2, writeSpeedMBs: 42.6 },
      network: { sentMBs: 0.12, receivedMBs: 0.45, adapterName: 'Ethernet' },
      uptimeSeconds: 25200,
      lastBootTime: '2026-02-22T00:00:00.000Z',
      topProcessesByCpu: [{ pid: 1234, name: 'chrome.exe', cpuPercent: 8.2, ramMB: 412, status: 'running' }],
      topProcessesByRam: [{ pid: 1234, name: 'chrome.exe', cpuPercent: 8.2, ramMB: 412, status: 'running' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceSnapshotDto)
  performance?: PerformanceSnapshotDto;
}
