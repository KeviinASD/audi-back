// audit-analysis/dto/equipment-detail.dto.ts
// Respuesta completa — solo se carga al hacer click en una PC del heat map

export interface SnapshotRef<T> {
  data: T | null;
  capturedAt: Date | null;
  stale: boolean;       // true si el dato es de una fecha distinta a la solicitada
  staleDays: number;
}

export interface EquipmentDailyDetail {
  equipment: {
    id: number;
    code: string;
    name: string;
    location: string;
  };
  status: 'operative' | 'degraded' | 'critical' | 'no-data';
  statusCompareToPrevDay: 'improved' | 'same' | 'worsened' | 'unknown';

  hardware:    SnapshotRef<any>;
  software:    SnapshotRef<any> & { riskyCount: number; totalCount: number };
  security:    SnapshotRef<any> & { hasRisk: boolean };
  performance: SnapshotRef<any>;
}
