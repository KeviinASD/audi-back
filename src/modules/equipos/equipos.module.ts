import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentsService } from './services/equipment.service';
import { LaboratoryService } from './services/laboratories.service';
import { EquipmentController } from './controllers/equipment.controller';
import { LaboratoriesController } from './controllers/laboratory.controller';
import { Equipment } from './entities/equipment.entity';
import { Laboratory } from './entities/laboratory.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Equipment, Laboratory])],
    controllers: [EquipmentController, LaboratoriesController],
    providers: [EquipmentsService, LaboratoryService],
    exports: [EquipmentsService, LaboratoryService],
})
export class EquiposModule { }
