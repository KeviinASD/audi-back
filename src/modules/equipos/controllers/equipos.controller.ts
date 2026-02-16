import { Controller, Get, Param, Patch, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EquiposService } from '../services/equipos.service';
import { UpdateEquipmentDto } from '../dtos/update-equipment.dto';

@ApiTags('Equipos')
@Controller('equipos')
export class EquiposController {
    constructor(private readonly equiposService: EquiposService) { }

    @Get()
    @ApiOperation({ summary: 'Listar todos los equipos con estado actual' })
    @ApiResponse({ status: 200, description: 'Lista de equipos recuperada con éxito.' })
    findAll() {
        return this.equiposService.findAllEquipos();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Detalle de un equipo' })
    @ApiResponse({ status: 200, description: 'Equipo encontrado.' })
    @ApiResponse({ status: 404, description: 'Equipo no encontrado.' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.equiposService.findEquipoById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar laboratorio asignado, notas o estado' })
    @ApiResponse({ status: 200, description: 'Equipo actualizado.' })
    @ApiResponse({ status: 404, description: 'Equipo no encontrado.' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateEquipmentDto: UpdateEquipmentDto) {
        return this.equiposService.updateEquipo(id, updateEquipmentDto);
    }

    @Get(':id/historial')
    @ApiOperation({ summary: 'Historial de reportes de un equipo' })
    @ApiResponse({ status: 200, description: 'Historial recuperado.' })
    getHistory(@Param('id', ParseUUIDPipe) id: string) {
        // TODO: Implement history retrieval once Reports module is ready
        return { message: 'Historial endpoint placeholder', equipmentId: id, history: [] };
    }
}
