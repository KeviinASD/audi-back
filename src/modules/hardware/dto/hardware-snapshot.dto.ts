// hardware/dto/hardware-snapshot.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CpuDto {
  @ApiProperty({ example: 'Intel Core i5-10400', description: 'CPU model name' })
  @IsString()
  model: string;

  @ApiProperty({ example: 6, description: 'Number of physical cores' })
  @IsNumber()
  cores: number;

  @ApiProperty({ example: 2.9, description: 'Base frequency in GHz' })
  @IsNumber()
  frequencyGHz: number;

  @ApiProperty({ example: 34.5, description: 'Current CPU usage percentage (0–100)' })
  @IsNumber()
  usagePercent: number;

  @ApiProperty({ example: 52, description: 'CPU temperature in Celsius (null if sensor unavailable)', required: false })
  @IsNumber()
  @IsOptional()
  temperatureC?: number;
}

export class RamDto {
  @ApiProperty({ example: 8, description: 'Total RAM in GB' })
  @IsNumber()
  totalGB: number;

  @ApiProperty({ example: 4.2, description: 'Used RAM in GB' })
  @IsNumber()
  usedGB: number;

  @ApiProperty({ example: 'DDR4', description: 'RAM type (DDR3, DDR4, DDR5)', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 2666, description: 'RAM frequency in MHz', required: false })
  @IsNumber()
  @IsOptional()
  frequencyMHz?: number;
}

export class DiskDto {
  @ApiProperty({ example: 500, description: 'Total disk capacity in GB' })
  @IsNumber()
  capacityGB: number;

  @ApiProperty({ example: 210.4, description: 'Used disk space in GB' })
  @IsNumber()
  usedGB: number;

  @ApiProperty({ example: 'SSD', description: 'Disk type: HDD, SSD or NVMe', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 'Samsung 870 EVO', description: 'Disk model name', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ example: 'good', description: 'S.M.A.R.T. status: good, warning, failed or unknown', required: false })
  @IsString()
  @IsOptional()
  smartStatus?: string;
}

export class PhysicalEquipmentDto {
  @ApiProperty({ example: 'Dell', description: 'Equipment brand/manufacturer', required: false })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ example: 'OptiPlex 5080', description: 'Equipment model', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ example: '4XB0S75674', description: 'Serial number of the equipment', required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ example: '2021', description: 'Manufacture year', required: false })
  @IsString()
  @IsOptional()
  manufactureYear?: string;

  @ApiProperty({ example: '64bit', description: 'System architecture', required: false })
  @IsString()
  @IsOptional()
  architecture?: string;
}

export class HardwareSnapshotDto {
  @ApiProperty({ type: () => CpuDto, description: 'CPU information' })
  @ValidateNested()
  @Type(() => CpuDto)
  cpu: CpuDto;

  @ApiProperty({ type: () => RamDto, description: 'RAM information' })
  @ValidateNested()
  @Type(() => RamDto)
  ram: RamDto;

  @ApiProperty({ type: () => DiskDto, description: 'Primary disk information' })
  @ValidateNested()
  @Type(() => DiskDto)
  disk: DiskDto;

  @ApiProperty({ type: () => PhysicalEquipmentDto, description: 'Physical equipment details' })
  @ValidateNested()
  @Type(() => PhysicalEquipmentDto)
  physicalEquipment: PhysicalEquipmentDto;
}
