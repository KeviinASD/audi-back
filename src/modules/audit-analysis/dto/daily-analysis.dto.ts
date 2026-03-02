// audit-analysis/dto/daily-analysis.dto.ts
// Respuesta liviana para el heat map — solo lo necesario para renderizar cada celda

export interface EquipmentHeatMapItem {
  equipment: {
    id: number;
    code: string;
    name: string;
    location: string;
  };
  status: 'operative' | 'degraded' | 'critical' | 'no-data';
  statusCompareToPrevDay: 'improved' | 'same' | 'worsened' | 'unknown';

  // Flags para íconos de advertencia en la celda del heat map
  isObsolete: boolean;
  hasSecurityRisk: boolean;
  riskyAppsCount: number;

  // Fecha del sync más reciente disponible hasta el día consultado
  lastSync: Date | null;
}

export interface DailyLaboratoryHeatMap {
  laboratory: {
    id: number;
    name: string;
    location: string;
  };
  date: string;
  summary: {
    total: number;
    operative: number;
    degraded: number;
    critical: number;
    noData: number;
    withSecurityRisk: number;
    withRiskySoftware: number;
    obsolete: number;
  };
  equipments: EquipmentHeatMapItem[];
}
