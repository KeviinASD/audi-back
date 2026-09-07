// governance/services/field-resolvers.ts

import { Equipment } from 'src/modules/equipos/entities/equipment.entity';
import { HardwareSnapshot } from 'src/modules/hardware/entities/hardware-snapshot.entity';
import { SecuritySnapshot } from 'src/modules/security/entities/security-snapshot.entity';
import { PerformanceSnapshot } from 'src/modules/performance/entities/performance-snapshot.entity';
import { SoftwareInstalled } from 'src/modules/software/entities/software-installed.entity';

/** De qué captura sale el dato. Determina la fecha de la evidencia. */
export type EvidenceSource = 'security' | 'hardware' | 'performance' | 'software' | 'equipment';

/** Todo lo que se sabe de un equipo, con la fecha de cada captura. */
export interface SnapshotBundle {
  equipment: Equipment;
  hardware: HardwareSnapshot | null;
  security: SecuritySnapshot | null;
  performance: PerformanceSnapshot | null;
  software: SoftwareInstalled[];
  softwareCapturedAt: Date | null;
}

/**
 * Valor real extraído del equipo, listo para comparar contra el umbral.
 * `available: false` significa "el agente no reportó este dato" — que NO
 * es lo mismo que incumplir. Un dato ausente es un punto ciego.
 */
export interface ResolvedValue {
  raw: number | boolean | string | null;
  display: string;
  available: boolean;
  /** Contexto extra para el mensaje: "Apagados: público", "2 cuentas admin". */
  detail?: string;
}

export interface FieldResolver {
  source: EvidenceSource;
  resolve: (b: SnapshotBundle) => ResolvedValue;
}

const NO_DATA: ResolvedValue = {
  raw: null,
  display: 'Sin datos',
  available: false,
};

// ── Utilidades ────────────────────────────────────────────────────

export function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function num(value: number | null | undefined, unit: string): ResolvedValue {
  if (value === null || value === undefined) return NO_DATA;
  return { raw: value, display: `${value} ${unit}`.trim(), available: true };
}

function bool(
  value: boolean | null | undefined,
  onTrue: string,
  onFalse: string,
): ResolvedValue {
  if (value === null || value === undefined) return NO_DATA;
  return { raw: value, display: value ? onTrue : onFalse, available: true };
}

/** Azúcar para no repetir el guard de snapshot ausente en cada resolutor. */
function fromSecurity(
  fn: (s: SecuritySnapshot) => ResolvedValue,
): FieldResolver {
  return { source: 'security', resolve: (b) => (b.security ? fn(b.security) : NO_DATA) };
}

/**
 * Cada umbral declara un `field`. Acá se define de dónde sale ese dato y
 * cómo se deriva. Los casos que no son lectura directa —edad del equipo,
 * cuentas admin, licencias— se resuelven en un solo lugar.
 */
export const FIELD_RESOLVERS: Record<string, FieldResolver> = {

  // ── Actualizaciones ──────────────────────────────────────────────
  isCriticalUpdatePending: fromSecurity(s =>
    bool(s.isCriticalUpdatePending, 'Sí, hay parches críticos pendientes', 'Sin parches críticos pendientes')),

  daysSinceLastUpdate: fromSecurity(s => num(s.daysSinceLastUpdate, 'días')),

  pendingUpdatesCount: fromSecurity(s => num(s.pendingUpdatesCount, 'pendientes')),

  // ── Antimalware ──────────────────────────────────────────────────
  antivirusEnabled: fromSecurity((s) => {
    const ok = s.antivirusInstalled && s.antivirusEnabled;
    return {
      raw: ok,
      display: ok ? 'Instalado y activo' : 'Ausente o deshabilitado',
      available: true,
      detail: s.antivirusName ?? undefined,
    };
  }),

  antivirusDefinitionsUpdated: fromSecurity(s =>
    bool(s.antivirusDefinitionsUpdated, 'Definiciones al día', 'Definiciones desactualizadas')),

  antivirusLastScanDate: fromSecurity((s) => {
    const days = daysSince(s.antivirusLastScanDate);
    if (days === null) return { ...NO_DATA, display: 'Nunca se registró un escaneo' };
    return { raw: days, display: `${days} días`, available: true };
  }),

  // ── Firewall y superficie de ataque ──────────────────────────────
  firewallEnabled: fromSecurity((s) => {
    const profiles = [
      { name: 'dominio', on: s.firewallDomainEnabled },
      { name: 'privado', on: s.firewallPrivateEnabled },
      { name: 'público', on: s.firewallPublicEnabled },
    ];
    const off = profiles.filter(p => !p.on);
    return {
      raw: off.length === 0,
      display: off.length === 0 ? 'Los 3 perfiles activos' : `${off.length} de 3 perfiles apagados`,
      available: true,
      detail: off.length > 0 ? `Apagados: ${off.map(p => p.name).join(', ')}` : undefined,
    };
  }),

  uacEnabled: fromSecurity(s => bool(s.uacEnabled, 'UAC habilitado', 'UAC deshabilitado')),

  rdpEnabled: fromSecurity(s => bool(s.rdpEnabled, 'RDP habilitado', 'RDP deshabilitado')),

  remoteRegistryEnabled: fromSecurity(s =>
    bool(s.remoteRegistryEnabled, 'Registro remoto habilitado', 'Registro remoto deshabilitado')),

  // ── Contraseñas y cuentas ────────────────────────────────────────
  passwordMinLength: fromSecurity(s => num(s.passwordMinLength, 'caracteres')),

  accountLockoutThreshold: fromSecurity((s) => {
    const threshold = s.accountLockoutThreshold;
    if (threshold === null || threshold === undefined) return NO_DATA;
    // 0 significa "sin bloqueo": es el PEOR caso, no el mejor. Se normaliza a
    // Infinity para que no pase como cumplido por ser el número más chico.
    return {
      raw: threshold === 0 ? Number.POSITIVE_INFINITY : threshold,
      display: threshold === 0 ? 'Sin bloqueo configurado' : `${threshold} intentos`,
      available: true,
    };
  }),

  localUsers: fromSecurity((s) => {
    if (!Array.isArray(s.localUsers)) return NO_DATA;
    const admins = s.localUsers.filter(u => u.isAdmin && u.isEnabled);
    return {
      raw: admins.length,
      display: `${admins.length} cuenta${admins.length === 1 ? '' : 's'} admin`,
      available: true,
      detail: admins.length > 0 ? admins.map(u => u.username).join(', ') : undefined,
    };
  }),

  passwordMaxAgeDays: fromSecurity(s => num(s.passwordMaxAgeDays, 'días')),

  passwordComplexityEnabled: fromSecurity(s =>
    bool(s.passwordComplexityEnabled, 'Complejidad exigida', 'Complejidad deshabilitada')),

  // ── Activos y hardware ───────────────────────────────────────────
  manufactureYear: {
    source: 'hardware',
    resolve: (b) => {
      const year = Number(b.hardware?.manufactureYear);
      if (!b.hardware || !Number.isFinite(year) || year < 1990) return NO_DATA;
      const age = new Date().getFullYear() - year;
      return {
        raw: age,
        display: `${age} años`,
        available: true,
        detail: `Fabricado en ${year}`,
      };
    },
  },

  diskSmartStatus: {
    source: 'hardware',
    resolve: (b) => {
      if (!b.hardware?.diskSmartStatus) return NO_DATA;
      const status = b.hardware.diskSmartStatus;
      const labels: Record<string, string> = {
        good:    'Saludable',
        warning: 'Advertencia SMART',
        failed:  'Falla inminente',
        unknown: 'Desconocido',
      };
      return {
        raw: status,
        display: labels[status] ?? status,
        available: status !== 'unknown',
        detail: b.hardware.diskModel ?? undefined,
      };
    },
  },

  // ── Rendimiento y capacidad ──────────────────────────────────────
  diskUsagePercent: {
    source: 'performance',
    resolve: (b) => (b.performance ? num(b.performance.diskUsagePercent, '%') : NO_DATA),
  },

  ramUsagePercent: {
    source: 'performance',
    resolve: (b) => (b.performance ? num(b.performance.ramUsagePercent, '%') : NO_DATA),
  },

  cpuTemperatureC: {
    source: 'performance',
    resolve: (b) => {
      // El sensor puede venir en cualquiera de las dos capturas.
      const temp = b.performance?.cpuTemperatureC ?? b.hardware?.cpuTemperatureC ?? null;
      if (temp === null || temp === undefined) {
        return { ...NO_DATA, display: 'Sensor no disponible' };
      }
      return { raw: temp, display: `${temp} °C`, available: true };
    },
  },

  uptimeSeconds: {
    source: 'performance',
    resolve: (b) => {
      if (!b.performance || b.performance.uptimeSeconds === null) return NO_DATA;
      const days = Math.floor(b.performance.uptimeSeconds / 86_400);
      return { raw: days, display: `${days} días encendido`, available: true };
    },
  },

  // ── Software y licenciamiento ────────────────────────────────────
  licenseStatus: {
    source: 'software',
    resolve: (b) => {
      if (b.software.length === 0) return NO_DATA;
      const unlicensed = b.software.filter(s => s.licenseStatus === 'unlicensed');
      return {
        // El umbral es `neq 'unlicensed'`: se reporta el peor caso encontrado.
        raw: unlicensed.length > 0 ? 'unlicensed' : 'ok',
        display: unlicensed.length > 0 ? `${unlicensed.length} sin licencia` : 'Todo licenciado',
        available: true,
        detail: unlicensed.length > 0 ? listNames(unlicensed.map(s => s.name)) : undefined,
      };
    },
  },

  isWhitelisted: {
    source: 'software',
    resolve: (b) => {
      if (b.software.length === 0) return NO_DATA;
      const notWhitelisted = b.software.filter(s => !s.isWhitelisted);
      return {
        raw: notWhitelisted.length === 0,
        display: notWhitelisted.length === 0
          ? 'Todo autorizado'
          : `${notWhitelisted.length} sin autorizar`,
        available: true,
        detail: notWhitelisted.length > 0 ? listNames(notWhitelisted.map(s => s.name)) : undefined,
      };
    },
  },

  // ── Operación y trazabilidad ─────────────────────────────────────
  lastConnection: {
    source: 'equipment',
    resolve: (b) => {
      const days = daysSince(b.equipment.lastConnection);
      if (days === null) return { ...NO_DATA, display: 'Nunca sincronizó' };
      return { raw: days, display: `${days} días`, available: true };
    },
  },
};

function listNames(names: string[]): string {
  return names.slice(0, 3).join(', ') + (names.length > 3 ? `… (+${names.length - 3})` : '');
}
