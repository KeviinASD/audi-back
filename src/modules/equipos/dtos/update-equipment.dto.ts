import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateEquipmentDto {
    @ApiProperty({ description: 'ID del laboratorio asignado', required: false })
    @IsUUID()
    @IsOptional()
    laboratoryId?: string;

    @ApiProperty({ description: 'Estado actual del equipo', enum: ['online', 'offline', 'warning', 'critical'], required: false })
    @IsEnum(['online', 'offline', 'warning', 'critical'])
    @IsOptional()
    status?: string;

    @ApiProperty({ description: 'Estado activo del equipo', required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
