import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateLaboratoryDto {
    @ApiProperty({ example: 'Laboratorio A', description: 'Nombre del laboratorio' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Pabellón H, 2do piso', description: 'Ubicación física', required: false })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiProperty({ example: 'Dr. Luis Boy Chavil', description: 'Responsable del laboratorio', required: false })
    @IsString()
    @IsOptional()
    responsible?: string;

    @ApiProperty({ example: 'lboy@unitru.edu.pe', description: 'Email del responsable', required: false })
    @IsEmail()
    @IsOptional()
    responsibleEmail?: string;

    @ApiProperty({ example: true, description: 'Estado activo del laboratorio', required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
