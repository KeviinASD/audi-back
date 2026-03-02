// audit-analysis/services/finding.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditFinding } from '../entities/audit-finding.entity';

export interface TrendResult {
  auditTest: string;
  severity: string;
  count: string;
}

@Injectable()
export class FindingService {

  constructor(
    @InjectRepository(AuditFinding)
    private readonly repo: Repository<AuditFinding>,
  ) {}

  async getOpenFindings(laboratoryId: number): Promise<AuditFinding[]> {
    return this.repo.find({
      where: { laboratory: { id: laboratoryId }, status: 'open' },
      relations: ['equipment'],
      order: { severity: 'DESC', findingDate: 'DESC' },
    });
  }

  async getFindingsByEquipment(equipmentId: number): Promise<AuditFinding[]> {
    return this.repo.find({
      where: { equipment: { id: equipmentId } },
      order: { findingDate: 'DESC' },
    });
  }

  async getTrendsByAuditTest(laboratoryId: number): Promise<TrendResult[]> {
    const findings = await this.repo.find({
      where: { laboratory: { id: laboratoryId } },
      select: ['auditTest', 'severity'],
    });

    const groups = new Map<string, number>();
    for (const f of findings) {
      const key = `${f.auditTest}||${f.severity}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }

    return Array.from(groups.entries())
      .map(([key, count]) => {
        const [auditTest, severity] = key.split('||');
        return { auditTest, severity, count: String(count) };
      })
      .sort((a, b) => Number(b.count) - Number(a.count));
  }

  async getRecurringEquipments(
    laboratoryId: number,
    minFindings: number = 3,
  ): Promise<any[]> {
    const findings = await this.repo.find({
      where: { laboratory: { id: laboratoryId }, status: 'open' },
      relations: ['equipment'],
    });

    const groups = new Map<number, { code: string; count: number }>();
    for (const f of findings) {
      const prev = groups.get(f.equipment.id);
      if (prev) {
        prev.count++;
      } else {
        groups.set(f.equipment.id, { code: f.equipment.code, count: 1 });
      }
    }

    return Array.from(groups.entries())
      .filter(([, { count }]) => count >= minFindings)
      .map(([equipmentId, { code, count }]) => ({
        equipmentId,
        equipmentCode: code,
        findingCount: count,
      }))
      .sort((a, b) => b.findingCount - a.findingCount);
  }

  async updateStatus(
    id: number,
    status: string,
    auditorNotes?: string,
  ): Promise<AuditFinding> {
    const finding = await this.repo.findOne({ where: { id } });
    if (!finding) throw new NotFoundException(`Finding ${id} not found`);

    finding.status       = status;
    finding.auditorNotes = auditorNotes ?? finding.auditorNotes;
    return this.repo.save(finding);
  }
}
