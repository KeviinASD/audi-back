// software/dto/software-snapshot.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { LicenseStatus } from 'src/common/enums/license-status.enum';

export class SoftwareItemDto {
  @ApiProperty({ example: 'Python 3.11.4', description: 'Software name and version string' })
  @IsString()
  name: string;

  @ApiProperty({ example: '3.11.4', description: 'Software version', required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ example: 'Python Software Foundation', description: 'Publisher or vendor name', required: false })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiProperty({ example: '2024-03-15', description: 'Installation date (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  installedAt?: string;

  @ApiProperty({
    example: LicenseStatus.LICENSED,
    enum: LicenseStatus,
    description: 'License status of the software. Defaults to "unknown" if not provided.',
    required: false,
  })
  @IsEnum(LicenseStatus)
  @IsOptional()
  licenseStatus?: LicenseStatus;
}

export class SoftwareSnapshotDto {
  @ApiProperty({
    type: () => [SoftwareItemDto],
    description: 'List of installed software on the equipment',
    example: [
      { name: 'Python 3.11.4', version: '3.11.4', publisher: 'Python Software Foundation', installedAt: '2024-03-15', licenseStatus: 'licensed' },
      { name: 'Visual Studio Code', version: '1.87.0', publisher: 'Microsoft Corporation', installedAt: '2024-01-10', licenseStatus: 'licensed' },
      { name: 'Cisco Packet Tracer', version: '8.2.1', publisher: 'Cisco', installedAt: '2023-08-20' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoftwareItemDto)
  items: SoftwareItemDto[];
}
