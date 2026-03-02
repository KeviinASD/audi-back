// audit-analysis/services/ai-analysis.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAuditReport, AiAnalysisResult } from '../entities/ai-audit-report.entity';
import { AuditFinding } from '../entities/audit-finding.entity';
import { DailyConsolidatorService } from './daily-consolidator.service';
import { AiProviderService } from '../providers/ai-provider.service';
import { AiAnalysisRequestDto } from '../dto/ai-analysis-request.dto';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { Laboratory } from 'src/modules/equipos/entities/laboratory.entity';

@Injectable()
export class AiAnalysisService {

  constructor(
    @InjectRepository(AiAuditReport)
    private readonly reportRepo: Repository<AiAuditReport>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(Laboratory)
    private readonly laboratoryRepo: Repository<Laboratory>,
    private readonly consolidatorService: DailyConsolidatorService,
    private readonly aiProvider: AiProviderService,
  ) { }

  async analyzeEquipment(dto: AiAnalysisRequestDto): Promise<AiAuditReport> {
    if (!dto.equipmentId && !dto.laboratoryId) {
      throw new BadRequestException('equipmentId or laboratoryId is required');
    }

    const date = new Date(dto.date);

    const { context, equipment, laboratory } = dto.equipmentId
      ? await this.buildEquipmentContext(dto.equipmentId, date)
      : await this.buildLaboratoryContext(dto.laboratoryId!, date);

    const { analysis, tokensUsed } = await this.callAi(
      context,
      dto.equipmentId ? 'equipment' : 'laboratory',
    );

    const report = await this.reportRepo.save(
      this.reportRepo.create({
        scope: dto.equipmentId ? 'equipment' : 'laboratory',
        laboratory: laboratory ?? null,
        equipment: equipment ?? null,
        auditDate: date,
        sentContext: context,
        analysis,
        tokensUsed,
      }),
    );

    if (dto.autoCreateFindings && analysis.criticalFindings?.length) {
      await this.autoCreateFindings(analysis.criticalFindings, report, date);
    }

    return report;
  }

  // ── Construcción de contexto ──────────────────────────────────

  private async buildEquipmentContext(equipmentId: number, date: Date) {
    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipmentId },
      relations: ['laboratory'],
    });

    const detail = await this.consolidatorService.getEquipmentDetail(equipment!.id, date);

    const context = {
      auditDate: date.toISOString().split('T')[0],
      laboratory: equipment!.laboratory.name,
      equipment: detail.equipment,
      status: detail.status,
      statusChange: detail.statusCompareToPrevDay,
      hardware: detail.hardware.data,
      hardwareStale: detail.hardware.stale,
      software: {
        riskyCount: (detail.software as any).riskyCount,
        totalCount: (detail.software as any).totalCount,
        latestCapture: detail.software.capturedAt,
        stale: detail.software.stale,
        snapshot: detail.software.data,
      },
      security: detail.security.data,
      securityStale: detail.security.stale,
      performance: detail.performance.data,
    };

    return { context, equipment, laboratory: equipment!.laboratory };
  }

  private async buildLaboratoryContext(laboratoryId: number, date: Date) {
    const daily = await this.consolidatorService.getDailyHeatMap(laboratoryId, date);
    const laboratory = await this.laboratoryRepo.findOne({ where: { id: laboratoryId } });

    const context = {
      auditDate: date.toISOString().split('T')[0],
      laboratory: daily.laboratory,
      summary: daily.summary,
      // Solo equipos problemáticos para mantener el contexto manejable
      problematicEquipments: daily.equipments
        .filter(e => e.status !== 'operative')
        .map(e => ({
          code: e.equipment.code,
          status: e.status,
          statusChange: e.statusCompareToPrevDay,
          hasSecRisk: e.hasSecurityRisk,
          riskyApps: e.riskyAppsCount,
          isObsolete: e.isObsolete,
          lastSync: e.lastSync,
        })),
    };

    return { context, equipment: null, laboratory };
  }

  // ── Llamada al proveedor de IA ────────────────────────────────

  private async callAi(
    context: object,
    scope: 'equipment' | 'laboratory',
  ): Promise<{ analysis: AiAnalysisResult; tokensUsed: number }> {

    const scopeLabel = scope === 'equipment'
      ? 'una computadora específica de laboratorio universitario'
      : 'un laboratorio de cómputo universitario completo';

    const systemPrompt = `
Eres un auditor informático experto especializado en auditorías de infraestructura tecnológica
en instituciones de educación superior. Analizas datos técnicos recopilados automáticamente
de equipos de cómputo y generas hallazgos formales de auditoría.

Tu análisis debe basarse ÚNICAMENTE en los datos proporcionados. No inventes información.
Si un campo es null o stale (dato desactualizado), indícalo como limitación.

El marco normativo aplicable es: COBIT 2019, ISO/IEC 27001:2022, ISO/IEC 27002
y la normativa peruana (Ley N° 30096, NTP-ISO/IEC 17799).

Las pruebas del plan de auditoría son:
Hardware: PS-HW-01 (estado físico), PS-HW-02 (inventario), PS-HW-03 (rendimiento/temperatura),
          PS-HW-04 (mantenimiento), PS-HW-05 (obsolescencia), PS-HW-06 (protección eléctrica),
          PS-HW-07 (disposición de equipos)
Software: PS-SW-01 (actualizaciones SO), PS-SW-02 (antimalware), PS-SW-03 (licencias),
          PS-SW-04 (control de acceso), PS-SW-05 (rendimiento), PS-SW-06 (software no autorizado),
          PS-SW-07 (gestión de incidentes)

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin bloques de código,
sin explicaciones fuera del JSON. Usa exactamente esta estructura:
{
  "executiveSummary": "string",
  "criticalFindings": [
    {
      "equipmentCode": "string",
      "finding": "string",
      "auditTest": "string",
      "severity": "low | medium | high | critical",
      "recommendation": "string"
    }
  ],
  "generalObservations": ["string"],
  "positiveAspects": ["string"],
  "prioritizedRecommendations": ["string"]
}
`.trim();

    const userMessage = `
Analiza los siguientes datos de auditoría correspondientes a ${scopeLabel}:

${JSON.stringify(context, null, 2)}

Genera el análisis formal de auditoría siguiendo el formato JSON indicado.
`.trim();

    const { text, tokensUsed } = await this.aiProvider.call(systemPrompt, userMessage);
    console.log('Respuesta cruda del proveedor de IA:', text);
    const analysis: AiAnalysisResult = JSON.parse(this.stripMarkdown(text));
    console.log('Análisis parseado:', analysis);
    return { analysis, tokensUsed };
  }

  // Elimina bloques ```json ... ``` que algunos modelos añaden aunque se les pida JSON puro
  private stripMarkdown(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : text.trim();
  }

  // ── Auto-creación de hallazgos ────────────────────────────────

  private async autoCreateFindings(
    aiFindings: AiAnalysisResult['criticalFindings'],
    report: AiAuditReport,
    date: Date,
  ): Promise<void> {

    const findings = await Promise.all(
      aiFindings.map(async (f) => {
        const equipment = await this.equipmentRepo.findOne({
          where: { code: f.equipmentCode },
          relations: ['laboratory'],
        });

        if (!equipment) return null;

        return this.findingRepo.create({
          equipment,
          laboratory: equipment.laboratory,
          aiReport: report,
          findingDate: date,
          auditTest: f.auditTest,
          title: f.finding.substring(0, 100),
          description: f.finding,
          severity: f.severity,
          recommendation: f.recommendation,
          status: 'open',
          source: 'ai-generated',
        });
      }),
    );

    const validFindings = findings.filter(Boolean) as any[];
    if (validFindings.length) {
      await this.findingRepo.save(validFindings);
    }
  }

  // ── Historial de reportes ─────────────────────────────────────

  async getReportHistory(laboratoryId: number): Promise<AiAuditReport[]> {
    return this.reportRepo.find({
      where: { laboratory: { id: laboratoryId }, scope: 'laboratory' },
      order: { auditDate: 'DESC' },
      take: 30,
    });
  }
}
