// software/dto/create-authorized-software.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  IsNumber,
} from 'class-validator';

export class CreateAuthorizedSoftwareDto {
  @IsNotEmpty({ message: 'El nombre del software es requerido' })
  @IsString({ message: 'El nombre debe ser un texto' })
  name: string;

  @IsOptional()
  @IsString({ message: 'El editor debe ser un texto' })
  publisher?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  description?: string;

  @IsOptional()
  @IsNumber()
  laboratoryId?: number; // null = aplica a todos los laboratorios
}