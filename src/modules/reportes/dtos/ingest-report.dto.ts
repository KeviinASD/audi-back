import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class SistemaDto {
    @IsString()
    Version: string;
    @IsString()
    Arquitectura: string;
    @IsString()
    BIOS_Ver: string;
    @IsString()
    Instalado: string;
    @IsString()
    IP_Local: string;
    @IsString()
    OS: string;
    @IsString()
    BIOS_Fecha: string;
    @IsString()
    Win_Estado: string;
}

export class MetricasDto {
    @IsNumber()
    Temp_C: number;
    @IsNumber()
    CPU_Carga: number;
    @IsNumber()
    RAM_Uso_Porc: number;
}

export class AlmacenamientoDto {
    @IsString()
    DeviceID: string;
    @IsNumber()
    Total_GB: number;
    @IsNumber()
    Libre_GB: number;
    @IsNumber()
    Porcentaje_Libre: number;
}

export class AntivirusDto {
    @IsString()
    displayName: string;
    @IsString()
    Estado: string;
}

export class InstalledOnDto {
    @IsString()
    value: string;
    @IsString()
    DateTime: string;
}

export class ParcheDto {
    @IsString()
    HotFixID: string;
    @IsString()
    Description: string;
    @ValidateNested()
    @Type(() => InstalledOnDto)
    InstalledOn: InstalledOnDto;
}

export class SeguridadDto {
    @ValidateNested()
    @Type(() => AntivirusDto)
    Antivirus: AntivirusDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ParcheDto)
    Parches: ParcheDto[];
}

export class SoftwareItemDto {
    @IsString()
    Name: string;
    @IsString()
    Estado: string;
}

export class ProcesoDto {
    @IsString()
    Name: string;
    @IsNumber()
    CPU: number;
    @IsNumber()
    RAM_MB: number;
}

export class IngestReportDto {
    @IsString()
    Timestamp: string;

    @IsString()
    Equipo: string;

    @IsString()
    Usuario: string;

    @ValidateNested()
    @Type(() => SistemaDto)
    Sistema: SistemaDto;

    @ValidateNested()
    @Type(() => MetricasDto)
    Metricas: MetricasDto;

    @ValidateNested()
    @Type(() => AlmacenamientoDto)
    Almacenamiento: AlmacenamientoDto;

    @ValidateNested()
    @Type(() => SeguridadDto)
    Seguridad: SeguridadDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SoftwareItemDto)
    Software: SoftwareItemDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProcesoDto)
    TopProcesos: ProcesoDto[];
}
