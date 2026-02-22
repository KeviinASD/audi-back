import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Laboratory } from '../entities/laboratory.entity';
import { CreateLaboratoryDto } from '../dtos/create-laboratory.dto';
import { UpdateLaboratoryDto } from '../dtos/update-laboratory.dto';

@Injectable()
export class LaboratoryService {
    constructor(
        @InjectRepository(Laboratory)
        private readonly laboratoryRepo: Repository<Laboratory>,
    ) { }

    async createLaboratory(createLaboratoryDto: CreateLaboratoryDto) {
        const lab = this.laboratoryRepo.create(createLaboratoryDto);
        return await this.laboratoryRepo.save(lab);
    }

    async findAllLaboratories() {
        return await this.laboratoryRepo.find({
            relations: ['equipos'],
            order: { createdAt: 'DESC' },
        });
    }

    async findLaboratoryById(id: number) {
        const lab = await this.laboratoryRepo.findOne({
            where: { id },
            relations: ['equipos'],
        });
        if (!lab) throw new NotFoundException(`Laboratory with ID ${id} not found`);
        return lab;
    }

    async updateLaboratory(id: number, updateLaboratoryDto: UpdateLaboratoryDto) {
        const lab = await this.findLaboratoryById(id);
        Object.assign(lab, updateLaboratoryDto);
        return await this.laboratoryRepo.save(lab);
    }
}
