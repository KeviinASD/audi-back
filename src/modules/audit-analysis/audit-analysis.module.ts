// audit-analysis/audit-analysis.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAuditReport } from './entities/ai-audit-report.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { Laboratory } from 'src/modules/equipos/entities/laboratory.entity';
import { HardwareSnapshot } from 'src/modules/hardware/entities/hardware-snapshot.entity';
import { SoftwareInstalled } from 'src/modules/software/entities/software-installed.entity';
import { SecuritySnapshot } from 'src/modules/security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from 'src/modules/performance/entities/performance-snapshot.entity';
import { DailyConsolidatorService } from './services/daily-consolidator.service';
import { AiAnalysisService } from './services/ai-analysis.service';
import { FindingService } from './services/finding.service';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { AiProviderService } from './providers/ai-provider.service';
import { AuditAnalysisController } from './audit-analysis.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiAuditReport,
      AuditFinding,
      Equipment,
      Laboratory,
      HardwareSnapshot,
      SoftwareInstalled,
      SecuritySnapshot,
      PerformanceSnapshot,
    ]),
  ],
  controllers: [AuditAnalysisController],
  providers: [
    // Providers de IA
    OpenAiProvider,
    ClaudeProvider,
    AiProviderService,
    // Servicios del módulo
    DailyConsolidatorService,
    AiAnalysisService,
    FindingService,
  ],
})
export class AuditAnalysisModule {}
