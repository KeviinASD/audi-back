import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateEquipmentDto {
    @ApiProperty({ example: 'LAB01-PC05', description: 'Unique code of the equipment (installed in the agent script)' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'PC-05 Laboratory 1', description: 'Descriptive name of the equipment' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Seat 5, row 2', description: 'Physical location inside the laboratory', required: false })
    @IsString()
    @IsOptional()
    ubication?: string;

    @ApiProperty({ description: 'ID of the laboratory this equipment belongs to', required: false })
    @IsInt()
    @IsOptional()
    laboratoryId?: number;

    @ApiProperty({ example: true, description: 'Whether the equipment is active in the system', required: false, default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
