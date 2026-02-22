import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateEquipmentDto {
    @ApiProperty({ description: 'Descriptive name of the equipment', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'Seat 5, row 2', description: 'Physical location inside the laboratory', required: false })
    @IsString()
    @IsOptional()
    ubication?: string;

    @ApiProperty({ description: 'ID of the assigned laboratory', required: false })
    @IsInt()
    @IsOptional()
    laboratoryId?: number;

    @ApiProperty({ description: 'Equipment status', enum: ['operativo', 'degradado', 'critico', 'sin-datos'], required: false })
    @IsEnum(['operativo', 'degradado', 'critico', 'sin-datos'])
    @IsOptional()
    status?: string;

    @ApiProperty({ description: 'Whether the equipment is active in the system', required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
