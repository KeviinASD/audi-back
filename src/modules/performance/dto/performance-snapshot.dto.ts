// performance/dto/performance-snapshot.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber, IsString, IsOptional, IsArray,
  ValidateNested, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CpuMetricsDto {
  @ApiProperty({ example: 18.4 })
  @IsNumber()
  usagePercent: number;

  @ApiProperty({ example: 47.0, required: false })
  @IsNumber()
  @IsOptional()
  temperatureC?: number;
}

export class RamMetricsDto {
  @ApiProperty({ example: 8 })
  @IsNumber()
  totalGB: number;

  @ApiProperty({ example: 3.8 })
  @IsNumber()
  usedGB: number;
}

export class DiskMetricsDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  totalGB: number;

  @ApiProperty({ example: 210.4 })
  @IsNumber()
  usedGB: number;

  @ApiProperty({ example: 38.0, required: false })
  @IsNumber()
  @IsOptional()
  temperatureC?: number;

  @ApiProperty({ example: 85.2, required: false })
  @IsNumber()
  @IsOptional()
  readSpeedMBs?: number;

  @ApiProperty({ example: 42.6, required: false })
  @IsNumber()
  @IsOptional()
  writeSpeedMBs?: number;
}

export class NetworkMetricsDto {
  @ApiProperty({ example: 0.12 })
  @IsNumber()
  sentMBs: number;

  @ApiProperty({ example: 0.45 })
  @IsNumber()
  receivedMBs: number;

  @ApiProperty({ example: 'Ethernet', required: false })
  @IsString()
  @IsOptional()
  adapterName?: string;
}

export class ProcessInfoDto {
  @ApiProperty({ example: 1234 })
  @IsNumber()
  pid: number;

  @ApiProperty({ example: 'chrome.exe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 8.2 })
  @IsNumber()
  cpuPercent: number;

  @ApiProperty({ example: 412 })
  @IsNumber()
  ramMB: number;

  @ApiProperty({ example: 'running' })
  @IsString()
  status: string;
}

export class PerformanceSnapshotDto {
  @ApiProperty({ type: () => CpuMetricsDto })
  @ValidateNested()
  @Type(() => CpuMetricsDto)
  cpu: CpuMetricsDto;

  @ApiProperty({ type: () => RamMetricsDto })
  @ValidateNested()
  @Type(() => RamMetricsDto)
  ram: RamMetricsDto;

  @ApiProperty({ type: () => DiskMetricsDto })
  @ValidateNested()
  @Type(() => DiskMetricsDto)
  disk: DiskMetricsDto;

  @ApiProperty({ type: () => NetworkMetricsDto })
  @ValidateNested()
  @Type(() => NetworkMetricsDto)
  network: NetworkMetricsDto;

  @ApiProperty({ example: 25200 })
  @IsNumber()
  uptimeSeconds: number;

  @ApiProperty({ example: '2026-02-22T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  lastBootTime?: string;

  @ApiProperty({ type: () => [ProcessInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessInfoDto)
  topProcessesByCpu: ProcessInfoDto[];

  @ApiProperty({ type: () => [ProcessInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessInfoDto)
  topProcessesByRam: ProcessInfoDto[];
}
