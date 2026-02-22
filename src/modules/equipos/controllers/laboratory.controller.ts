import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LaboratoryService } from '../services/laboratories.service';
import { CreateLaboratoryDto } from '../dtos/create-laboratory.dto';
import { UpdateLaboratoryDto } from '../dtos/update-laboratory.dto';

@ApiTags('Laboratories')
@Controller('laboratorios')
export class LaboratoriesController {
    constructor(private readonly laboratoriesService: LaboratoryService) { }

    @Post()
    @ApiOperation({ summary: 'Crear laboratorio' })
    @ApiResponse({ status: 201, description: 'Laboratorio creado.' })
    create(@Body() createLaboratoryDto: CreateLaboratoryDto) {
        return this.laboratoriesService.createLaboratory(createLaboratoryDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar laboratorios' })
    @ApiResponse({ status: 200, description: 'Lista de laboratorios recuperada.' })
    findAll() {
        return this.laboratoriesService.findAllLaboratories();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Detalle de un laboratorio' })
    @ApiResponse({ status: 200, description: 'Laboratorio encontrado.' })
    @ApiResponse({ status: 404, description: 'Laboratorio no encontrado.' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.laboratoriesService.findLaboratoryById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar laboratorio' })
    @ApiResponse({ status: 200, description: 'Laboratorio actualizado.' })
    @ApiResponse({ status: 404, description: 'Laboratorio no encontrado.' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateLaboratoryDto: UpdateLaboratoryDto) {
        return this.laboratoriesService.updateLaboratory(id, updateLaboratoryDto);
    }
}
