import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Report } from '../entities/report.entity';
import { IngestReportDto } from '../dtos/ingest-report.dto';
import { EquiposService } from '../../equipos/services/equipos.service';

@Injectable()
export class ReportesService {
    private readonly logger = new Logger(ReportesService.name);

    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        private readonly equiposService: EquiposService,
        private readonly dataSource: DataSource,
    ) { }

    async create(ingestReportDto: IngestReportDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Find or create equipment
            const equipment = await this.equiposService.findOrCreateEquipment(
                ingestReportDto.Equipo,
                ingestReportDto.Sistema.IP_Local,
            );

            // 2. Create the report record
            const report = this.reportRepository.create({
                agentTimestamp: new Date(ingestReportDto.Timestamp), // Ensure date format is compatible
                receivedAt: new Date(),
                rawPayload: ingestReportDto as any,
                equipment: equipment,
                equipmentId: equipment.id,
                status: 'processed',
            });

            const savedReport = await queryRunner.manager.save(report);

            // TODO: Call other services to save specific data (System, Metrics, Security, Software, Processes)
            // Example: await this.systemInfoService.create(savedReport, ingestReportDto.Sistema, queryRunner);

            // Commit transaction
            await queryRunner.commitTransaction();

            this.logger.log(`Report processed for equipment: ${ingestReportDto.Equipo}`);
            return {
                message: 'Report received and processed successfully',
                reportId: savedReport.id,
                equipmentId: equipment.id
            };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Error processing report for ${ingestReportDto.Equipo}`, err.stack);
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll() {
        return this.reportRepository.find({
            relations: ['equipment'],
            order: { receivedAt: 'DESC' },
        });
    }

    async findOne(id: string) {
        return this.reportRepository.findOne({
            where: { id },
            relations: ['equipment'],
        });
    }
}
