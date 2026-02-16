import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../entities/equipment.entity';
import { UpdateEquipmentDto } from '../dtos/update-equipment.dto';
import { LaboratoriesService } from './laboratories.service';

@Injectable()
export class EquiposService {
    constructor(
        @InjectRepository(Equipment)
        private readonly equipmentRepo: Repository<Equipment>,
        private readonly laboratoriesService: LaboratoriesService,
    ) { }

    async findAllEquipos() {
        return await this.equipmentRepo.find({
            relations: ['laboratory'],
            order: { lastSeenAt: 'DESC' },
        });
    }

    async findEquipoById(id: string) {
        const eq = await this.equipmentRepo.findOne({
            where: { id },
            relations: ['laboratory'], // 'reports' relation commented out in entity
        });
        if (!eq) throw new NotFoundException(`Equipment with ID ${id} not found`);
        return eq;
    }

    async updateEquipo(id: string, updateEquipmentDto: UpdateEquipmentDto) {
        const eq = await this.findEquipoById(id);

        if (updateEquipmentDto.laboratoryId) {
            // Validate laboratory exists via LaboratoriesService
            const lab = await this.laboratoriesService.findLaboratoryById(updateEquipmentDto.laboratoryId);
            eq.laboratory = lab;
            eq.laboratoryId = lab.id; // Explicit foreign key set sometimes helps
        }

        if (updateEquipmentDto.status) eq.status = updateEquipmentDto.status;
        if (updateEquipmentDto.isActive !== undefined) eq.isActive = updateEquipmentDto.isActive;

        return await this.equipmentRepo.save(eq);
    }

    // Helper or internal method for auto-registration (to be used by Ingest module later)
    async findOrCreateEquipment(hostname: string, ipAddress?: string): Promise<Equipment> {
        let eq = await this.equipmentRepo.findOne({ where: { hostname } });

        if (!eq) {
            eq = this.equipmentRepo.create({
                hostname,
                status: 'unknown',
                ipAddress,
                lastSeenAt: new Date(),
            });
            await this.equipmentRepo.save(eq);
        } else {
            // Update lastSeen logic could be here or in Ingest service
            // For now, return the existing one
        }

        return eq;
    }
}
