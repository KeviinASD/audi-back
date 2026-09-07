# Manual de Código: Sistema de Auditoría de Laboratorios (Lógica de Negocio, Entidades y Procesamiento)

Este documento expone directamente los bloques de código fuente más importantes del backend (específicamente la capa de Servicios, recepción de sincronizaciones del agente y uso de Inteligencia Artificial) que resuelven las reglas de negocio descritas en el Manual de Usuario original. 

---

## ÍNDICE

1. Objetivos de la Aplicación
   - Módulo de Autenticación
   - Módulo de Gestión de Equipos
   - Módulo de Gestión de Laboratorios
   - Módulo de Software Autorizado
   - Módulo de Hardware
   - Módulo de Seguridad
   - Módulo de Rendimiento
   - Módulo de Análisis con IA
2. Ingreso a la Aplicación
   - Iniciar sesión
   - Cerrar sesión
3. Navegación Principal
   - Panel lateral (Sidebar)
   - Menú de usuario
   - Estados de los equipos
4. Gestión de Equipos
   - Catálogo de equipos
   - Registrar nuevo equipo
   - Buscar y filtrar
   - Acciones por equipo
5. Gestión de Laboratorios
   - Lista de laboratorios
   - Registrar nuevo laboratorio
6. Software Autorizado
   - Lista blanca de software
   - Autorizar software
   - Revocar acceso
   - Historial de software por equipo
7. Monitoreo de Hardware
   - Último snapshot de hardware
   - Historial de hardware
   - Indicadores de obsolescencia
8. Seguridad
   - Panel de riesgos
   - Categorías de riesgo
   - Historial de seguridad
9. Rendimiento
   - Panel de alertas
   - Historial de rendimiento
   - Promedios del período
10. Análisis Diario con Inteligencia Artificial
    - Mapa de calor del laboratorio
    - Análisis IA por laboratorio
    - Detalle de equipo individual
    - Análisis IA por equipo
11. Finalización y Conclusión

---

## 1. Objetivos de la Aplicación
El objetivo central del backend es brindar una API estable y persistir correctamente los `Snapshots` (Hardware, Software, Rendimiento, Seguridad) enviados por cada Agente instalado en los laboratorios.

Las inserciones masivas que el Agente manda (Sincronizaciones) se consolidan mediante un solo proceso (`processSync`) que guarda cada bloque en su respectivo repositorio paralelamente:

**Fuente:** `src/modules/agent/agent.service.ts`
```typescript
async processSync(dto: SyncAgentDto): Promise<{ ok: boolean; message: string }> {
  // 1. Buscar equipo por código
  const equipment = await this.equipmentRepo.findOne({
    where: { code: dto.equipmentCode, isActive: true },
  });

  if (!equipment) {
    throw new NotFoundException(`Equipment with code "${dto.equipmentCode}" not found or inactive`);
  }

  const capturedAt = new Date(dto.timestamp);

  // 2. Modo full: guarda los 4 snapshots en paralelo
  if (dto.mode === 'full') {
    if (!dto.hardware || !dto.software || !dto.security || !dto.performance) {
      throw new BadRequestException('Fields "hardware", "software", "security" and "performance" are required in full mode');
    }

    const [hardwareSnapshot, , securitySnapshot] = await Promise.all([
      this.hardwareService.saveSnapshot(equipment, dto.hardware, capturedAt),
      this.softwareService.saveSnapshot(equipment, dto.software, capturedAt),
      this.securityService.saveSnapshot(equipment, dto.security, capturedAt),
      this.performanceService.saveSnapshot(equipment, dto.performance, capturedAt, 'full'),
    ]);

    // 3. Recalcular estado del equipo con hardware + seguridad
    const newStatus = calculateEquipmentStatus(hardwareSnapshot, securitySnapshot);

    await this.equipmentRepo.update(equipment.id, {
      lastConnection: capturedAt,
      status: newStatus,
    });

  } else {
    // Modo quick: solo guarda performance y actualiza lastConnection
    if (dto.performance) {
      await this.performanceService.saveSnapshot(equipment, dto.performance, capturedAt, 'quick');
    }
    await this.equipmentRepo.update(equipment.id, { lastConnection: capturedAt });
  }

  return { ok: true, message: `Sync processed successfully for ${dto.equipmentCode}` };
}
```

## 2. Ingreso a la Aplicación

### Iniciar sesión
El sistema valida al usuario, comprueba que la contraseña cifrada (hash bcrypt) coincida y retorna el token JWT junto con sus datos.
**Fuente:** `src/auth/auth.service.ts`
```typescript
async login(signInDto: SignInDto): Promise<resultAndTokenParams> {
  const user = await this.userService.findOne(signInDto.email);
  if (!user) throw new UnauthorizedException('Email not found');

  const isPasswordValid = await bcrypt.compare(signInDto.password, user.password);
  if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

  this.logger.log(`User logged in successfully: ${user.email}`);
  return await this.resultAndToken(user);
}
```

### Cerrar sesión
El cierre de sesión es *stateless* (gestionado en el frontend eliminando el JWT).

## 3. Navegación Principal

### Panel lateral (Sidebar) & Menú de usuario
**Fuente:** `src/auth/auth.service.ts`
```typescript
async resultAndToken(user: User): Promise<resultAndTokenParams> {
  const { password, ...result } = user;
  const payload: JwtPayloadParams = { sub: user.id };
  return { user: { ...result }, access_token: this.jwtService.sign(payload) }
}
```

### Estados de los equipos
El proceso `calculateEquipmentStatus` se manda a llamar tras recibir un `processSync` de un Agent para establecer de qué color se pinta la PC en el frontend:
**Fuente:** `src/common/utils/equipment-status.util.ts`
```typescript
export function calculateEquipmentStatus(hw: HardwareSnapshot | null, sec: SecuritySnapshot | null): EquipmentStatus {
  if (!hw && !sec) return 'no-data';

  // Crítico
  const criticalTemp = (hw?.cpuTemperatureC ?? 0) > 85;
  const diskFailed   = hw?.diskSmartStatus === 'failed';
  const noAntivirus  = sec ? !sec.antivirusEnabled : false;
  const firewallOff  = sec ? !sec.firewallEnabled  : false;
  if (criticalTemp || diskFailed || noAntivirus || firewallOff) return 'critical';

  // Degradado
  const highTemp       = (hw?.cpuTemperatureC ?? 0) > 70;
  const highRamUsage   = hw && hw.ramTotalGB > 0 ? (hw.ramUsedGB / hw.ramTotalGB) > 0.90 : false;
  const criticalUpdate = sec?.isCriticalUpdatePending ?? false;
  const longNoUpdate   = (sec?.daysSinceLastUpdate ?? 0) > 90;
  if (highTemp || highRamUsage || criticalUpdate || longNoUpdate) return 'degraded';

  return 'operative';
}
```

## 4. Gestión de Equipos

### Catálogo de equipos y Entidad (Table Base)
**Fuente:** `src/modules/equipos/entities/equipment.entity.ts`
```typescript
@Entity()
export class Equipment {
    @PrimaryGeneratedColumn() id: number;
    @Column({ unique: true }) code: string;       // "LAB01-PC05" (clave para el Agente)
    @Column() name: string;
    @Column() ubication: string;
    
    @ManyToOne(() => Laboratory, lab => lab.equipos)
    laboratory: Laboratory;
    
    @Column({ default: true }) isActive: boolean;
    @Column({ nullable: true }) lastConnection: Date;
    @Column({ default: 'sin-datos' }) status: string;
}
```

### Buscar y filtrar
**Fuente:** `src/modules/equipos/services/equipment.service.ts`
```typescript
async findAll(search?: string, labId?: number) {
    const labCondition = labId ? { laboratory: { id: labId } } : {};
    const where = search ? [
        { ...labCondition, name: ILike(`%${search}%`) },
        { ...labCondition, code: ILike(`%${search}%`) },
        { ...labCondition, ubication: ILike(`%${search}%`) },
    ] : labId ? labCondition : undefined;

    return await this.equipmentRepo.find({
        where, relations: ['laboratory'], order: { createdAt: 'DESC' },
    });
}
```

### Registrar nuevo equipo y Acciones por equipo
```typescript
async createEquipment(dto: CreateEquipmentDto) {
    const existing = await this.equipmentRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Equipment already exists`);
    
    const equipment = this.equipmentRepo.create({ ...dto, isActive: dto.isActive ?? true });
    if (dto.laboratoryId) {
        equipment.laboratory = await this.laboratoriesService.findLaboratoryById(dto.laboratoryId);
    }
    return await this.equipmentRepo.save(equipment);
}
```

## 5. Gestión de Laboratorios

### Lista de laboratorios y Registro
**Fuente:** `src/modules/equipos/services/laboratories.service.ts`
```typescript
async findAllLaboratories() {
    return await this.laboratoryRepo.find({ relations: ['equipos'], order: { createdAt: 'DESC' } });
}
async createLaboratory(createLaboratoryDto: CreateLaboratoryDto) {
    const lab = this.laboratoryRepo.create(createLaboratoryDto);
    return await this.laboratoryRepo.save(lab);
}
```

## 6. Software Autorizado

### Lista blanca de software y Autorizar
```typescript
// software.service.ts
async addToWhitelist(dto: CreateAuthorizedSoftwareDto): Promise<AuthorizedSoftware> {
  const entry = this.authorizedRepo.create({
    name: dto.name,
    publisher: dto.publisher ?? null,
    laboratory: dto.laboratoryId ? { id: dto.laboratoryId } as any : null,
  });
  return this.authorizedRepo.save(entry);
}
```

### Historial de software por equipo (Guardado de Snapshots)
Al recibir `saveSnapshot`, se revisa dinámicamente si el programa está en Whitelist, validando las licencias y calculando el riesgo por sus fechas.
**Fuente:** `src/modules/software/software.service.ts`
```typescript
async saveSnapshot(equipment: Equipment, dto: SoftwareSnapshotDto, capturedAt: Date): Promise<SoftwareInstalled[]> {
  const whitelist = await this.authorizedRepo.find({ where: { isActive: true } });

  const records = dto.items.map(item => {
    // ¿Está en la lista blanca de mi universidad?
    const isWhitelisted = this.checkWhitelist(item.name, whitelist);
    const licenseStatus = checkLicenseStatus(item.name, item.publisher);
    const isRisk = this.calculateRisk(item, isWhitelisted);

    return this.installedRepo.create({
      equipment,
      capturedAt,
      name: item.name,
      version: item.version ?? null,
      publisher: item.publisher ?? null,
      installedAt: item.installedAt ? new Date(item.installedAt) : null,
      licenseStatus,
      isWhitelisted,
      isRisk,
    });
  });

  return this.installedRepo.save(records);
}

private calculateRisk(item: SoftwareItemDto, isWhitelisted: boolean): boolean {
    if (isWhitelisted) return false;
    if (!item.installedAt) return true;
    const daysInstalled = differenceInDays(new Date(), new Date(item.installedAt));
    return daysInstalled > 240; 
}
```

### Revocar acceso
```typescript
async removeFromWhitelist(id: string): Promise<void> {
    await this.authorizedRepo.update(id, { isActive: false });
}
```

## 7. Monitoreo de Hardware

### Último snapshot de hardware
Este módulo guarda los recuentos explícitamente y calcula si las condiciones en su totalidad se consideran material "Obsoleto".
**Fuente:** `src/modules/hardware/hardware.service.ts`
```typescript
async saveSnapshot(equipment: Equipment, dto: HardwareSnapshotDto, capturedAt: Date): Promise<HardwareSnapshot> {
  const snapshot = this.repo.create({
    equipment,
    capturedAt,
    cpuModel:          dto.cpu.model,
    cpuCores:          dto.cpu.cores,
    cpuUsagePercent:   dto.cpu.usagePercent,
    ramTotalGB:        dto.ram.totalGB,
    ramUsedGB:         dto.ram.usedGB,
    diskCapacityGB:    dto.disk.capacityGB,
    diskUsedGB:        dto.disk.usedGB,
    diskSmartStatus:   dto.disk.smartStatus ?? 'unknown',
    manufactureYear:   dto.physicalEquipment.manufactureYear ?? null,
    isObsolete:        this.calculateObsolescence(dto),
  });

  return this.repo.save(snapshot);
}
```

### Historial de hardware
```typescript
async getHistory(equipmentId: number, from: Date, to: Date): Promise<HardwareSnapshot[]> {
    return this.repo.find({
      where: { equipment: { id: equipmentId }, capturedAt: Between(from, to) },
      order: { capturedAt: 'DESC' },
    });
}
```

### Indicadores de obsolescencia
```typescript
private calculateObsolescence(dto: HardwareSnapshotDto): boolean {
    const currentYear = new Date().getFullYear();
    const manufactureYear = dto.physicalEquipment.manufactureYear
      ? parseInt(dto.physicalEquipment.manufactureYear.substring(0, 4)) : null;

    const tooOld = manufactureYear ? (currentYear - manufactureYear) > 7 : false;
    const insufficientRam = dto.ram.totalGB < 4;

    return tooOld || insufficientRam;
}
```

## 8. Seguridad

### Panel de riesgos y Historial de seguridad (Guardado de Snapshot)
La lógica mapea cada control normativo para establecer si `hasSecurityRisk` debe o no levantarse en el escudo de seguridad.
**Fuente:** `src/modules/security/security.service.ts`
```typescript
async saveSnapshot(equipment: Equipment, dto: SecuritySnapshotDto, capturedAt: Date): Promise<SecuritySnapshot> {
  const snapshot = this.repo.create({
    equipment, capturedAt,
    osName:                      dto.os.name,
    lastUpdateDate:              dto.windowsUpdate.lastUpdateDate ? new Date(dto.windowsUpdate.lastUpdateDate) : null,
    daysSinceLastUpdate:         dto.windowsUpdate.daysSinceLastUpdate,
    isCriticalUpdatePending:     dto.windowsUpdate.isCriticalUpdatePending,
    antivirusInstalled:          dto.antivirus.installed,
    antivirusEnabled:            dto.antivirus.enabled,
    firewallEnabled:             dto.firewall.enabled,
    passwordMinLength:           dto.passwordPolicy.minLength,
    accountLockoutThreshold:     dto.passwordPolicy.lockoutThreshold,
    hasSecurityRisk:             this.calculateSecurityRisk(dto),
  });
  return this.repo.save(snapshot);
}
```

### Categorías de riesgo
```typescript
calculateSecurityRisk(dto: SecuritySnapshotDto): boolean {
    const noAntivirus    = !dto.antivirus.enabled;
    const firewallOff    = !dto.firewall.enabled;
    const criticalUpdate = dto.windowsUpdate.isCriticalUpdatePending;
    const longNoUpdate   = dto.windowsUpdate.daysSinceLastUpdate > 90;
    const weakPassword   = dto.passwordPolicy.minLength < 8 || !dto.passwordPolicy.complexityEnabled;
    const noLockout      = dto.passwordPolicy.lockoutThreshold === 0;
    const rdpExposed     = dto.rdpEnabled;

    return noAntivirus || firewallOff || criticalUpdate || longNoUpdate || weakPassword || noLockout || rdpExposed;
}
```

## 9. Rendimiento

### Panel de alertas (Guardado de Performance Snapshot)
Saca porcentajes y genera banderas de alerta sobre temperatura y saturación.
**Fuente:** `src/modules/performance/performance.service.ts`
```typescript
async saveSnapshot(equipment: Equipment, dto: PerformanceSnapshotDto, capturedAt: Date, mode: string): Promise<PerformanceSnapshot> {
  const ramUsagePercent = dto.ram.totalGB > 0 ? (dto.ram.usedGB / dto.ram.totalGB) * 100 : 0;
  const diskUsagePercent = dto.disk.totalGB > 0 ? (dto.disk.usedGB / dto.disk.totalGB) * 100 : 0;

  const snapshot = this.repo.create({
    equipment, capturedAt, mode,
    cpuUsagePercent:    dto.cpu.usagePercent,
    cpuTemperatureC:    dto.cpu.temperatureC ?? null,
    ramUsagePercent,
    diskUsagePercent,
    hasCpuAlert:        dto.cpu.usagePercent > 85,
    hasRamAlert:        ramUsagePercent > 90,
    hasDiskAlert:       diskUsagePercent > 90,
    hasThermalAlert:    (dto.cpu.temperatureC ?? 0) > 70 || (dto.disk.temperatureC ?? 0) > 55,
  });

  return this.repo.save(snapshot);
}
```

### Historial de rendimiento y Promedios del período
```typescript
async getAverageMetrics(equipmentId: number, from: Date, to: Date) {
    const snapshots = await this.repo.find({
      where: { equipment: { id: equipmentId }, capturedAt: Between(from, to) },
    });
    const avg = (vals: number[]) => vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return {
      avgCpu:  avg(snapshots.map(s => Number(s.cpuUsagePercent)  || 0)),
      avgRam:  avg(snapshots.map(s => Number(s.ramUsagePercent)  || 0)),
      avgDisk: avg(snapshots.map(s => Number(s.diskUsagePercent) || 0)),
    };
}
```

## 10. Análisis Diario con Inteligencia Artificial

### Análisis IA por laboratorio y Análisis IA por equipo
Todo el ecosistema de IA empieza en `analyzeEquipment`. Se verifica si la llamada fue de un Equipo a la vez o el Laboratorio Completo, y de allí desencadena los contextos enviados para el proveedor Claude.
**Fuente:** `src/modules/audit-analysis/services/ai-analysis.service.ts`
```typescript
// --- 1. Entrada Principal de Análisis ---
async analyzeEquipment(dto: AiAnalysisRequestDto): Promise<AiAuditReport> {
  if (!dto.equipmentId && !dto.laboratoryId) {
    throw new BadRequestException('equipmentId or laboratoryId is required');
  }

  const date = new Date(dto.date);

  // Recaba los Contextos necesarios a inyectar como JSON en el prompt
  const { context, equipment, laboratory } = dto.equipmentId
    ? await this.buildEquipmentContext(dto.equipmentId, date)
    : await this.buildLaboratoryContext(dto.laboratoryId!, date);

  // Llama el modelo IA
  const { analysis, tokensUsed } = await this.callAi(
    context, dto.equipmentId ? 'equipment' : 'laboratory',
  );

  // Almacena Reporte Global para historial
  const report = await this.reportRepo.save(this.reportRepo.create({
      scope: dto.equipmentId ? 'equipment' : 'laboratory',
      laboratory: laboratory ?? null,
      equipment: equipment ?? null,
      auditDate: date,
      sentContext: context,
      analysis,
      tokensUsed,
  }));

  // Genera "Hallazgos" desglosables de forma automática basado en severidad
  if (dto.autoCreateFindings && analysis.criticalFindings?.length) {
    await this.autoCreateFindings(analysis.criticalFindings, report, date);
  }

  return report;
}
```

### Construcción del Contexto y Detalle de equipo individual (Mapas de datos)
El siguiente código forma la data para el LLM:
```typescript
private async buildEquipmentContext(equipmentId: number, date: Date) {
  const equipment = await this.equipmentRepo.findOne({
    where: { id: equipmentId }, relations: ['laboratory'],
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
      snapshot: detail.software.data,
    },
    security: detail.security.data,
    performance: detail.performance.data,
  };
  return { context, equipment, laboratory: equipment!.laboratory };
}
```

### Configuración del Prompt Normativo (Claude)
El prompt que estandariza las peticiones bajo la norma COBIT 2019 e ISO 27001 para generar el array analítico sin formato extraño.
```typescript
private async callAi(context: object, scope: 'equipment' | 'laboratory') {
  const scopeLabel = scope === 'equipment'
    ? 'una computadora específica de laboratorio universitario'
    : 'un laboratorio de cómputo universitario completo';

  const systemPrompt = `
Eres un auditor informático experto especializado en auditorías de infraestructura tecnológica [...].
Tu análisis debe basarse ÚNICAMENTE en los datos proporcionados. No inventes información.
El marco normativo aplicable es: COBIT 2019, ISO/IEC 27001:2022 y normativa peruana.

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido usando esta estructura:
{
  "executiveSummary": "string",
  "criticalFindings": [
    {
      "equipmentCode": "string", "finding": "string", "auditTest": "string",
      "severity": "low | medium | high | critical", "recommendation": "string"
    }
  ],
  "generalObservations": ["string"],
  "positiveAspects": ["string"],
  "prioritizedRecommendations": ["string"]
}`.trim();

  const userMessage = `Analiza los siguientes datos correspondientes a ${scopeLabel}:\n${JSON.stringify(context, null, 2)}`;
  const { text, tokensUsed } = await this.aiProvider.call(systemPrompt, userMessage);
  
  return { analysis: JSON.parse(this.stripMarkdown(text)), tokensUsed };
}
```

### Auto Creador de Hallazgos
Para que el usuario pueda tener una mesa de trabajo (tickets a solucionar):
```typescript
private async autoCreateFindings(aiFindings: AiAnalysisResult['criticalFindings'], report: AiAuditReport, date: Date) {
  const findings = await Promise.all(
    aiFindings.map(async (f) => {
      const equipment = await this.equipmentRepo.findOne({
        where: { code: f.equipmentCode }, relations: ['laboratory'],
      });
      if (!equipment) return null;

      return this.findingRepo.create({
        equipment, laboratory: equipment.laboratory, aiReport: report,
        findingDate: date, auditTest: f.auditTest,
        title: f.finding.substring(0, 100),
        description: f.finding, severity: f.severity, recommendation: f.recommendation,
        status: 'open', source: 'ai-generated',
      });
    }),
  );

  const validFindings = findings.filter(Boolean) as any[];
  if (validFindings.length) await this.findingRepo.save(validFindings);
}
```

## 11. Finalización y Conclusión
La arquitectura del backend detalla una gestión centralizada del `processSync` que orquesta de forma asíncrona la recepción transaccional a múltiples módulos a la vez de las capturas del Agente. El acople del Contexto de Máquinas nutre con gran eficiencia a nuestro Agente Inteligente, haciendo posible una auditoría a nivel marco normativo internacional validando los registros diarios por equipo recabados en la base de datos PostgreSQL.
