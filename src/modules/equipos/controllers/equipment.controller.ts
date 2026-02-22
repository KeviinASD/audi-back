import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EquipmentsService } from '../services/equipment.service';
import { CreateEquipmentDto } from '../dtos/create-equipment.dto';
import { UpdateEquipmentDto } from '../dtos/update-equipment.dto';

@ApiTags('Equipment')
@Controller('equipment')
export class EquipmentController {
    constructor(private readonly equipmentsService: EquipmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Register a new equipment manually' })
    @ApiResponse({ status: 201, description: 'Equipment registered successfully.' })
    @ApiResponse({ status: 409, description: 'Equipment with that code already exists.' })
    create(@Body() createEquipmentDto: CreateEquipmentDto) {
        return this.equipmentsService.createEquipment(createEquipmentDto);
    }

    @Get()
    @ApiOperation({ summary: 'List all equipment with current status' })
    @ApiResponse({ status: 200, description: 'Equipment list retrieved successfully.' })
    findAll() {
        return this.equipmentsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get equipment detail' })
    @ApiResponse({ status: 200, description: 'Equipment found.' })
    @ApiResponse({ status: 404, description: 'Equipment not found.' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.equipmentsService.findById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update equipment data (name, location, laboratory, status)' })
    @ApiResponse({ status: 200, description: 'Equipment updated.' })
    @ApiResponse({ status: 404, description: 'Equipment not found.' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateEquipmentDto: UpdateEquipmentDto) {
        return this.equipmentsService.updateEquipment(id, updateEquipmentDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete equipment from the system' })
    @ApiResponse({ status: 200, description: 'Equipment deleted.' })
    @ApiResponse({ status: 404, description: 'Equipment not found.' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.equipmentsService.deleteEquipment(id);
    }

    @Get(':id/history')
    @ApiOperation({ summary: 'Equipment report history' })
    @ApiResponse({ status: 200, description: 'History retrieved.' })
    getHistory(@Param('id', ParseIntPipe) id: number) {
        // TODO: Implement when Reports module is ready
        return { message: 'History endpoint placeholder', equipmentId: id, history: [] };
    }
}
