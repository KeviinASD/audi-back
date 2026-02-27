# Documentación Técnica — Módulos Security & Performance

Sistema de Auditoría Informática — Laboratorios EPIS UNT  
Stack: NestJS · TypeORM · PostgreSQL

---

## Índice

1. [Integración con el flujo del Agente](#1-integración-con-el-flujo-del-agente)
2. [Módulo Security](#2-módulo-security)
3. [Módulo Performance](#3-módulo-performance)
4. [Actualización del SyncAgentDto](#4-actualización-del-syncagentdto)
5. [Actualización del AgentService](#5-actualización-del-agentservice)
6. [JSON de ejemplo actualizado](#6-json-de-ejemplo-actualizado)

---

## 1. Integración con el flujo del Agente

Los módulos `Security` y `Performance` se integran exactamente igual que
`Hardware` y `Software`: sus servicios se exportan y son invocados únicamente
por `AgentService` al procesar un sync en modo `full`.

```
AgentService.processSync()
  ├── HardwareService.saveSnapshot()
  ├── SoftwareService.saveSnapshot()
  ├── SecurityService.saveSnapshot()     ← nuevo
  └── PerformanceService.saveSnapshot()  ← nuevo
```

Sus controladores solo exponen endpoints de **lectura** para el dashboard.

---

## 2. Módulo Security

### Pruebas del plan de auditoría que cubre

| Prueba | Descripción |
|---|---|
| PS-SW-01 | Actualización de SO y parches de seguridad |
| PS-SW-02 | Protección contra software malicioso (antivirus) |
| PS-SW-04 | Control de acceso lógico — usuarios y políticas |

### 2.1 Entidades

#### `SecuritySnapshot`

Un registro por sync. Captura el estado completo de seguridad del equipo
en el momento de la ejecución del agente.

```typescript
// security/entities/security-snapshot.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Equipment } from '../../equipments/entities/equipment.entity';

@Entity('security_snapshots')
export class SecuritySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, { eager: false, nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  // ── Operating System ─────────────────────────────────
  @Column({ nullable: true })
  osName: string;                     // "Windows 10 Pro"

  @Column({ nullable: true })
  osVersion: string;                  // "10.0.19045"

  @Column({ nullable: true })
  osBuild: string;                    // "19045.3803"

  @Column({ nullable: true })
  osArchitecture: string;             // "64-bit"

  // ── Windows Update ───────────────────────────────────
  @Column({ nullable: true })
  lastUpdateDate: Date;               // fecha del último parche instalado

  @Column({ nullable: true })
  daysSinceLastUpdate: number;        // calculado en el agente

  @Column({ default: 0 })
  pendingUpdatesCount: number;        // parches pendientes detectados

  @Column({ default: false })
  isCriticalUpdatePending: boolean;   // hay algún parche crítico pendiente

  // ── Antivirus ────────────────────────────────────────
  @Column({ default: false })
  antivirusInstalled: boolean;

  @Column({ default: false })
  antivirusEnabled: boolean;

  @Column({ nullable: true })
  antivirusName: string;              // "Windows Defender", "Kaspersky", etc.

  @Column({ nullable: true })
  antivirusVersion: string;

  @Column({ default: false })
  antivirusDefinitionsUpdated: boolean;

  @Column({ nullable: true })
  antivirusLastScanDate: Date;

  // ── Firewall ─────────────────────────────────────────
  @Column({ default: false })
  firewallEnabled: boolean;           // perfil Domain/Private/Public activo

  @Column({ default: false })
  firewallDomainEnabled: boolean;

  @Column({ default: false })
  firewallPrivateEnabled: boolean;

  @Column({ default: false })
  firewallPublicEnabled: boolean;

  // ── Password Policy ──────────────────────────────────
  @Column({ nullable: true })
  passwordMinLength: number;          // longitud mínima requerida

  @Column({ nullable: true })
  passwordMaxAgeDays: number;         // días antes de expirar (0 = nunca)

  @Column({ nullable: true })
  passwordMinAgeDays: number;

  @Column({ default: false })
  passwordComplexityEnabled: boolean; // complejidad habilitada

  @Column({ nullable: true })
  accountLockoutThreshold: number;    // intentos antes de bloqueo (0 = nunca)

  // ── Local Users ──────────────────────────────────────
  // Guardados como JSON array — evita tabla adicional para datos simples
  @Column({ type: 'jsonb', nullable: true })
  localUsers: LocalUserInfo[];

  // ── Last Login ───────────────────────────────────────
  @Column({ nullable: true })
  lastLoggedUser: string;             // último usuario que inició sesión

  @Column({ nullable: true })
  lastLoginDate: Date;

  @Column({ nullable: true })
  currentLoggedUser: string;          // usuario activo al momento del sync

  // ── UAC ──────────────────────────────────────────────
  @Column({ default: false })
  uacEnabled: boolean;                // Control de Cuentas de Usuario

  // ── Remote Access ────────────────────────────────────
  @Column({ default: false })
  rdpEnabled: boolean;                // Escritorio Remoto habilitado

  @Column({ default: false })
  remoteRegistryEnabled: boolean;     // Registro remoto habilitado

  // ── Calculated risk flags ────────────────────────────
  @Column({ default: false })
  hasSecurityRisk: boolean;
  // true si: antivirus inactivo OR firewall inactivo OR
  //          parches críticos pendientes OR política de contraseña débil

  @CreateDateColumn()
  createdAt: Date;
}

// Tipo embebido para el array JSON de usuarios locales
export interface LocalUserInfo {
  username: string;
  isAdmin: boolean;
  isEnabled: boolean;
  lastLogin: string | null;           // ISO string o null
  passwordNeverExpires: boolean;
}
```

### 2.2 DTOs

```typescript
// security/dto/security-snapshot.dto.ts

export class OsInfoDto {
  name: string;                       // "Windows 10 Pro"
  version: string;                    // "10.0.19045"
  build: string;                      // "19045.3803"
  architecture: string;               // "64-bit"
}

export class WindowsUpdateDto {
  lastUpdateDate?: string;            // ISO date string
  daysSinceLastUpdate: number;
  pendingUpdatesCount: number;
  isCriticalUpdatePending: boolean;
}

export class AntivirusDto {
  installed: boolean;
  enabled: boolean;
  name?: string;
  version?: string;
  definitionsUpdated: boolean;
  lastScanDate?: string;
}

export class FirewallDto {
  enabled: boolean;
  domainEnabled: boolean;
  privateEnabled: boolean;
  publicEnabled: boolean;
}

export class PasswordPolicyDto {
  minLength: number;
  maxAgeDays: number;
  minAgeDays: number;
  complexityEnabled: boolean;
  lockoutThreshold: number;
}

export class LocalUserDto {
  username: string;
  isAdmin: boolean;
  isEnabled: boolean;
  lastLogin: string | null;
  passwordNeverExpires: boolean;
}

export class SecuritySnapshotDto {
  os: OsInfoDto;
  windowsUpdate: WindowsUpdateDto;
  antivirus: AntivirusDto;
  firewall: FirewallDto;
  passwordPolicy: PasswordPolicyDto;
  localUsers: LocalUserDto[];
  lastLoggedUser?: string;
  lastLoginDate?: string;
  currentLoggedUser?: string;
  uacEnabled: boolean;
  rdpEnabled: boolean;
  remoteRegistryEnabled: boolean;
}
```

### 2.3 Servicio

```typescript
// security/security.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SecuritySnapshot } from './entities/security-snapshot.entity';
import { SecuritySnapshotDto } from './dto/security-snapshot.dto';
import { Equipment } from '../equipments/entities/equipment.entity';

@Injectable()
export class SecurityService {

  constructor(
    @InjectRepository(SecuritySnapshot)
    private readonly repo: Repository<SecuritySnapshot>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: SecuritySnapshotDto,
    capturedAt: Date,
  ): Promise<SecuritySnapshot> {

    const snapshot = this.repo.create({
      equipment,
      capturedAt,

      // OS
      osName:                      dto.os.name,
      osVersion:                   dto.os.version,
      osBuild:                     dto.os.build,
      osArchitecture:              dto.os.architecture,

      // Windows Update
      lastUpdateDate:              dto.windowsUpdate.lastUpdateDate
                                     ? new Date(dto.windowsUpdate.lastUpdateDate)
                                     : null,
      daysSinceLastUpdate:         dto.windowsUpdate.daysSinceLastUpdate,
      pendingUpdatesCount:         dto.windowsUpdate.pendingUpdatesCount,
      isCriticalUpdatePending:     dto.windowsUpdate.isCriticalUpdatePending,

      // Antivirus
      antivirusInstalled:          dto.antivirus.installed,
      antivirusEnabled:            dto.antivirus.enabled,
      antivirusName:               dto.antivirus.name ?? null,
      antivirusVersion:            dto.antivirus.version ?? null,
      antivirusDefinitionsUpdated: dto.antivirus.definitionsUpdated,
      antivirusLastScanDate:       dto.antivirus.lastScanDate
                                     ? new Date(dto.antivirus.lastScanDate)
                                     : null,

      // Firewall
      firewallEnabled:             dto.firewall.enabled,
      firewallDomainEnabled:       dto.firewall.domainEnabled,
      firewallPrivateEnabled:      dto.firewall.privateEnabled,
      firewallPublicEnabled:       dto.firewall.publicEnabled,

      // Password Policy
      passwordMinLength:           dto.passwordPolicy.minLength,
      passwordMaxAgeDays:          dto.passwordPolicy.maxAgeDays,
      passwordMinAgeDays:          dto.passwordPolicy.minAgeDays,
      passwordComplexityEnabled:   dto.passwordPolicy.complexityEnabled,
      accountLockoutThreshold:     dto.passwordPolicy.lockoutThreshold,

      // Users
      localUsers:                  dto.localUsers,
      lastLoggedUser:              dto.lastLoggedUser ?? null,
      lastLoginDate:               dto.lastLoginDate
                                     ? new Date(dto.lastLoginDate)
                                     : null,
      currentLoggedUser:           dto.currentLoggedUser ?? null,

      // Access
      uacEnabled:                  dto.uacEnabled,
      rdpEnabled:                  dto.rdpEnabled,
      remoteRegistryEnabled:       dto.remoteRegistryEnabled,

      // Risk flag calculado
      hasSecurityRisk:             this.calculateSecurityRisk(dto),
    });

    return this.repo.save(snapshot);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: string): Promise<SecuritySnapshot | null> {
    return this.repo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });
  }

  async getHistory(
    equipmentId: string,
    from: Date,
    to: Date,
  ): Promise<SecuritySnapshot[]> {
    return this.repo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: Between(from, to),
      },
      order: { capturedAt: 'DESC' },
    });
  }

  // Todos los equipos con riesgo de seguridad activo
  async getEquipmentsWithRisk(): Promise<SecuritySnapshot[]> {
    return this.repo
      .createQueryBuilder('ss')
      .distinctOn(['ss.equipment_id'])
      .leftJoinAndSelect('ss.equipment', 'equipment')
      .where('ss.has_security_risk = true')
      .orderBy('ss.equipment_id')
      .addOrderBy('ss.captured_at', 'DESC')
      .getMany();
  }

  // Equipos sin antivirus activo
  async getEquipmentsWithoutAntivirus(): Promise<SecuritySnapshot[]> {
    return this.repo
      .createQueryBuilder('ss')
      .distinctOn(['ss.equipment_id'])
      .leftJoinAndSelect('ss.equipment', 'equipment')
      .where('ss.antivirus_enabled = false')
      .orderBy('ss.equipment_id')
      .addOrderBy('ss.captured_at', 'DESC')
      .getMany();
  }

  // Equipos con parches críticos pendientes
  async getEquipmentsWithPendingUpdates(): Promise<SecuritySnapshot[]> {
    return this.repo
      .createQueryBuilder('ss')
      .distinctOn(['ss.equipment_id'])
      .leftJoinAndSelect('ss.equipment', 'equipment')
      .where('ss.is_critical_update_pending = true')
      .orderBy('ss.equipment_id')
      .addOrderBy('ss.captured_at', 'DESC')
      .getMany();
  }

  // ── Lógica interna ────────────────────────────────────────────

  private calculateSecurityRisk(dto: SecuritySnapshotDto): boolean {
    const noAntivirus        = !dto.antivirus.enabled;
    const firewallOff        = !dto.firewall.enabled;
    const criticalUpdate     = dto.windowsUpdate.isCriticalUpdatePending;
    const longNoUpdate       = dto.windowsUpdate.daysSinceLastUpdate > 90;
    const weakPassword       = dto.passwordPolicy.minLength < 8 ||
                               !dto.passwordPolicy.complexityEnabled;
    const noLockout          = dto.passwordPolicy.lockoutThreshold === 0;
    const rdpExposed         = dto.rdpEnabled;

    return noAntivirus || firewallOff || criticalUpdate ||
           longNoUpdate || weakPassword || noLockout || rdpExposed;
  }
}
```

### 2.4 Controlador (solo lectura)

```typescript
// security/security.controller.ts

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {

  constructor(private readonly securityService: SecurityService) {}

  @Get('equipment/:equipmentId/latest')
  getLatest(@Param('equipmentId') equipmentId: string) {
    return this.securityService.getLatestSnapshot(equipmentId);
  }

  @Get('equipment/:equipmentId/history')
  getHistory(
    @Param('equipmentId') equipmentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.securityService.getHistory(
      equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('risks')
  getWithRisk() {
    return this.securityService.getEquipmentsWithRisk();
  }

  @Get('no-antivirus')
  getWithoutAntivirus() {
    return this.securityService.getEquipmentsWithoutAntivirus();
  }

  @Get('pending-updates')
  getWithPendingUpdates() {
    return this.securityService.getEquipmentsWithPendingUpdates();
  }
}
```

### 2.5 Módulo

```typescript
// security/security.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecuritySnapshot } from './entities/security-snapshot.entity';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecuritySnapshot])],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],         // exportado para AgentModule
})
export class SecurityModule {}
```

---

## 3. Módulo Performance

### Pruebas del plan de auditoría que cubre

| Prueba | Descripción |
|---|---|
| PS-HW-03 | Pruebas de rendimiento y temperatura del hardware |
| PS-SW-05 | Monitoreo de rendimiento del sistema |
| PS-SW-07 | Gestión de incidentes — procesos que consumen recursos anormales |

### 3.1 Entidades

#### `PerformanceSnapshot`

Un registro por sync con las métricas del sistema en ese momento.

```typescript
// performance/entities/performance-snapshot.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Equipment } from '../../equipments/entities/equipment.entity';

@Entity('performance_snapshots')
export class PerformanceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, { eager: false, nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  @Column()
  mode: string;                       // "full" | "quick"

  // ── CPU ──────────────────────────────────────────────
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuUsagePercent: number;            // % al momento del sync

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuTemperatureC: number;

  // ── RAM ──────────────────────────────────────────────
  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramTotalGB: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramUsedGB: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  ramUsagePercent: number;            // calculado: (ramUsedGB / ramTotalGB) * 100

  // ── Disk ─────────────────────────────────────────────
  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskTotalGB: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskUsedGB: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  diskUsagePercent: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  diskTemperatureC: number;           // null si sensor no disponible

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskReadSpeedMBs: number;           // velocidad de lectura en el momento

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskWriteSpeedMBs: number;

  // ── Network ──────────────────────────────────────────
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  networkSentMBs: number;             // velocidad de envío al momento del sync

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  networkReceivedMBs: number;

  @Column({ nullable: true })
  networkAdapterName: string;         // "Ethernet", "Wi-Fi"

  // ── Uptime ───────────────────────────────────────────
  @Column({ nullable: true })
  uptimeSeconds: number;              // segundos desde el último arranque

  @Column({ nullable: true })
  lastBootTime: Date;                 // fecha/hora del último arranque

  // ── Top processes ────────────────────────────────────
  // Top 10 procesos por CPU y RAM — guardados como JSONB
  @Column({ type: 'jsonb', nullable: true })
  topProcessesByCpu: ProcessInfo[];

  @Column({ type: 'jsonb', nullable: true })
  topProcessesByRam: ProcessInfo[];

  // ── Performance flags ────────────────────────────────
  @Column({ default: false })
  hasCpuAlert: boolean;               // cpuUsagePercent > 85
  
  @Column({ default: false })
  hasRamAlert: boolean;               // ramUsagePercent > 90

  @Column({ default: false })
  hasDiskAlert: boolean;              // diskUsagePercent > 90

  @Column({ default: false })
  hasThermalAlert: boolean;           // cpuTemperatureC > 70 OR diskTemperatureC > 55

  @CreateDateColumn()
  createdAt: Date;
}

// Tipo embebido para el array JSON de procesos
export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  ramMB: number;
  status: string;                     // "running" | "sleeping" | "stopped"
}
```

### 3.2 DTOs

```typescript
// performance/dto/performance-snapshot.dto.ts

export class CpuMetricsDto {
  usagePercent: number;
  temperatureC?: number;
}

export class RamMetricsDto {
  totalGB: number;
  usedGB: number;
}

export class DiskMetricsDto {
  totalGB: number;
  usedGB: number;
  temperatureC?: number;
  readSpeedMBs?: number;
  writeSpeedMBs?: number;
}

export class NetworkMetricsDto {
  sentMBs: number;
  receivedMBs: number;
  adapterName?: string;
}

export class ProcessInfoDto {
  pid: number;
  name: string;
  cpuPercent: number;
  ramMB: number;
  status: string;
}

export class PerformanceSnapshotDto {
  cpu: CpuMetricsDto;
  ram: RamMetricsDto;
  disk: DiskMetricsDto;
  network: NetworkMetricsDto;
  uptimeSeconds: number;
  lastBootTime?: string;              // ISO string
  topProcessesByCpu: ProcessInfoDto[];
  topProcessesByRam: ProcessInfoDto[];
}
```

### 3.3 Servicio

```typescript
// performance/performance.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PerformanceSnapshot } from './entities/performance-snapshot.entity';
import { PerformanceSnapshotDto } from './dto/performance-snapshot.dto';
import { Equipment } from '../equipments/entities/equipment.entity';

@Injectable()
export class PerformanceService {

  constructor(
    @InjectRepository(PerformanceSnapshot)
    private readonly repo: Repository<PerformanceSnapshot>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: PerformanceSnapshotDto,
    capturedAt: Date,
    mode: string,
  ): Promise<PerformanceSnapshot> {

    const ramUsagePercent  = dto.ram.totalGB > 0
      ? (dto.ram.usedGB / dto.ram.totalGB) * 100
      : 0;

    const diskUsagePercent = dto.disk.totalGB > 0
      ? (dto.disk.usedGB / dto.disk.totalGB) * 100
      : 0;

    const snapshot = this.repo.create({
      equipment,
      capturedAt,
      mode,

      // CPU
      cpuUsagePercent:    dto.cpu.usagePercent,
      cpuTemperatureC:    dto.cpu.temperatureC ?? null,

      // RAM
      ramTotalGB:         dto.ram.totalGB,
      ramUsedGB:          dto.ram.usedGB,
      ramUsagePercent,

      // Disk
      diskTotalGB:        dto.disk.totalGB,
      diskUsedGB:         dto.disk.usedGB,
      diskUsagePercent,
      diskTemperatureC:   dto.disk.temperatureC ?? null,
      diskReadSpeedMBs:   dto.disk.readSpeedMBs ?? null,
      diskWriteSpeedMBs:  dto.disk.writeSpeedMBs ?? null,

      // Network
      networkSentMBs:     dto.network.sentMBs,
      networkReceivedMBs: dto.network.receivedMBs,
      networkAdapterName: dto.network.adapterName ?? null,

      // Uptime
      uptimeSeconds:      dto.uptimeSeconds,
      lastBootTime:       dto.lastBootTime ? new Date(dto.lastBootTime) : null,

      // Processes
      topProcessesByCpu:  dto.topProcessesByCpu,
      topProcessesByRam:  dto.topProcessesByRam,

      // Alert flags
      hasCpuAlert:        dto.cpu.usagePercent > 85,
      hasRamAlert:        ramUsagePercent > 90,
      hasDiskAlert:       diskUsagePercent > 90,
      hasThermalAlert:    (dto.cpu.temperatureC ?? 0) > 70 ||
                          (dto.disk.temperatureC ?? 0) > 55,
    });

    return this.repo.save(snapshot);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: string): Promise<PerformanceSnapshot | null> {
    return this.repo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });
  }

  async getHistory(
    equipmentId: string,
    from: Date,
    to: Date,
  ): Promise<PerformanceSnapshot[]> {
    return this.repo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: Between(from, to),
      },
      order: { capturedAt: 'ASC' },   // ASC para graficar línea de tiempo
    });
  }

  // Equipos con alguna alerta de rendimiento activa
  async getEquipmentsWithAlerts(): Promise<PerformanceSnapshot[]> {
    return this.repo
      .createQueryBuilder('ps')
      .distinctOn(['ps.equipment_id'])
      .leftJoinAndSelect('ps.equipment', 'equipment')
      .where(
        'ps.has_cpu_alert = true OR ps.has_ram_alert = true OR ' +
        'ps.has_disk_alert = true OR ps.has_thermal_alert = true',
      )
      .orderBy('ps.equipment_id')
      .addOrderBy('ps.captured_at', 'DESC')
      .getMany();
  }

  // Promedio de uso de CPU y RAM en un rango de fechas (para reportes)
  async getAverageMetrics(
    equipmentId: string,
    from: Date,
    to: Date,
  ): Promise<{ avgCpu: number; avgRam: number; avgDisk: number }> {
    const result = await this.repo
      .createQueryBuilder('ps')
      .select('AVG(ps.cpu_usage_percent)', 'avgCpu')
      .addSelect('AVG(ps.ram_usage_percent)', 'avgRam')
      .addSelect('AVG(ps.disk_usage_percent)', 'avgDisk')
      .where('ps.equipment_id = :equipmentId', { equipmentId })
      .andWhere('ps.captured_at BETWEEN :from AND :to', { from, to })
      .getRawOne();

    return {
      avgCpu:  parseFloat(result.avgCpu ?? '0'),
      avgRam:  parseFloat(result.avgRam ?? '0'),
      avgDisk: parseFloat(result.avgDisk ?? '0'),
    };
  }
}
```

### 3.4 Controlador (solo lectura)

```typescript
// performance/performance.controller.ts

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {

  constructor(private readonly performanceService: PerformanceService) {}

  @Get('equipment/:equipmentId/latest')
  getLatest(@Param('equipmentId') equipmentId: string) {
    return this.performanceService.getLatestSnapshot(equipmentId);
  }

  @Get('equipment/:equipmentId/history')
  getHistory(
    @Param('equipmentId') equipmentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.performanceService.getHistory(
      equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('equipment/:equipmentId/averages')
  getAverages(
    @Param('equipmentId') equipmentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.performanceService.getAverageMetrics(
      equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('alerts')
  getWithAlerts() {
    return this.performanceService.getEquipmentsWithAlerts();
  }
}
```

### 3.5 Módulo

```typescript
// performance/performance.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceSnapshot } from './entities/performance-snapshot.entity';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PerformanceSnapshot])],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],      // exportado para AgentModule
})
export class PerformanceModule {}
```

---

## 4. Actualización del SyncAgentDto

```typescript
// agent/dto/sync-agent.dto.ts

import { HardwareSnapshotDto }    from '../../hardware/dto/hardware-snapshot.dto';
import { SoftwareSnapshotDto }    from '../../software/dto/software-snapshot.dto';
import { SecuritySnapshotDto }    from '../../security/dto/security-snapshot.dto';
import { PerformanceSnapshotDto } from '../../performance/dto/performance-snapshot.dto';

export class SyncAgentDto {
  equipmentCode: string;              // "LAB01-PC05"
  mode: 'full' | 'quick';
  timestamp: string;                  // ISO 8601

  // Requeridos en mode: 'full'
  hardware?:    HardwareSnapshotDto;
  software?:    SoftwareSnapshotDto;
  security?:    SecuritySnapshotDto;

  // Requerido en mode: 'full' y mode: 'quick'
  performance?: PerformanceSnapshotDto;
}
```

> **Nota sobre `quick` mode:** en modo rápido (inicio/cierre de sesión)
> solo se envía `performance`. Permite registrar métricas de uso sin el
> peso de un sync completo.

---

## 5. Actualización del AgentService

```typescript
// agent/agent.service.ts  — método processSync actualizado

async processSync(dto: SyncAgentDto): Promise<{ ok: boolean; message: string }> {

  const equipment = await this.equipmentRepo.findOne({
    where: { code: dto.equipmentCode, isActive: true },
  });

  if (!equipment) {
    throw new NotFoundException(
      `Equipment with code "${dto.equipmentCode}" not found or inactive`,
    );
  }

  const capturedAt = new Date(dto.timestamp);

  if (dto.mode === 'full') {
    if (!dto.hardware || !dto.software || !dto.security || !dto.performance) {
      throw new BadRequestException(
        'Fields hardware, software, security and performance are required in full mode',
      );
    }

    // Guardar los 4 snapshots en paralelo
    const [hardwareSnapshot, , securitySnapshot] = await Promise.all([
      this.hardwareService.saveSnapshot(equipment, dto.hardware, capturedAt),
      this.softwareService.saveSnapshot(equipment, dto.software, capturedAt),
      this.securityService.saveSnapshot(equipment, dto.security, capturedAt),
      this.performanceService.saveSnapshot(equipment, dto.performance, capturedAt, 'full'),
    ]);

    // Calcular nuevo estado con hardware + seguridad
    const newStatus = this.calculateEquipmentStatus(hardwareSnapshot, securitySnapshot);

    await this.equipmentRepo.update(equipment.id, {
      lastConnection: capturedAt,
      status: newStatus,
    });

  } else {
    // Modo quick: solo guarda métricas de rendimiento
    if (dto.performance) {
      await this.performanceService.saveSnapshot(
        equipment, dto.performance, capturedAt, 'quick',
      );
    }
    await this.equipmentRepo.update(equipment.id, { lastConnection: capturedAt });
  }

  return { ok: true, message: `Sync processed successfully for ${dto.equipmentCode}` };
}

// Estado del equipo ahora considera hardware + seguridad
private calculateEquipmentStatus(
  hw: HardwareSnapshot,
  sec: SecuritySnapshot,
): 'operative' | 'degraded' | 'critical' {

  // Crítico
  const criticalTemp     = (hw.cpuTemperatureC ?? 0) > 85;
  const diskFailed       = hw.diskSmartStatus === 'failed';
  const noAntivirus      = !sec.antivirusEnabled;
  const firewallOff      = !sec.firewallEnabled;
  if (criticalTemp || diskFailed || noAntivirus || firewallOff) return 'critical';

  // Degradado
  const highTemp         = (hw.cpuTemperatureC ?? 0) > 70;
  const highRam          = hw.ramTotalGB > 0 && (hw.ramUsedGB / hw.ramTotalGB) > 0.90;
  const criticalUpdate   = sec.isCriticalUpdatePending;
  const longNoUpdate     = sec.daysSinceLastUpdate > 90;
  if (highTemp || highRam || criticalUpdate || longNoUpdate) return 'degraded';

  return 'operative';
}
```

**Nuevas inyecciones requeridas en `AgentModule`:**

```typescript
// agent/agent.module.ts

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment]),
    HardwareModule,
    SoftwareModule,
    SecurityModule,      // nuevo
    PerformanceModule,   // nuevo
  ],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
```

```typescript
// agent/agent.service.ts — constructor actualizado

constructor(
  @InjectRepository(Equipment)
  private readonly equipmentRepo: Repository<Equipment>,
  private readonly hardwareService: HardwareService,
  private readonly softwareService: SoftwareService,
  private readonly securityService: SecurityService,      // nuevo
  private readonly performanceService: PerformanceService, // nuevo
) {}
```

---

## 6. JSON de ejemplo actualizado

Payload completo `POST /agent/sync` con los 4 módulos:

```json
{
  "equipmentCode": "LAB01-PC05",
  "mode": "full",
  "timestamp": "2026-02-22T07:00:00.000Z",

  "hardware": { },

  "software": { },

  "security": {
    "os": {
      "name": "Windows 10 Pro",
      "version": "10.0.19045",
      "build": "19045.3803",
      "architecture": "64-bit"
    },
    "windowsUpdate": {
      "lastUpdateDate": "2025-11-10",
      "daysSinceLastUpdate": 104,
      "pendingUpdatesCount": 3,
      "isCriticalUpdatePending": true
    },
    "antivirus": {
      "installed": true,
      "enabled": true,
      "name": "Windows Defender",
      "version": "4.18.2310.9",
      "definitionsUpdated": true,
      "lastScanDate": "2026-02-21"
    },
    "firewall": {
      "enabled": true,
      "domainEnabled": true,
      "privateEnabled": true,
      "publicEnabled": true
    },
    "passwordPolicy": {
      "minLength": 6,
      "maxAgeDays": 0,
      "minAgeDays": 0,
      "complexityEnabled": false,
      "lockoutThreshold": 0
    },
    "localUsers": [
      {
        "username": "Administrador",
        "isAdmin": true,
        "isEnabled": true,
        "lastLogin": "2026-02-22T06:55:00Z",
        "passwordNeverExpires": true
      },
      {
        "username": "alumno",
        "isAdmin": false,
        "isEnabled": true,
        "lastLogin": "2026-02-21T14:30:00Z",
        "passwordNeverExpires": false
      }
    ],
    "lastLoggedUser": "alumno",
    "lastLoginDate": "2026-02-21T14:30:00Z",
    "currentLoggedUser": "Administrador",
    "uacEnabled": true,
    "rdpEnabled": false,
    "remoteRegistryEnabled": false
  },

  "performance": {
    "cpu": {
      "usagePercent": 18.4,
      "temperatureC": 47.0
    },
    "ram": {
      "totalGB": 8,
      "usedGB": 3.8
    },
    "disk": {
      "totalGB": 500,
      "usedGB": 210.4,
      "temperatureC": 38.0,
      "readSpeedMBs": 85.2,
      "writeSpeedMBs": 42.6
    },
    "network": {
      "sentMBs": 0.12,
      "receivedMBs": 0.45,
      "adapterName": "Ethernet"
    },
    "uptimeSeconds": 25200,
    "lastBootTime": "2026-02-22T00:00:00.000Z",
    "topProcessesByCpu": [
      { "pid": 1234, "name": "chrome.exe",   "cpuPercent": 8.2, "ramMB": 412, "status": "running" },
      { "pid": 5678, "name": "python.exe",   "cpuPercent": 4.1, "ramMB": 185, "status": "running" },
      { "pid": 9012, "name": "vscode.exe",   "cpuPercent": 2.3, "ramMB": 320, "status": "running" }
    ],
    "topProcessesByRam": [
      { "pid": 1234, "name": "chrome.exe",   "cpuPercent": 8.2, "ramMB": 412, "status": "running" },
      { "pid": 9012, "name": "vscode.exe",   "cpuPercent": 2.3, "ramMB": 320, "status": "running" },
      { "pid": 5678, "name": "python.exe",   "cpuPercent": 4.1, "ramMB": 185, "status": "running" }
    ]
  }
}
```

**Resultado esperado del procesamiento:**

| Evaluación | Resultado |
|---|---|
| Antivirus | Activo y actualizado ✓ |
| Firewall | Todos los perfiles activos ✓ |
| Parches SO | 104 días sin actualizar + parche crítico pendiente ⚠️ |
| Política contraseña | `minLength = 6`, sin complejidad, sin bloqueo → débil ⚠️ |
| `hasSecurityRisk` | `true` — parche crítico + política débil |
| CPU | 18.4% a 47°C — normal ✓ |
| RAM | 47.5% — normal ✓ |
| Disco | 42% a 38°C — normal ✓ |
| Alertas de rendimiento | Ninguna ✓ |
| `equipment.status` | `degraded` — parche crítico pendiente y 104 días sin update |

---

## Resumen completo de endpoints

### Security
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/security/equipment/:id/latest` | JWT | Último snapshot de seguridad |
| GET | `/security/equipment/:id/history` | JWT | Historial con rango de fechas |
| GET | `/security/risks` | JWT | Equipos con riesgo de seguridad activo |
| GET | `/security/no-antivirus` | JWT | Equipos sin antivirus activo |
| GET | `/security/pending-updates` | JWT | Equipos con parches críticos pendientes |

### Performance
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/performance/equipment/:id/latest` | JWT | Último snapshot de rendimiento |
| GET | `/performance/equipment/:id/history` | JWT | Historial para gráficas |
| GET | `/performance/equipment/:id/averages` | JWT | Promedios CPU/RAM/disco por rango |
| GET | `/performance/alerts` | JWT | Equipos con alertas activas |

---

*Documentación generada para el sistema de auditoría EPIS-UNT · 2026*