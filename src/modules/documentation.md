# 🛡️ Sistema de Auditoría de Laboratorios — UNT
## Documentación Técnica del Backend (NestJS)
**Proyecto:** Auditoría de Software y Hardware — Escuela de Ingeniería de Sistemas  
**Universidad:** Universidad Nacional de Trujillo (UNT)  
**Período auditado:** 2026-EXT | Campo: 16/02/2026 – 16/03/2026  
**Stack:** NestJS · TypeORM · PostgreSQL · JWT  

---

## 📑 Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Módulos del Sistema](#2-módulos-del-sistema)
3. [Módulo 1 — Auth](#3-módulo-1--auth)
4. [Módulo 2 — Equipos](#4-módulo-2--equipos)
5. [Módulo 3 — Reportes (Ingest)](#5-módulo-3--reportes-ingest)
6. [Módulo 4 — Sistema & Métricas](#6-módulo-4--sistema--métricas)
7. [Módulo 5 — Seguridad](#7-módulo-5--seguridad)
8. [Módulo 6 — Software & Procesos](#8-módulo-6--software--procesos)
9. [Módulo 7 — Dashboard & Alertas](#9-módulo-7--dashboard--alertas)
10. [Módulo 8 — Auditoría (Cumplimiento)](#10-módulo-8--auditoría-cumplimiento)
11. [Entidades y Relaciones (ERD)](#11-entidades-y-relaciones-erd)
12. [Reglas de Negocio y Umbrales](#12-reglas-de-negocio-y-umbrales)
13. [Variables de Entorno](#13-variables-de-entorno)
14. [Hoja de Ruta por Lotes](#14-hoja-de-ruta-por-lotes)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    AGENTE (PowerShell)                   │
│   Recopila info del equipo → POST /api/reportes/ingest  │
└───────────────────────┬─────────────────────────────────┘
                        │ JSON payload
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   NESTJS BACKEND API                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   Auth   │  │ Equipos  │  │Reportes  │  │ Dash   │  │
│  │  Module  │  │  Module  │  │  Module  │  │ Module │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Sistema  │  │Seguridad │  │ Software │  │ Audit  │  │
│  │ Métricas │  │  Module  │  │ Module   │  │ Module │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ TypeORM
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              FRONTEND WEB (Auditor UNT)                  │
│         Dashboard visual por equipo/laboratorio          │
└─────────────────────────────────────────────────────────┘
```

**Flujo principal:**  
El agente instalado en cada equipo de laboratorio recopila datos técnicos y los envía vía `POST /api/reportes/ingest`. El backend los procesa, normaliza, evalúa contra umbrales y los persiste por módulo. El auditor consulta el dashboard web para revisar el estado consolidado de todos los equipos.

---

## 2. Módulos del Sistema

| # | Módulo | Descripción | Prioridad |
|---|--------|-------------|-----------|
| 1 | **Auth** | Autenticación JWT para auditores y API keys para agentes | 🔴 Alta |
| 2 | **Equipos** | CRUD de máquinas registradas y laboratorios | 🔴 Alta |
| 3 | **Reportes (Ingest)** | Endpoint que recibe el JSON del agente y lo distribuye | 🔴 Alta |
| 4 | **Sistema & Métricas** | Info del OS, BIOS, métricas de rendimiento | 🔴 Alta |
| 5 | **Seguridad** | Antivirus, parches, alertas de seguridad | 🔴 Alta |
| 6 | **Software & Procesos** | Licencias de software, procesos activos | 🟡 Media |
| 7 | **Dashboard & Alertas** | Consolidado por equipo, alertas automáticas | 🟡 Media |
| 8 | **Auditoría (Cumplimiento)** | Cuestionarios, pruebas sustantivas, evidencias | 🟢 Baja |

> **Recomendación:** Desarrollar en el orden de la tabla. Los módulos 1–3 son el núcleo mínimo funcional para recibir datos del agente. Los módulos 4–5 completan la persistencia de datos críticos. Los módulos 6–8 agregan inteligencia y reporting.

---

## 3. Módulo 1 — Auth

### Propósito
Controlar el acceso al sistema. Existen dos tipos de actores:
- **Auditores** (humanos): acceden al dashboard web con usuario/contraseña → reciben JWT.
- **Agentes** (software en equipos): usan una API Key estática por laboratorio para enviar reportes.

### Entidades

#### `users` — Auditores del sistema
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;                // e.g. palayo@unitru.edu.pe

  @Column()
  password: string;             // bcrypt hash

  @Column({ default: 'auditor' })
  role: string;                 // 'admin' | 'auditor' | 'viewer'

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### `api_keys` — Claves para agentes por laboratorio
```typescript
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;                  // hash SHA-256 de la clave real

  @Column()
  description: string;          // e.g. "Laboratorio A - Sala 201"

  @Column({ nullable: true })
  laboratoryId: string;         // referencia al laboratorio

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  lastUsedAt: Date;
}
```

### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/login` | Login de auditor → retorna JWT | ❌ Público |
| `POST` | `/api/auth/logout` | Invalida sesión | 🔑 JWT |
| `GET` | `/api/auth/profile` | Info del auditor actual | 🔑 JWT |
| `POST` | `/api/auth/api-keys` | Crear nueva API key para agente | 🔑 JWT Admin |
| `GET` | `/api/auth/api-keys` | Listar API keys | 🔑 JWT Admin |
| `DELETE` | `/api/auth/api-keys/:id` | Revocar API key | 🔑 JWT Admin |

### DTOs clave

```typescript
// login.dto.ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// login-response.dto.ts
export class LoginResponseDto {
  access_token: string;      // JWT con exp: 8h
  user: {
    id: string;
    email: string;
    role: string;
  };
}
```

### Guards necesarios
- `JwtAuthGuard` — protege rutas del dashboard.
- `ApiKeyGuard` — protege el endpoint `/api/reportes/ingest`, valida la cabecera `X-API-KEY`.

---

## 4. Módulo 2 — Equipos

### Propósito
Registrar y gestionar los equipos (máquinas) y laboratorios que serán auditados. Un equipo puede auto-registrarse la primera vez que el agente envía datos.

### Entidades

#### `laboratories` — Laboratorios / Salas
```typescript
@Entity('laboratories')
export class Laboratory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;                 // e.g. "Laboratorio A", "Sala 201"

  @Column({ nullable: true })
  location: string;             // e.g. "Pabellón H, 2do piso"

  @Column({ nullable: true })
  responsible: string;          // e.g. "Dr. Luis Boy Chavil"

  @Column({ nullable: true })
  responsibleEmail: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Equipment, eq => eq.laboratory)
  equipment: Equipment[];
}
```

#### `equipment` — Equipos / Máquinas
```typescript
@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  hostname: string;             // "ELMO" — clave natural del agente

  @Column({ nullable: true })
  currentUser: string;          // "elmot" — último usuario logueado

  @Column({ nullable: true })
  ipAddress: string;            // "192.168.100.4"

  @Column({ nullable: true })
  osVersion: string;            // "Microsoft Windows 11 Home..."

  @Column({ nullable: true })
  architecture: string;         // "64 bits"

  @ManyToOne(() => Laboratory, lab => lab.equipment, { nullable: true })
  laboratory: Laboratory;

  @Column({ nullable: true })
  laboratoryId: string;

  @Column({ default: 'unknown' })
  status: string;               // 'online' | 'offline' | 'warning' | 'critical'

  @Column({ nullable: true })
  lastSeenAt: Date;             // última vez que el agente envió datos

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones hacia otros módulos
  @OneToMany(() => Report, r => r.equipment)
  reports: Report[];
}
```

### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/equipos` | Listar todos los equipos con estado actual | 🔑 JWT |
| `GET` | `/api/equipos/:id` | Detalle de un equipo | 🔑 JWT |
| `PATCH` | `/api/equipos/:id` | Actualizar laboratorio asignado, notas | 🔑 JWT |
| `GET` | `/api/equipos/:id/historial` | Historial de reportes de un equipo | 🔑 JWT |
| `GET` | `/api/laboratorios` | Listar laboratorios | 🔑 JWT |
| `POST` | `/api/laboratorios` | Crear laboratorio | 🔑 JWT Admin |
| `PATCH` | `/api/laboratorios/:id` | Actualizar laboratorio | 🔑 JWT Admin |

### Lógica de auto-registro
Cuando llega un reporte del agente con un `Equipo` (hostname) que no existe en la BD, el sistema lo crea automáticamente con estado `unknown` y sin laboratorio asignado. El auditor luego lo asigna manualmente a un laboratorio desde el dashboard.

---

## 5. Módulo 3 — Reportes (Ingest)

### Propósito
Es el **corazón del sistema**. Recibe el JSON completo del agente, lo valida, lo parsea y lo distribuye a cada sub-módulo para persistencia. Un reporte es una "fotografía" completa de un equipo en un instante de tiempo.

### Entidad principal

#### `reports` — Reporte completo por equipo
```typescript
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, eq => eq.reports)
  equipment: Equipment;

  @Column()
  equipmentId: string;

  @Column({ type: 'timestamp' })
  agentTimestamp: Date;         // "2026-02-12 00:16:24" del agente

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;             // cuándo llegó al servidor

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: object;           // JSON completo original (para auditoría)

  @Column({ default: 'processed' })
  status: string;               // 'processed' | 'error' | 'partial'

  // FK hacia tablas de detalle (creadas por módulos posteriores)
  @OneToOne(() => SystemInfo, s => s.report)
  systemInfo: SystemInfo;

  @OneToOne(() => MetricsSnapshot, m => m.report)
  metrics: MetricsSnapshot;

  @OneToOne(() => StorageInfo, s => s.report)
  storage: StorageInfo;

  @OneToOne(() => SecuritySnapshot, s => s.report)
  security: SecuritySnapshot;

  @OneToMany(() => SoftwareLicense, s => s.report)
  software: SoftwareLicense[];

  @OneToMany(() => ProcessSnapshot, p => p.report)
  processes: ProcessSnapshot[];
}
```

### Endpoint de ingesta

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/reportes/ingest` | Recibe JSON del agente | 🔑 API Key |
| `GET` | `/api/reportes` | Listar reportes (paginado, filtrable) | 🔑 JWT |
| `GET` | `/api/reportes/:id` | Ver reporte completo | 🔑 JWT |

### DTO de ingesta — Mapeo del JSON del agente

```typescript
// ingest-report.dto.ts
export class IngestReportDto {
  @IsString()
  Timestamp: string;            // "2026-02-12 00:16:24"

  @IsString()
  Equipo: string;               // "ELMO"

  @IsString()
  Usuario: string;              // "elmot"

  @ValidateNested()
  @Type(() => SistemaDto)
  Sistema: SistemaDto;

  @ValidateNested()
  @Type(() => MetricasDto)
  Metricas: MetricasDto;

  @ValidateNested()
  @Type(() => AlmacenamientoDto)
  Almacenamiento: AlmacenamientoDto;

  @ValidateNested()
  @Type(() => SeguridadDto)
  Seguridad: SeguridadDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoftwareItemDto)
  Software: SoftwareItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcesoDto)
  TopProcesos: ProcesoDto[];
}

export class SistemaDto {
  Version: string;              // "10.0.26100"
  Arquitectura: string;         // "64 bits"
  BIOS_Ver: string;             // "X513EAN.307"
  Instalado: string;            // "17/04/2025 14:58"
  IP_Local: string;             // "192.168.100.4"
  OS: string;                   // "Microsoft Windows 11 Home..."
  BIOS_Fecha: string;           // "09/04/2023"
  Win_Estado: string;           // "Activado"
}

export class MetricasDto {
  Temp_C: number;               // 47.1
  CPU_Carga: number;            // 14
  RAM_Uso_Porc: number;         // 88.2
}

export class AlmacenamientoDto {
  DeviceID: string;             // "C:"
  Total_GB: number;             // 475.45
  Libre_GB: number;             // 192.88
  Porcentaje_Libre: number;     // 40.57
}

export class SeguridadDto {
  Antivirus: AntivirusDto;
  Parches: ParcheDto[];
}

export class AntivirusDto {
  displayName: string;          // "Windows Defender"
  Estado: string;               // "Protegido"
}

export class ParcheDto {
  HotFixID: string;             // "KB5077181"
  Description: string;          // "Security Update"
  InstalledOn: {
    value: string;              // "/Date(1770786000000)/"
    DateTime: string;           // fecha en español
  };
}

export class SoftwareItemDto {
  Name: string;                 // "Office 16, ..."
  Estado: string;               // "Expirado" | "Valido"
}

export class ProcesoDto {
  Name: string;                 // "sqlservr"
  CPU: number;                  // 22066.45
  RAM_MB: number;               // 42.61
}
```

### Lógica del servicio de ingesta (`IngestService`)

```
POST /api/reportes/ingest
│
├─ 1. Validar API Key (guard)
├─ 2. Validar y parsear DTO (ValidationPipe)
├─ 3. Buscar o crear Equipment por hostname
├─ 4. Actualizar Equipment.lastSeenAt, currentUser, ipAddress
├─ 5. Crear registro en `reports` con rawPayload
├─ 6. Persistir SystemInfo (módulo 4)
├─ 7. Persistir MetricsSnapshot (módulo 4)
├─ 8. Persistir StorageInfo (módulo 4)
├─ 9. Persistir SecuritySnapshot + Patches (módulo 5)
├─ 10. Persistir SoftwareLicenses (módulo 6)
├─ 11. Persistir ProcessSnapshots (módulo 6)
├─ 12. Evaluar alertas automáticas (módulo 7)
└─ 13. Retornar { reportId, equipmentId, alertsTriggered }
```

Todo dentro de una **transacción de base de datos** para garantizar consistencia.

---

## 6. Módulo 4 — Sistema & Métricas

### Propósito
Persistir y consultar la información del OS, BIOS, arquitectura y las métricas de rendimiento (temperatura, CPU, RAM) y almacenamiento de cada reporte.

### Entidades

#### `system_info` — Info del sistema operativo y BIOS
```typescript
@Entity('system_info')
export class SystemInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Report)
  @JoinColumn()
  report: Report;

  @Column()
  reportId: string;

  @Column()
  equipmentId: string;

  // Datos del OS
  @Column()
  osName: string;               // "Microsoft Windows 11 Home Single Language"

  @Column()
  osVersion: string;            // "10.0.26100"

  @Column()
  architecture: string;         // "64 bits"

  @Column()
  windowsActivationStatus: string; // "Activado" | "No activado"

  @Column({ nullable: true })
  osInstallDate: Date;          // parseado de "17/04/2025 14:58"

  @Column({ nullable: true })
  ipAddress: string;            // "192.168.100.4"

  // Datos BIOS
  @Column({ nullable: true })
  biosVersion: string;          // "X513EAN.307"

  @Column({ nullable: true })
  biosDate: Date;               // parseado de "09/04/2023"

  @CreateDateColumn()
  createdAt: Date;
}
```

#### `metrics_snapshots` — Métricas de rendimiento
```typescript
@Entity('metrics_snapshots')
export class MetricsSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Report)
  @JoinColumn()
  report: Report;

  @Column()
  reportId: string;

  @Column()
  equipmentId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  cpuTemperatureCelsius: number;  // 47.1

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  cpuUsagePercent: number;        // 14.0

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  ramUsagePercent: number;        // 88.2

  // Campos calculados / evaluados
  @Column({ default: 'normal' })
  cpuTempStatus: string;          // 'normal' | 'warning' | 'critical'

  @Column({ default: 'normal' })
  cpuUsageStatus: string;

  @Column({ default: 'normal' })
  ramUsageStatus: string;

  @CreateDateColumn()
  capturedAt: Date;
}
```

#### `storage_info` — Almacenamiento
```typescript
@Entity('storage_info')
export class StorageInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Report)
  @JoinColumn()
  report: Report;

  @Column()
  reportId: string;

  @Column()
  equipmentId: string;

  @Column()
  deviceId: string;               // "C:"

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalGb: number;                // 475.45

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  freeGb: number;                 // 192.88

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  freePercent: number;            // 40.57

  @Column({ type: 'decimal', precision: 5, scale: 2, generatedType: 'STORED',
    asExpression: 'total_gb - free_gb' })
  usedGb: number;                 // calculado

  @Column({ default: 'normal' })
  storageStatus: string;          // 'normal' | 'warning' | 'critical'

  @CreateDateColumn()
  createdAt: Date;
}
```

### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/equipos/:id/sistema` | Último snapshot de sistema del equipo | 🔑 JWT |
| `GET` | `/api/equipos/:id/metricas` | Histórico de métricas (con filtro fecha) | 🔑 JWT |
| `GET` | `/api/equipos/:id/almacenamiento` | Histórico de almacenamiento | 🔑 JWT |
| `GET` | `/api/metricas/resumen` | Resumen de todos los equipos (para dashboard) | 🔑 JWT |

---

## 7. Módulo 5 — Seguridad

### Propósito
Gestionar y evaluar el estado de seguridad de cada equipo: antivirus, parches de seguridad instalados y detección de equipos con protección deficiente. Este módulo está directamente vinculado a las pruebas **PS-SW-01** y **PS-SW-02** del instrumento de auditoría.

### Entidades

#### `security_snapshots` — Estado de seguridad por reporte
```typescript
@Entity('security_snapshots')
export class SecuritySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Report)
  @JoinColumn()
  report: Report;

  @Column()
  reportId: string;

  @Column()
  equipmentId: string;

  // Antivirus
  @Column()
  antivirusName: string;          // "Windows Defender"

  @Column()
  antivirusStatus: string;        // "Protegido" | "No protegido" | "Desconocido"

  @Column({ default: false })
  isProtected: boolean;           // true si antivirusStatus === "Protegido"

  // Resumen de parches
  @Column({ default: 0 })
  totalPatches: number;           // cantidad total de parches

  @Column({ nullable: true })
  lastSecurityPatchDate: Date;    // fecha del parche de seguridad más reciente

  @Column({ nullable: true })
  daysSinceLastPatch: number;     // días desde el último parche (calculado)

  // Estado general de seguridad
  @Column({ default: 'unknown' })
  securityLevel: string;          // 'secure' | 'warning' | 'critical'

  @CreateDateColumn()
  capturedAt: Date;

  @OneToMany(() => PatchRecord, p => p.securitySnapshot)
  patches: PatchRecord[];
}
```

#### `patch_records` — Parches individuales instalados
```typescript
@Entity('patch_records')
export class PatchRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SecuritySnapshot, s => s.patches)
  securitySnapshot: SecuritySnapshot;

  @Column()
  securitySnapshotId: string;

  @Column()
  equipmentId: string;

  @Column()
  hotfixId: string;               // "KB5077181"

  @Column()
  description: string;            // "Security Update" | "Update"

  @Column({ nullable: true })
  installedOn: Date;              // parseado del timestamp Unix

  @Column({ nullable: true })
  installedOnRaw: string;         // valor original "/Date(1770786000000)/"

  @Column({ default: false })
  isSecurityPatch: boolean;       // true si description === "Security Update"

  @CreateDateColumn()
  createdAt: Date;
}
```

### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/equipos/:id/seguridad` | Estado de seguridad actual del equipo | 🔑 JWT |
| `GET` | `/api/equipos/:id/parches` | Historial de parches del equipo | 🔑 JWT |
| `GET` | `/api/seguridad/resumen` | Resumen de seguridad de todos los equipos | 🔑 JWT |
| `GET` | `/api/seguridad/sin-antivirus` | Equipos sin protección activa | 🔑 JWT |
| `GET` | `/api/seguridad/parches-desactualizados` | Equipos con parches > 30 días | 🔑 JWT |

### Lógica de evaluación de seguridad

```typescript
// security.service.ts — evaluateSecurityLevel()
function evaluateSecurityLevel(snapshot: SecuritySnapshot): string {
  const critical =
    !snapshot.isProtected ||
    snapshot.daysSinceLastPatch > 90;

  const warning =
    snapshot.daysSinceLastPatch > 30 ||
    snapshot.antivirusStatus === 'Desconocido';

  if (critical) return 'critical';
  if (warning) return 'warning';
  return 'secure';
}
```

---

## 8. Módulo 6 — Software & Procesos

### Propósito
Registrar el estado de licencias de software instalado (cumplimiento de licenciamiento, prueba **PS-SW-03**) y los procesos activos con mayor consumo de recursos (prueba **PS-HW-03** y **PS-SW-05**).

### Entidades

#### `software_licenses` — Estado de licencias por reporte
```typescript
@Entity('software_licenses')
export class SoftwareLicense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Report, r => r.software)
  report: Report;

  @Column()
  reportId: string;

  @Column()
  equipmentId: string;

  @Column()
  softwareName: string;           // "Office 21, Office21ProPlus2021..."

  @Column()
  licenseStatus: string;          // "Valido" | "Expirado"

  @Column({ default: false })
  isExpired: boolean;             // true si licenseStatus === "Expirado"

  @Column({ nullable: true })
  softwareFamily: string;         // "Microsoft Office" — normalizado

  @CreateDateColumn()
  createdAt: Date;
}
```

#### `process_snapshots` — Procesos activos por reporte
```typescript
@Entity('process_snapshots')
export class ProcessSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Report, r => r.processes)
  report: Report;

  @Column()
  reportId: string;

  @Column()
  equipmentId: string;

  @Column()
  processName: string;            // "sqlservr", "chrome", "MsMpEng"

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  cpuTime: number;                // 22066.45 (tiempo acumulado de CPU)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ramMb: number;                  // 42.61

  @Column({ default: 0 })
  rank: number;                   // posición en el top (1 = mayor consumo)

  @CreateDateColumn()
  capturedAt: Date;
}
```

### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/equipos/:id/software` | Licencias actuales del equipo | 🔑 JWT |
| `GET` | `/api/equipos/:id/procesos` | Top procesos del último reporte | 🔑 JWT |
| `GET` | `/api/software/expirados` | Equipos con licencias expiradas | 🔑 JWT |
| `GET` | `/api/software/resumen` | Resumen de cumplimiento de licencias | 🔑 JWT |
| `GET` | `/api/procesos/resumen` | Procesos más frecuentes en todos los equipos | 🔑 JWT |

---

## 9. Módulo 7 — Dashboard & Alertas

### Propósito
Proveer endpoints consolidados para el dashboard visual del auditor y gestionar el sistema de alertas automáticas que se generan cuando se detectan umbrales críticos.

### Entidades

#### `alerts` — Alertas generadas automáticamente
```typescript
@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  equipmentId: string;

  @ManyToOne(() => Equipment)
  equipment: Equipment;

  @Column()
  reportId: string;              // reporte que la originó

  @Column()
  type: string;                  // ver tipos abajo

  @Column()
  severity: string;              // 'info' | 'warning' | 'critical'

  @Column({ type: 'text' })
  message: string;               // descripción legible

  @Column({ type: 'jsonb', nullable: true })
  metadata: object;              // datos adicionales del contexto

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Tipos de alerta (`type`):**
| Código | Descripción | Severidad |
|--------|-------------|-----------|
| `WINDOWS_NOT_ACTIVATED` | Windows sin activar | 🔴 critical |
| `ANTIVIRUS_NOT_PROTECTED` | Antivirus inactivo | 🔴 critical |
| `CPU_TEMP_HIGH` | Temperatura CPU > 85°C | 🔴 critical |
| `CPU_TEMP_WARNING` | Temperatura CPU > 70°C | 🟡 warning |
| `RAM_USAGE_HIGH` | RAM > 90% | 🔴 critical |
| `RAM_USAGE_WARNING` | RAM > 80% | 🟡 warning |
| `STORAGE_LOW` | Espacio libre < 10% | 🔴 critical |
| `STORAGE_WARNING` | Espacio libre < 20% | 🟡 warning |
| `PATCHES_OUTDATED_90D` | Sin parches en 90+ días | 🔴 critical |
| `PATCHES_OUTDATED_30D` | Sin parches en 30+ días | 🟡 warning |
| `SOFTWARE_EXPIRED` | Licencia de software expirada | 🟡 warning |

### Endpoints del Dashboard

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/dashboard/resumen` | KPIs globales de todos los equipos | 🔑 JWT |
| `GET` | `/api/dashboard/equipos` | Lista de equipos con estado actual (card view) | 🔑 JWT |
| `GET` | `/api/dashboard/equipos/:id` | Vista detallada de un equipo | 🔑 JWT |
| `GET` | `/api/alertas` | Listar alertas (filtrable por equipo, severidad) | 🔑 JWT |
| `PATCH` | `/api/alertas/:id/leer` | Marcar alerta como leída | 🔑 JWT |
| `PATCH` | `/api/alertas/:id/resolver` | Marcar alerta como resuelta | 🔑 JWT |

### Respuesta del endpoint `/api/dashboard/resumen`

```json
{
  "totalEquipos": 25,
  "equiposOnline": 18,
  "equiposConAlertas": 7,
  "equiposCriticos": 2,
  "alertasActivas": 15,
  "resumenSeguridad": {
    "sinAntivirus": 0,
    "conParchesDesactualizados": 3,
    "windowsNoActivado": 1
  },
  "resumenRendimiento": {
    "temperaturaPromedioC": 52.3,
    "ramPromedioPorc": 71.5,
    "equiposConRamCritica": 2
  },
  "resumenLicencias": {
    "totalSoftwareExpirado": 8,
    "equiposConExpirados": 5
  }
}
```

---

## 10. Módulo 8 — Auditoría (Cumplimiento)

### Propósito
Gestionar los cuestionarios de pruebas de cumplimiento y las pruebas sustantivas definidas en el instrumento de auditoría de la UNT (sección 4.12 del diseño). Permite al auditor registrar respuestas, adjuntar evidencias y generar el informe final.

### Entidades

#### `audit_questionnaires` — Cuestionarios de cumplimiento
```typescript
@Entity('audit_questionnaires')
export class AuditQuestionnaire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  auditPeriod: string;            // "2026-EXT"

  @Column()
  auditedBy: string;              // nombre del auditor

  @Column()
  respondentName: string;         // "Dr. Luis Enrique Boy Chavil"

  @Column()
  respondentEmail: string;

  @Column()
  type: string;                   // 'hardware' | 'software'

  @Column({ default: 'pending' })
  status: string;                 // 'pending' | 'in_progress' | 'completed'

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @OneToMany(() => QuestionnaireItem, item => item.questionnaire)
  items: QuestionnaireItem[];
}
```

#### `questionnaire_items` — Ítems individuales del cuestionario
```typescript
@Entity('questionnaire_items')
export class QuestionnaireItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditQuestionnaire, q => q.items)
  questionnaire: AuditQuestionnaire;

  @Column()
  questionCode: string;           // "HW-01", "SW-03"

  @Column({ type: 'text' })
  questionText: string;

  @Column({ nullable: true })
  normativeReference: string;     // "COBIT 2019 / ISO 27001:2022 A.8.8"

  @Column({ nullable: true })
  answer: string;                 // 'si' | 'no' | 'ns' (No Sabe/No Aplica)

  @Column({ nullable: true, type: 'text' })
  observations: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

#### `substantive_tests` — Pruebas sustantivas (PS-HW-xx / PS-SW-xx)
```typescript
@Entity('substantive_tests')
export class SubstantiveTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  auditPeriod: string;            // "2026-EXT"

  @Column()
  testCode: string;               // "PS-HW-01", "PS-SW-03"

  @Column()
  area: string;                   // 'hardware' | 'software'

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  equipmentId: string;            // si aplica a un equipo específico

  @Column({ nullable: true })
  laboratoryId: string;           // si aplica a un laboratorio

  @Column({ nullable: true })
  linkedReportId: string;         // reporte del agente que sirve como evidencia

  @Column({ nullable: true })
  normativeReference: string;

  @Column({ default: 'pending' })
  result: string;                 // 'conforme' | 'no_conforme' | 'parcial' | 'pending'

  @Column({ nullable: true, type: 'text' })
  findings: string;               // hallazgos del auditor

  @Column({ nullable: true, type: 'text' })
  recommendations: string;

  @Column({ nullable: true })
  evidencePath: string;           // ruta a archivo de evidencia (screenshot, CSV)

  @CreateDateColumn()
  executedAt: Date;
}
```

### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auditoria/cuestionarios` | Crear cuestionario nuevo | 🔑 JWT |
| `GET` | `/api/auditoria/cuestionarios` | Listar cuestionarios | 🔑 JWT |
| `PATCH` | `/api/auditoria/cuestionarios/:id/items` | Registrar respuestas | 🔑 JWT |
| `POST` | `/api/auditoria/pruebas-sustantivas` | Registrar prueba sustantiva | 🔑 JWT |
| `GET` | `/api/auditoria/pruebas-sustantivas` | Listar pruebas por período/área | 🔑 JWT |
| `PATCH` | `/api/auditoria/pruebas-sustantivas/:id` | Actualizar resultado/hallazgo | 🔑 JWT |
| `GET` | `/api/auditoria/informe` | Generar informe consolidado del período | 🔑 JWT |

---

## 11. Entidades y Relaciones (ERD)

```
┌─────────────────┐       ┌──────────────────┐
│   laboratories  │──────<│    equipment     │
│─────────────────│  1:N  │──────────────────│
│ id              │       │ id               │
│ name            │       │ hostname (UNIQUE) │
│ location        │       │ currentUser      │
│ responsible     │       │ ipAddress        │
│ responsibleEmail│       │ osVersion        │
└─────────────────┘       │ status           │
                          │ lastSeenAt       │
                          │ laboratoryId     │
                          └────────┬─────────┘
                                   │ 1:N
                          ┌────────▼─────────┐
                          │     reports       │
                          │─────────────────  │
                          │ id               │
                          │ equipmentId      │
                          │ agentTimestamp   │
                          │ receivedAt       │
                          │ rawPayload (jsonb)│
                          └──┬──┬──┬──┬──┬───┘
              ┌──────────────┘  │  │  │  │  └──────────────────┐
              │           ┌─────┘  │  │  └──────┐              │
              ▼           ▼        ▼  │          ▼              ▼
       ┌──────────┐ ┌──────────┐   │  │  ┌──────────────┐ ┌──────────────┐
       │system_   │ │metrics_  │   │  │  │software_     │ │process_      │
       │info      │ │snapshots │   │  │  │licenses      │ │snapshots     │
       │──────────│ │──────────│   │  │  │──────────────│ │──────────────│
       │osName    │ │cpuTempC  │   │  │  │softwareName  │ │processName   │
       │osVersion │ │cpuUsage  │   │  │  │licenseStatus │ │cpuTime       │
       │biosVer   │ │ramUsage  │   │  │  │isExpired     │ │ramMb         │
       └──────────┘ └──────────┘   │  │  └──────────────┘ └──────────────┘
                                   │  │
                          ┌────────┘  └───────────┐
                          ▼                       ▼
                 ┌─────────────────┐    ┌──────────────────┐
                 │security_        │    │alerts            │
                 │snapshots        │    │──────────────────│
                 │─────────────────│    │type              │
                 │antivirusName    │    │severity          │
                 │antivirusStatus  │    │message           │
                 │isProtected      │    │isRead            │
                 │totalPatches     │    │isResolved        │
                 │securityLevel    │    └──────────────────┘
                 └────────┬────────┘
                          │ 1:N
                 ┌────────▼────────┐
                 │ patch_records   │
                 │─────────────────│
                 │ hotfixId        │
                 │ description     │
                 │ installedOn     │
                 │ isSecurityPatch │
                 └─────────────────┘
```

---

## 12. Reglas de Negocio y Umbrales

Basados en las pruebas sustantivas del instrumento de auditoría (PS-HW-03, PS-SW-01, PS-SW-02, PS-SW-03):

### Temperatura CPU
| Condición | Estado | Alerta |
|-----------|--------|--------|
| ≤ 70°C | `normal` | Ninguna |
| 70–85°C | `warning` | `CPU_TEMP_WARNING` |
| > 85°C | `critical` | `CPU_TEMP_HIGH` |

### Carga CPU
| Condición | Estado |
|-----------|--------|
| ≤ 70% | `normal` |
| 70–90% | `warning` |
| > 90% | `critical` |

### Uso de RAM
| Condición | Estado | Alerta |
|-----------|--------|--------|
| ≤ 80% | `normal` | Ninguna |
| 80–90% | `warning` | `RAM_USAGE_WARNING` |
| > 90% | `critical` | `RAM_USAGE_HIGH` |

### Espacio de almacenamiento libre
| Condición | Estado | Alerta |
|-----------|--------|--------|
| ≥ 20% | `normal` | Ninguna |
| 10–20% | `warning` | `STORAGE_WARNING` |
| < 10% | `critical` | `STORAGE_LOW` |

### Parches de seguridad
| Condición | Alerta |
|-----------|--------|
| Último parche hace > 30 días | `PATCHES_OUTDATED_30D` |
| Último parche hace > 90 días | `PATCHES_OUTDATED_90D` |

### Seguridad
| Condición | Alerta |
|-----------|--------|
| Antivirus ≠ "Protegido" | `ANTIVIRUS_NOT_PROTECTED` |
| Windows ≠ "Activado" | `WINDOWS_NOT_ACTIVATED` |

### Licencias
| Condición | Alerta |
|-----------|--------|
| `Estado === "Expirado"` | `SOFTWARE_EXPIRED` |

---

## 13. Variables de Entorno

```env
# Servidor
PORT=3000
NODE_ENV=production

# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=audit_user
DB_PASSWORD=your_secure_password
DB_NAME=audit_unt_db

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=8h

# API Keys (semilla inicial para el primer laboratorio)
INITIAL_API_KEY=your_initial_api_key

# Configuración de umbrales (opcional, con defaults)
THRESHOLD_CPU_TEMP_WARNING=70
THRESHOLD_CPU_TEMP_CRITICAL=85
THRESHOLD_RAM_WARNING=80
THRESHOLD_RAM_CRITICAL=90
THRESHOLD_STORAGE_WARNING=20
THRESHOLD_STORAGE_CRITICAL=10
THRESHOLD_PATCH_WARNING_DAYS=30
THRESHOLD_PATCH_CRITICAL_DAYS=90
```

---

## 14. Hoja de Ruta por Lotes

Aquí está la forma recomendada de dividir el desarrollo en lotes (sesiones de IA o sesiones propias de desarrollo), de menor a mayor complejidad, asegurando que en cada lote el sistema sea funcional:

### 🔴 Lote 1 — Núcleo Mínimo Funcional
**Objetivo:** El agente ya puede enviar datos y se persisten en la BD.
1. Configuración del proyecto NestJS (estructura de carpetas, TypeORM, PostgreSQL)
2. `Auth Module` completo (JWT + ApiKeyGuard)
3. `Equipment Module` básico (entidad + auto-registro)
4. `Reports Module` — endpoint `POST /api/reportes/ingest` que guarda el raw payload

**Resultado:** El agente puede conectarse y guardar datos.

---

### 🔴 Lote 2 — Persistencia de Datos Críticos
**Objetivo:** Los datos del JSON se distribuyen y persisten en tablas normalizadas.
1. `Sistema & Métricas Module` (entidades + parsing + persistencia desde ingest)
2. `Seguridad Module` (entidades + parsing de parches Unix timestamp + evaluación)
3. Lógica de evaluación de umbrales en `MetricsSnapshot` y `SecuritySnapshot`

**Resultado:** Toda la información del JSON se guarda correctamente separada.

---

### 🟡 Lote 3 — Software, Procesos y Alertas
**Objetivo:** Completar la persistencia y agregar inteligencia de alertas.
1. `Software & Procesos Module` (entidades + persistencia)
2. `Alertas Module` (entidad + generación automática al final del ingest)
3. Endpoints de consulta para todos los módulos

**Resultado:** El sistema genera alertas automáticas al procesar cada reporte.

---

### 🟡 Lote 4 — Dashboard y Consultas Consolidadas
**Objetivo:** Endpoints que alimentan la interfaz del auditor.
1. Endpoint `/api/dashboard/resumen` con KPIs globales
2. Endpoint `/api/dashboard/equipos` con estado por equipo
3. Endpoints de filtrado: equipos sin antivirus, parches desactualizados, licencias expiradas
4. Paginación y filtros en todos los listados

**Resultado:** El frontend puede construir el dashboard completo.

---

### 🟢 Lote 5 — Módulo de Auditoría Formal
**Objetivo:** Digitalizar los instrumentos del diseño de auditoría (4.12.1 y 4.12.2).
1. `Auditoría Module` — cuestionarios de cumplimiento
2. Pruebas sustantivas con vinculación a reportes del agente
3. Endpoint de informe consolidado por período

**Resultado:** El auditor puede registrar y gestionar todo el proceso formal de auditoría.

---

### 🟢 Lote 6 — Mejoras y Exportación
**Objetivo:** Funcionalidades de soporte al informe final.
1. Exportación de reportes en CSV/Excel
2. Endpoint de histórico de métricas con rangos de fecha (para gráficas)
3. Gestión de múltiples laboratorios y períodos de auditoría
4. Logs de actividad del sistema

---

> **Cómo usar esta documentación con IA:**  
> Para cada lote, comparte esta documentación completa + indica el número de lote. Por ejemplo: _"Basándote en la documentación, desarrolla el Lote 1. Usa NestJS con TypeORM y PostgreSQL."_  
> La IA tendrá todo el contexto necesario (entidades, DTOs, relaciones, reglas de negocio) para generar código consistente entre lotes.

---

*Documento generado para el proyecto de Auditoría UNT — v1.0 — Febrero 2026*