import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquiposService } from './services/equipos.service';
import { LaboratoriesService } from './services/laboratories.service';
import { EquiposController } from './controllers/equipos.controller';
import { LaboratoriesController } from './controllers/laboratories.controller';
import { Equipment } from './entities/equipment.entity';
import { Laboratory } from './entities/laboratory.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Equipment, Laboratory])],
    controllers: [EquiposController, LaboratoriesController],
    providers: [EquiposService, LaboratoriesService],
    exports: [EquiposService, LaboratoriesService],
})
export class EquiposModule { }
