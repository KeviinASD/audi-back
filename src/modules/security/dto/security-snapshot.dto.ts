// security/dto/security-snapshot.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsBoolean, IsNumber, IsOptional,
  IsDateString, IsArray, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class OsInfoDto {
  @ApiProperty({ example: 'Windows 10 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: '10.0.19045' })
  @IsString()
  version: string;

  @ApiProperty({ example: '19045.3803' })
  @IsString()
  build: string;

  @ApiProperty({ example: '64-bit' })
  @IsString()
  architecture: string;
}

export class WindowsUpdateDto {
  @ApiProperty({ example: '2025-11-10', required: false })
  @IsDateString()
  @IsOptional()
  lastUpdateDate?: string;

  @ApiProperty({ example: 104 })
  @IsNumber()
  daysSinceLastUpdate: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  pendingUpdatesCount: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCriticalUpdatePending: boolean;
}

export class AntivirusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  installed: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 'Windows Defender', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '4.18.2310.9', required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  definitionsUpdated: boolean;

  @ApiProperty({ example: '2026-02-21', required: false })
  @IsDateString()
  @IsOptional()
  lastScanDate?: string;
}

export class FirewallDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  domainEnabled: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  privateEnabled: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  publicEnabled: boolean;
}

export class PasswordPolicyDto {
  @ApiProperty({ example: 6 })
  @IsNumber()
  minLength: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  maxAgeDays: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  minAgeDays: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  complexityEnabled: boolean;

  @ApiProperty({ example: 0 })
  @IsNumber()
  lockoutThreshold: number;
}

export class LocalUserDto {
  @ApiProperty({ example: 'alumno' })
  @IsString()
  username: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isAdmin: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({ example: '2026-02-21T14:30:00Z', required: false })
  @IsString()
  @IsOptional()
  lastLogin: string | null;

  @ApiProperty({ example: false })
  @IsBoolean()
  passwordNeverExpires: boolean;
}

export class SecuritySnapshotDto {
  @ApiProperty({ type: () => OsInfoDto })
  @ValidateNested()
  @Type(() => OsInfoDto)
  os: OsInfoDto;

  @ApiProperty({ type: () => WindowsUpdateDto })
  @ValidateNested()
  @Type(() => WindowsUpdateDto)
  windowsUpdate: WindowsUpdateDto;

  @ApiProperty({ type: () => AntivirusDto })
  @ValidateNested()
  @Type(() => AntivirusDto)
  antivirus: AntivirusDto;

  @ApiProperty({ type: () => FirewallDto })
  @ValidateNested()
  @Type(() => FirewallDto)
  firewall: FirewallDto;

  @ApiProperty({ type: () => PasswordPolicyDto })
  @ValidateNested()
  @Type(() => PasswordPolicyDto)
  passwordPolicy: PasswordPolicyDto;

  @ApiProperty({ type: () => [LocalUserDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalUserDto)
  localUsers: LocalUserDto[];

  @ApiProperty({ example: 'alumno', required: false })
  @IsString()
  @IsOptional()
  lastLoggedUser?: string;

  @ApiProperty({ example: '2026-02-21T14:30:00Z', required: false })
  @IsString()
  @IsOptional()
  lastLoginDate?: string;

  @ApiProperty({ example: 'Administrador', required: false })
  @IsString()
  @IsOptional()
  currentLoggedUser?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  uacEnabled: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  rdpEnabled: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  remoteRegistryEnabled: boolean;
}
