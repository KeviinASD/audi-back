import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../entities/equipment.entity';
import { CreateEquipmentDto } from '../dtos/create-equipment.dto';
import { UpdateEquipmentDto } from '../dtos/update-equipment.dto';
import { LaboratoryService } from './laboratories.service';

@Injectable()
export class EquipmentsService {
    constructor(
        @InjectRepository(Equipment)
        private readonly equipmentRepo: Repository<Equipment>,
        private readonly laboratoriesService: LaboratoryService,
    ) { }

    async createEquipment(dto: CreateEquipmentDto) {
        const existing = await this.equipmentRepo.findOne({ where: { code: dto.code } });
        if (existing) {
            throw new ConflictException(`Equipment with code "${dto.code}" already exists`);
        }

        const equipment = this.equipmentRepo.create({
            code: dto.code,
            name: dto.name,
            ubication: dto.ubication,
            isActive: dto.isActive ?? true,
        });

        if (dto.laboratoryId) {
            const lab = await this.laboratoriesService.findLaboratoryById(dto.laboratoryId);
            equipment.laboratory = lab;
        }

        return await this.equipmentRepo.save(equipment);
    }

    async findAll() {
        return await this.equipmentRepo.find({
            relations: ['laboratory'],
            order: { createdAt: 'DESC' },
        });
    }

    async findById(id: number) {
        const equipment = await this.equipmentRepo.findOne({
            where: { id },
            relations: ['laboratory'],
        });
        if (!equipment) throw new NotFoundException(`Equipment with ID "${id}" not found`);
        return equipment;
    }

    async updateEquipment(id: number, dto: UpdateEquipmentDto) {
        const equipment = await this.findById(id);

        if (dto.laboratoryId) {
            const lab = await this.laboratoriesService.findLaboratoryById(dto.laboratoryId);
            equipment.laboratory = lab;
        }

        if (dto.name !== undefined) equipment.name = dto.name;
        if (dto.ubication !== undefined) equipment.ubication = dto.ubication;
        if (dto.status !== undefined) equipment.status = dto.status;
        if (dto.isActive !== undefined) equipment.isActive = dto.isActive;

        return await this.equipmentRepo.save(equipment);
    }

    async deleteEquipment(id: number) {
        const equipment = await this.findById(id);
        await this.equipmentRepo.remove(equipment);
        return { message: `Equipment "${equipment.name}" (${equipment.code}) deleted successfully` };
    }

    // ─── Used by the agent / reports module ──────────────────────────────────

    async findByCode(code: string): Promise<Equipment | null> {
        return await this.equipmentRepo.findOne({
            where: { code },
            relations: ['laboratory'],
        });
    }
}
