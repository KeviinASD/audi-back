import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './controllers/reportes.controller';
import { ReportesService } from './services/reportes.service';
import { Report } from './entities/report.entity';
import { EquiposModule } from '../equipos/equipos.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Report]),
        EquiposModule, // To use EquiposService for findOrCreateEquipment
    ],
    controllers: [ReportesController],
    providers: [ReportesService],
    exports: [ReportesService],
})
export class ReportesModule { }
