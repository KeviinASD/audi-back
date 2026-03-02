import { HardwareSnapshot } from "src/modules/hardware/entities/hardware-snapshot.entity";
import { SecuritySnapshot } from "src/modules/security/entities/security-snapshot.entity";

export type EquipmentStatus = 'operative' | 'degraded' | 'critical' | 'no-data';

export function calculateEquipmentStatus(
  hw: HardwareSnapshot | null,
  sec: SecuritySnapshot | null,
): EquipmentStatus {

  if (!hw && !sec) return 'no-data';

  // Crítico
  const criticalTemp = (hw?.cpuTemperatureC ?? 0) > 85;
  const diskFailed   = hw?.diskSmartStatus === 'failed';
  const noAntivirus  = sec ? !sec.antivirusEnabled : false;
  const firewallOff  = sec ? !sec.firewallEnabled  : false;
  if (criticalTemp || diskFailed || noAntivirus || firewallOff) return 'critical';

  // Degradado
  const highTemp       = (hw?.cpuTemperatureC ?? 0) > 70;
  const highRamUsage   = hw && hw.ramTotalGB > 0
    ? (hw.ramUsedGB / hw.ramTotalGB) > 0.90
    : false;
  const criticalUpdate = sec?.isCriticalUpdatePending ?? false;
  const longNoUpdate   = (sec?.daysSinceLastUpdate ?? 0) > 90;
  if (highTemp || highRamUsage || criticalUpdate || longNoUpdate) return 'degraded';

  return 'operative';
}