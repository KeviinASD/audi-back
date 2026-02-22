# Documentación Técnica — Módulos Agent, Hardware & Software

Sistema de Auditoría Informática — Laboratorios EPIS UNT  
Stack: NestJS · TypeORM · PostgreSQL

---

## Estándar de Código

| Concepto | Convención |
|---|---|
| Campos de entidades | `camelCase` en inglés |
| Nombres de tablas | `snake_case` plural en inglés — declarado en `@Entity('tabla')` |
| Relaciones | nombre del campo en inglés — `laboratory: Laboratory` |
| Enums de estado | string literal en inglés — `'operative' \| 'degraded' \| 'critical' \| 'no-data'` |

---

## Entidades existentes (referencia)

```typescript
// Laboratorio físico
@Entity('laboratories')
export class Laboratory {
  id: string;
  name: string;
  location: string;
  responsible: string;
  responsibleEmail: string;
  isActive: boolean;
  createdAt: Date;
  equipments: Equipment[];
}

// PC registrada manualmente
// Campos actuales en español → migrar a inglés para mantener estándar:
//   codigo        → code
//   nombre        → name
//   ubicacion     → location
//   activo        → isActive
//   ultimaConexion → lastConnection
//   estado        → status
@Entity('equipments')
export class Equipment {
  id: string;
  code: string;           // "LAB01-PC05" — va en el config del agente
  name: string;
  location: string;
  laboratory: Laboratory;
  isActive: boolean;
  lastConnection: Date;
  status: string;         // 'operative' | 'degraded' | 'critical' | 'no-data'
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Índice

1. [Visión general del flujo](#1-visión-general-del-flujo)
2. [Módulo Hardware](#2-módulo-hardware)
3. [Módulo Software](#3-módulo-software)
4. [Módulo Agent](#4-módulo-agent)
5. [Estructura de carpetas](#5-estructura-de-carpetas)
6. [JSON de ejemplo del agente](#6-json-de-ejemplo-del-agente)

---

## 1. Visión general del flujo

```
[agent.exe — cada PC del laboratorio]
        │
        │  POST /agent/sync
        │  Header: x-api-key: <AGENT_API_KEY>
        │  Body: SyncAgentDto
        ▼
┌────────────────────────────────────────────────────────┐
│                    AgentController                     │
│                    POST /agent/sync                    │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                     AgentService                       │
│                                                        │
│  1. Busca Equipment por equipment.code                 │
│  2. HardwareService.saveSnapshot(equipment, dto, date) │
│  3. SoftwareService.saveSnapshot(equipment, dto, date) │
│  4. Actualiza equipment.lastConnection                 │
│  5. Recalcula equipment.status                         │
└──────────────┬──────────────────────┬──────────────────┘
               │                      │
               ▼                      ▼
      HardwareService          SoftwareService
      saveSnapshot()           saveSnapshot()
               │                      │
               ▼                      ▼
     hardware_snapshots       software_installed
     (1 registro por sync)    (N registros por sync)
```

**Regla clave:** `HardwareService` y `SoftwareService` **no exponen endpoints
públicos de escritura**. Solo `AgentService` invoca sus métodos de guardado.
Sus controladores únicamente exponen endpoints de **lectura** para el dashboard.

---

## 2. Módulo Hardware

### 2.1 Entidad `HardwareSnapshot`

Guarda un registro completo del estado del hardware por cada ejecución del agente.
El historial se conserva íntegro (no se sobreescribe) para permitir comparaciones
entre fechas dentro de la sesión de auditoría.

```typescript
// hardware/entities/hardware-snapshot.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Equipment } from '../../equipments/entities/equipment.entity';

@Entity('hardware_snapshots')
export class HardwareSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, { eager: false, nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  // Fecha en que el agente ejecutó el sync (viene del payload)
  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  // ── CPU ──────────────────────────────────────────────
  @Column({ nullable: true })
  cpuModel: string;                   // "Intel Core i5-10400"

  @Column({ nullable: true })
  cpuCores: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuFrequencyGHz: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuUsagePercent: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuTemperatureC: number;            // null si sensor no disponible

  // ── RAM ──────────────────────────────────────────────
  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramTotalGB: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  ramUsedGB: number;

  @Column({ nullable: true })
  ramType: string;                    // "DDR3" | "DDR4" | "DDR5"

  @Column({ nullable: true })
  ramFrequencyMHz: number;

  // ── Disk ─────────────────────────────────────────────
  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskCapacityGB: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  diskUsedGB: number;

  @Column({ nullable: true })
  diskType: string;                   // "HDD" | "SSD" | "NVMe"

  @Column({ nullable: true })
  diskModel: string;

  @Column({ default: 'unknown' })
  diskSmartStatus: string;            // "good" | "warning" | "failed" | "unknown"

  // ── Physical equipment ───────────────────────────────
  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true })
  manufactureYear: string;            // "2019" | "2020"

  @Column({ nullable: true })
  architecture: string;               // "64bit"

  // ── Calculated ───────────────────────────────────────
  @Column({ default: false })
  isObsolete: boolean;
  // true si: antigüedad > 5 años  OR  ramTotalGB < 4  OR  diskType === 'HDD'

  @CreateDateColumn()
  createdAt: Date;
}
```

### 2.2 DTOs

```typescript
// hardware/dto/hardware-snapshot.dto.ts

export class CpuDto {
  model: string;
  cores: number;
  frequencyGHz: number;
  usagePercent: number;
  temperatureC?: number;
}

export class RamDto {
  totalGB: number;
  usedGB: number;
  type?: string;
  frequencyMHz?: number;
}

export class DiskDto {
  capacityGB: number;
  usedGB: number;
  type?: string;
  model?: string;
  smartStatus?: string;
}

export class PhysicalEquipmentDto {
  brand?: string;
  model?: string;
  serialNumber?: string;
  manufactureYear?: string;
  architecture?: string;
}

export class HardwareSnapshotDto {
  cpu: CpuDto;
  ram: RamDto;
  disk: DiskDto;
  physicalEquipment: PhysicalEquipmentDto;
}
```

### 2.3 Servicio

```typescript
// hardware/hardware.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { HardwareSnapshot } from './entities/hardware-snapshot.entity';
import { HardwareSnapshotDto } from './dto/hardware-snapshot.dto';
import { Equipment } from '../equipments/entities/equipment.entity';

@Injectable()
export class HardwareService {

  constructor(
    @InjectRepository(HardwareSnapshot)
    private readonly repo: Repository<HardwareSnapshot>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: HardwareSnapshotDto,
    capturedAt: Date,
  ): Promise<HardwareSnapshot> {

    const snapshot = this.repo.create({
      equipment,
      capturedAt,
      cpuModel:          dto.cpu.model,
      cpuCores:          dto.cpu.cores,
      cpuFrequencyGHz:   dto.cpu.frequencyGHz,
      cpuUsagePercent:   dto.cpu.usagePercent,
      cpuTemperatureC:   dto.cpu.temperatureC ?? null,
      ramTotalGB:        dto.ram.totalGB,
      ramUsedGB:         dto.ram.usedGB,
      ramType:           dto.ram.type ?? null,
      ramFrequencyMHz:   dto.ram.frequencyMHz ?? null,
      diskCapacityGB:    dto.disk.capacityGB,
      diskUsedGB:        dto.disk.usedGB,
      diskType:          dto.disk.type ?? null,
      diskModel:         dto.disk.model ?? null,
      diskSmartStatus:   dto.disk.smartStatus ?? 'unknown',
      brand:             dto.physicalEquipment.brand ?? null,
      model:             dto.physicalEquipment.model ?? null,
      serialNumber:      dto.physicalEquipment.serialNumber ?? null,
      manufactureYear:   dto.physicalEquipment.manufactureYear ?? null,
      architecture:      dto.physicalEquipment.architecture ?? null,
      isObsolete:        this.calculateObsolescence(dto),
    });

    return this.repo.save(snapshot);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: string): Promise<HardwareSnapshot | null> {
    return this.repo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });
  }

  async getHistory(
    equipmentId: string,
    from: Date,
    to: Date,
  ): Promise<HardwareSnapshot[]> {
    return this.repo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: Between(from, to),
      },
      order: { capturedAt: 'DESC' },
    });
  }

  async getObsoleteEquipments(): Promise<HardwareSnapshot[]> {
    return this.repo
      .createQueryBuilder('hs')
      .distinctOn(['hs.equipment_id'])
      .leftJoinAndSelect('hs.equipment', 'equipment')
      .where('hs.is_obsolete = true')
      .orderBy('hs.equipment_id')
      .addOrderBy('hs.captured_at', 'DESC')
      .getMany();
  }

  // ── Lógica interna ────────────────────────────────────────────

  private calculateObsolescence(dto: HardwareSnapshotDto): boolean {
    const currentYear     = new Date().getFullYear();
    const manufactureYear = dto.physicalEquipment.manufactureYear
      ? parseInt(dto.physicalEquipment.manufactureYear.substring(0, 4))
      : null;

    const tooOld          = manufactureYear ? (currentYear - manufactureYear) > 5 : false;
    const insufficientRam = dto.ram.totalGB < 4;
    const mechanicalDisk  = dto.disk.type?.toUpperCase() === 'HDD';

    return tooOld || insufficientRam || mechanicalDisk;
  }
}
```

### 2.4 Controlador (solo lectura)

```typescript
// hardware/hardware.controller.ts

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { HardwareService } from './hardware.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('hardware')
@UseGuards(JwtAuthGuard)
export class HardwareController {

  constructor(private readonly hardwareService: HardwareService) {}

  @Get('equipment/:equipmentId/latest')
  getLatest(@Param('equipmentId') equipmentId: string) {
    return this.hardwareService.getLatestSnapshot(equipmentId);
  }

  @Get('equipment/:equipmentId/history')
  getHistory(
    @Param('equipmentId') equipmentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.hardwareService.getHistory(
      equipmentId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('obsolete')
  getObsolete() {
    return this.hardwareService.getObsoleteEquipments();
  }
}
```

### 2.5 Módulo

```typescript
// hardware/hardware.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HardwareSnapshot } from './entities/hardware-snapshot.entity';
import { HardwareService } from './hardware.service';
import { HardwareController } from './hardware.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HardwareSnapshot])],
  controllers: [HardwareController],
  providers: [HardwareService],
  exports: [HardwareService],         // exportado para AgentModule
})
export class HardwareModule {}
```

---

## 3. Módulo Software

### 3.1 Entidades

#### `SoftwareInstalled`

```typescript
// software/entities/software-installed.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Equipment } from '../../equipments/entities/equipment.entity';

@Entity('software_installed')
export class SoftwareInstalled {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, { eager: false, nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  // Fecha del snapshot al que pertenece este item
  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  @Column()
  name: string;                       // "Python 3.11.4"

  @Column({ nullable: true })
  version: string;

  @Column({ nullable: true })
  publisher: string;                  // "Python Software Foundation"

  @Column({ type: 'date', nullable: true })
  installedAt: Date;

  @Column({
    type: 'enum',
    enum: ['licensed', 'unlicensed', 'unknown'],
    default: 'unknown',
  })
  licenseStatus: string;

  @Column({ default: false })
  isWhitelisted: boolean;             // cruzado con AuthorizedSoftware

  @Column({ default: false })
  isRisk: boolean;
  // true si: no en whitelist AND más de 30 días instalado

  @CreateDateColumn()
  createdAt: Date;
}
```

#### `AuthorizedSoftware`

Lista blanca configurada manualmente por el administrador.

```typescript
// software/entities/authorized-software.entity.ts

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Laboratory } from '../../laboratories/entities/laboratory.entity';

@Entity('authorized_software')
export class AuthorizedSoftware {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
  // Fragmento para matching parcial: "Python", "Visual Studio", "Cisco Packet Tracer"

  @Column({ nullable: true })
  publisher: string;

  @Column({ nullable: true })
  description: string;                // "IDE oficial — curso Redes"

  @Column({ default: true })
  isActive: boolean;

  // null = permitido en todos los laboratorios
  @ManyToOne(() => Laboratory, { nullable: true, eager: false })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3.2 DTOs

```typescript
// software/dto/software-snapshot.dto.ts

export class SoftwareItemDto {
  name: string;
  version?: string;
  publisher?: string;
  installedAt?: string;               // "2024-03-15"
}

export class SoftwareSnapshotDto {
  items: SoftwareItemDto[];
}
```

```typescript
// software/dto/create-authorized-software.dto.ts

export class CreateAuthorizedSoftwareDto {
  name: string;
  publisher?: string;
  description?: string;
  laboratoryId?: string;              // null = aplica a todos los laboratorios
}
```

### 3.3 Servicio

```typescript
// software/software.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { SoftwareInstalled } from './entities/software-installed.entity';
import { AuthorizedSoftware } from './entities/authorized-software.entity';
import { SoftwareSnapshotDto, SoftwareItemDto } from './dto/software-snapshot.dto';
import { CreateAuthorizedSoftwareDto } from './dto/create-authorized-software.dto';
import { Equipment } from '../equipments/entities/equipment.entity';

@Injectable()
export class SoftwareService {

  constructor(
    @InjectRepository(SoftwareInstalled)
    private readonly installedRepo: Repository<SoftwareInstalled>,
    @InjectRepository(AuthorizedSoftware)
    private readonly authorizedRepo: Repository<AuthorizedSoftware>,
  ) {}

  // ── Escritura — solo llamado por AgentService ─────────────────

  async saveSnapshot(
    equipment: Equipment,
    dto: SoftwareSnapshotDto,
    capturedAt: Date,
  ): Promise<SoftwareInstalled[]> {

    const whitelist = await this.authorizedRepo.find({ where: { isActive: true } });

    const records = dto.items.map(item => {
      const isWhitelisted = this.checkWhitelist(item.name, whitelist);
      const isRisk        = this.calculateRisk(item, isWhitelisted);

      return this.installedRepo.create({
        equipment,
        capturedAt,
        name:          item.name,
        version:       item.version ?? null,
        publisher:     item.publisher ?? null,
        installedAt:   item.installedAt ? new Date(item.installedAt) : null,
        licenseStatus: 'unknown',
        isWhitelisted,
        isRisk,
      });
    });

    return this.installedRepo.save(records);
  }

  // ── Lectura — endpoints del dashboard ─────────────────────────

  async getLatestSnapshot(equipmentId: string): Promise<SoftwareInstalled[]> {
    const latest = await this.installedRepo.findOne({
      where: { equipment: { id: equipmentId } },
      order: { capturedAt: 'DESC' },
    });

    if (!latest) return [];

    return this.installedRepo.find({
      where: {
        equipment: { id: equipmentId },
        capturedAt: latest.capturedAt,
      },
    });
  }

  async getRiskyByEquipment(equipmentId: string): Promise<SoftwareInstalled[]> {
    return this.installedRepo.find({
      where: { equipment: { id: equipmentId }, isRisk: true },
      order: { capturedAt: 'DESC' },
    });
  }

  async getAllRisky(): Promise<SoftwareInstalled[]> {
    return this.installedRepo.find({
      where: { isRisk: true },
      relations: ['equipment'],
      order: { capturedAt: 'DESC' },
    });
  }

  async getUnlicensed(): Promise<SoftwareInstalled[]> {
    return this.installedRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.equipment', 'equipment')
      .where('si.is_whitelisted = false')
      .andWhere('si.is_risk = true')
      .distinctOn(['si.name'])
      .orderBy('si.name')
      .getMany();
  }

  // ── Whitelist CRUD ────────────────────────────────────────────

  async getWhitelist(): Promise<AuthorizedSoftware[]> {
    return this.authorizedRepo.find({ where: { isActive: true } });
  }

  async addToWhitelist(dto: CreateAuthorizedSoftwareDto): Promise<AuthorizedSoftware> {
    const entry = this.authorizedRepo.create({
      name:        dto.name,
      publisher:   dto.publisher ?? null,
      description: dto.description ?? null,
      laboratory:  dto.laboratoryId ? { id: dto.laboratoryId } as any : null,
    });
    return this.authorizedRepo.save(entry);
  }

  async removeFromWhitelist(id: string): Promise<void> {
    await this.authorizedRepo.update(id, { isActive: false });
  }

  // ── Lógica interna ────────────────────────────────────────────

  private checkWhitelist(name: string, whitelist: AuthorizedSoftware[]): boolean {
    const nameLower = name.toLowerCase();
    return whitelist.some(entry =>
      nameLower.includes(entry.name.toLowerCase()),
    );
  }

  private calculateRisk(item: SoftwareItemDto, isWhitelisted: boolean): boolean {
    if (isWhitelisted) return false;

    // Sin fecha de instalación → riesgo por defecto
    if (!item.installedAt) return true;

    // Solo es riesgo si lleva más de 30 días instalado
    const daysInstalled = differenceInDays(new Date(), new Date(item.installedAt));
    return daysInstalled > 30;
  }
}
```

### 3.4 Controlador

```typescript
// software/software.controller.ts

import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SoftwareService } from './software.service';
import { CreateAuthorizedSoftwareDto } from './dto/create-authorized-software.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('software')
@UseGuards(JwtAuthGuard)
export class SoftwareController {

  constructor(private readonly softwareService: SoftwareService) {}

  // ── Snapshots ──────────────────────────────────────────────────
  @Get('equipment/:equipmentId/latest')
  getLatest(@Param('equipmentId') equipmentId: string) {
    return this.softwareService.getLatestSnapshot(equipmentId);
  }

  @Get('equipment/:equipmentId/risky')
  getRiskyByEquipment(@Param('equipmentId') equipmentId: string) {
    return this.softwareService.getRiskyByEquipment(equipmentId);
  }

  @Get('risky')
  getAllRisky() {
    return this.softwareService.getAllRisky();
  }

  @Get('unlicensed')
  getUnlicensed() {
    return this.softwareService.getUnlicensed();
  }

  // ── Whitelist ──────────────────────────────────────────────────
  @Get('whitelist')
  getWhitelist() {
    return this.softwareService.getWhitelist();
  }

  @Post('whitelist')
  addToWhitelist(@Body() dto: CreateAuthorizedSoftwareDto) {
    return this.softwareService.addToWhitelist(dto);
  }

  @Delete('whitelist/:id')
  removeFromWhitelist(@Param('id') id: string) {
    return this.softwareService.removeFromWhitelist(id);
  }
}
```

### 3.5 Módulo

```typescript
// software/software.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoftwareInstalled } from './entities/software-installed.entity';
import { AuthorizedSoftware } from './entities/authorized-software.entity';
import { SoftwareService } from './software.service';
import { SoftwareController } from './software.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SoftwareInstalled, AuthorizedSoftware])],
  controllers: [SoftwareController],
  providers: [SoftwareService],
  exports: [SoftwareService],         // exportado para AgentModule
})
export class SoftwareModule {}
```

---

## 4. Módulo Agent

### 4.1 Seguridad del endpoint

El endpoint `POST /agent/sync` **no usa JWT** — el agente en la PC no tiene
sesión de usuario. Se protege con una **API Key global** enviada en el header
`x-api-key`, almacenada en `.env` del servidor y en `config.json` del agente.

```
Header: x-api-key: <AGENT_API_KEY>
```

### 4.2 DTO principal

```typescript
// agent/dto/sync-agent.dto.ts

import { HardwareSnapshotDto } from '../../hardware/dto/hardware-snapshot.dto';
import { SoftwareSnapshotDto } from '../../software/dto/software-snapshot.dto';

export class SyncAgentDto {
  equipmentCode: string;              // "LAB01-PC05" — código del equipo en BD
  mode: 'full' | 'quick';
  timestamp: string;                  // ISO 8601: "2026-02-22T07:00:00Z"
  hardware?: HardwareSnapshotDto;     // requerido en mode: 'full'
  software?: SoftwareSnapshotDto;     // requerido en mode: 'full'
}
```

### 4.3 Guard de API Key

```typescript
// agent/guards/api-key.guard.ts

import {
  Injectable, CanActivate,
  ExecutionContext, UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request  = context.switchToHttp().getRequest();
    const apiKey   = request.headers['x-api-key'];
    const expected = process.env.AGENT_API_KEY;

    if (!apiKey || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API Key');
    }
    return true;
  }
}
```

### 4.4 Controlador

```typescript
// agent/agent.controller.ts

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AgentService } from './agent.service';
import { SyncAgentDto } from './dto/sync-agent.dto';
import { ApiKeyGuard } from './guards/api-key.guard';

@Controller('agent')
@UseGuards(ApiKeyGuard)
export class AgentController {

  constructor(private readonly agentService: AgentService) {}

  @Post('sync')
  sync(@Body() dto: SyncAgentDto) {
    return this.agentService.processSync(dto);
  }
}
```

### 4.5 Servicio — Orquestador central

```typescript
// agent/agent.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../equipments/entities/equipment.entity';
import { HardwareService } from '../hardware/hardware.service';
import { SoftwareService } from '../software/software.service';
import { HardwareSnapshot } from '../hardware/entities/hardware-snapshot.entity';
import { SyncAgentDto } from './dto/sync-agent.dto';

@Injectable()
export class AgentService {

  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    private readonly hardwareService: HardwareService,
    private readonly softwareService: SoftwareService,
  ) {}

  async processSync(dto: SyncAgentDto): Promise<{ ok: boolean; message: string }> {

    // 1. Buscar equipo por código
    const equipment = await this.equipmentRepo.findOne({
      where: { code: dto.equipmentCode, isActive: true },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Equipment with code "${dto.equipmentCode}" not found or inactive`,
      );
    }

    const capturedAt = new Date(dto.timestamp);

    // 2. Modo full: guarda hardware y software en paralelo
    if (dto.mode === 'full') {
      if (!dto.hardware || !dto.software) {
        throw new BadRequestException(
          'Fields "hardware" and "software" are required in full mode',
        );
      }

      const [hardwareSnapshot] = await Promise.all([
        this.hardwareService.saveSnapshot(equipment, dto.hardware, capturedAt),
        this.softwareService.saveSnapshot(equipment, dto.software, capturedAt),
      ]);

      // 3. Recalcular estado del equipo
      const newStatus = this.calculateEquipmentStatus(hardwareSnapshot);

      await this.equipmentRepo.update(equipment.id, {
        lastConnection: capturedAt,
        status: newStatus,
      });

    } else {
      // Modo quick: solo actualiza lastConnection
      await this.equipmentRepo.update(equipment.id, {
        lastConnection: capturedAt,
      });
    }

    return {
      ok: true,
      message: `Sync processed successfully for ${dto.equipmentCode}`,
    };
  }

  // ── Cálculo de estado del equipo ──────────────────────────────

  private calculateEquipmentStatus(
    hw: HardwareSnapshot,
  ): 'operative' | 'degraded' | 'critical' {

    const criticalTemp = hw.cpuTemperatureC > 85;
    const diskFailed   = hw.diskSmartStatus === 'failed';
    if (criticalTemp || diskFailed) return 'critical';

    const highTemp     = hw.cpuTemperatureC > 70;
    const highRamUsage = hw.ramTotalGB > 0 && (hw.ramUsedGB / hw.ramTotalGB) > 0.90;
    if (highTemp || highRamUsage) return 'degraded';

    return 'operative';
  }
}
```

### 4.6 Módulo

```typescript
// agent/agent.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from '../equipments/entities/equipment.entity';
import { HardwareModule } from '../hardware/hardware.module';
import { SoftwareModule } from '../software/software.module';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment]),
    HardwareModule,
    SoftwareModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
```

---

## 5. Estructura de carpetas

```
src/
├── agent/
│   ├── dto/
│   │   └── sync-agent.dto.ts
│   ├── guards/
│   │   └── api-key.guard.ts
│   ├── agent.controller.ts
│   ├── agent.service.ts
│   └── agent.module.ts
│
├── hardware/
│   ├── dto/
│   │   └── hardware-snapshot.dto.ts
│   ├── entities/
│   │   └── hardware-snapshot.entity.ts
│   ├── hardware.controller.ts
│   ├── hardware.service.ts
│   └── hardware.module.ts
│
└── software/
    ├── dto/
    │   ├── software-snapshot.dto.ts
    │   └── create-authorized-software.dto.ts
    ├── entities/
    │   ├── software-installed.entity.ts
    │   └── authorized-software.entity.ts
    ├── software.controller.ts
    ├── software.service.ts
    └── software.module.ts
```

---

## 6. JSON de ejemplo del agente

Request completo que envía el `agent.exe` al endpoint `POST /agent/sync`:

```json
{
  "equipmentCode": "LAB01-PC05",
  "mode": "full",
  "timestamp": "2026-02-22T07:00:00.000Z",

  "hardware": {
    "cpu": {
      "model": "Intel Core i5-10400",
      "cores": 6,
      "frequencyGHz": 2.9,
      "usagePercent": 12.5,
      "temperatureC": 45.0
    },
    "ram": {
      "totalGB": 8,
      "usedGB": 3.2,
      "type": "DDR4",
      "frequencyMHz": 2666
    },
    "disk": {
      "capacityGB": 500,
      "usedGB": 210.4,
      "type": "HDD",
      "model": "Seagate Barracuda ST500DM002",
      "smartStatus": "good"
    },
    "physicalEquipment": {
      "brand": "Dell",
      "model": "OptiPlex 3080",
      "serialNumber": "DXYZ1234",
      "manufactureYear": "2020",
      "architecture": "64bit"
    }
  },

  "software": {
    "items": [
      {
        "name": "Python 3.11.4",
        "version": "3.11.4",
        "publisher": "Python Software Foundation",
        "installedAt": "2024-03-10"
      },
      {
        "name": "Visual Studio Code",
        "version": "1.85.0",
        "publisher": "Microsoft Corporation",
        "installedAt": "2024-01-15"
      },
      {
        "name": "uTorrent",
        "version": "3.6.0",
        "publisher": "BitTorrent Inc.",
        "installedAt": "2025-09-01"
      }
    ]
  }
}
```

**Resultado esperado del procesamiento:**

| Paso | Resultado |
|---|---|
| Buscar equipo | `LAB01-PC05` encontrado y activo ✓ |
| `HardwareSnapshot` guardado | `isObsolete = true` — disco tipo HDD ⚠️ |
| `SoftwareInstalled` × 3 items | Python ✓ whitelist · VS Code ✓ whitelist · uTorrent ✗ |
| uTorrent | `isWhitelisted = false` · 174 días instalado → `isRisk = true` ⚠️ |
| Estado del equipo | `operative` — temperatura 45°C, SMART good |
| `equipment.lastConnection` | Actualizado a `2026-02-22T07:00:00Z` ✓ |
| `equipment.status` | `operative` ✓ |

---

## Resumen de endpoints

### Agent
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/agent/sync` | API Key | Recibe y procesa el sync del agente |

### Hardware
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/hardware/equipment/:id/latest` | JWT | Último snapshot de hardware |
| GET | `/hardware/equipment/:id/history` | JWT | Historial con rango `from` / `to` |
| GET | `/hardware/obsolete` | JWT | Equipos obsoletos detectados |

### Software
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/software/equipment/:id/latest` | JWT | Último snapshot de software |
| GET | `/software/equipment/:id/risky` | JWT | Software de riesgo de un equipo |
| GET | `/software/risky` | JWT | Todo el software de riesgo |
| GET | `/software/unlicensed` | JWT | Software sin licencia detectado |
| GET | `/software/whitelist` | JWT | Lista blanca activa |
| POST | `/software/whitelist` | JWT | Agregar software autorizado |
| DELETE | `/software/whitelist/:id` | JWT | Desactivar entrada de whitelist |

---

*Documentación generada para el sistema de auditoría EPIS-UNT · 2026*