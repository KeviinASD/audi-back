import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ReportesService } from '../services/reportes.service';
import { IngestReportDto } from '../dtos/ingest-report.dto';

// TODO: Import ApiKeyGuard when available or create a basic one for now
// import { ApiKeyGuard } from '../../auth/guards/api-key.guard';

@ApiTags('Reportes')
@Controller('reportes')
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) { }

    @Post('ingest')
    @ApiOperation({ summary: 'Recibir reporte del agente (Ingest)' })
    @ApiResponse({ status: 201, description: 'Reporte procesado correctamente.' })
    @ApiHeader({ name: 'x-api-key', description: 'API Key del laboratorio', required: true })
    // @UseGuards(ApiKeyGuard) // Uncomment when guard is ready
    async ingest(@Body() ingestReportDto: IngestReportDto, @Headers('x-api-key') apiKey: string) {
        // Temporary manual check until guard is implemented
        // if (!apiKey) throw new UnauthorizedException('API Key required');

        return this.reportesService.create(ingestReportDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los reportes' })
    findAll() {
        return this.reportesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver detalle de un reporte' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.reportesService.findOne(id);
    }
}
