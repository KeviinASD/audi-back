# Estado del Proyecto — Sistema de Auditoría Informática UNT

> **Para el equipo.** Este documento describe qué está construido, qué falta y qué hay que
> arreglar. Todo lo que está acá fue verificado leyendo el código, no copiado de documentación
> previa. Última revisión: **31/08/2026**.

---

## 1. Qué es el sistema

Plataforma de auditoría informática para los laboratorios de la Escuela Profesional de
Ingeniería de Sistemas (UNT). Recolecta automáticamente el estado de hardware, software,
seguridad y rendimiento de cada PC del laboratorio, y genera hallazgos de auditoría asistidos
por IA sobre esos datos.

Marco normativo declarado en el prompt de análisis: **COBIT 2019, ISO/IEC 27001:2022,
ISO/IEC 27002, Ley N° 30096 (Perú), NTP-ISO/IEC 17799**.

---

## 2. Arquitectura — tres piezas

```
┌──────────────────────┐
│  ejecutar-pcs/       │   PowerShell 5.1 · 512 líneas
│  sync_agent.ps1      │   Corre en cada PC del laboratorio.
│  sync_agent.bat      │   Lee WMI/CIM: CPU, RAM, disco, SO, antivirus,
└──────────┬───────────┘   firewall, usuarios locales, software instalado.
           │
           │  HTTP POST  ·  header de API key
           │  { equipmentCode, mode, timestamp, hardware, software, security, performance }
           ▼
┌──────────────────────┐
│  audi-back/          │   NestJS 11 · TypeORM 0.3 · PostgreSQL
│  POST /agent/sync    │   Único endpoint público de ingesta.
└──────────┬───────────┘   Persiste snapshots con timestamp.
           │
           │  REST + JWT
           ▼
┌──────────────────────┐
│  audi-front/         │   React 19 · Vite 7 · TanStack Query · Tailwind 4
│  Dashboard auditor   │   Heat map diario, historiales, hallazgos.
└──────────────────────┘
```

**Modelo de datos clave:** todo es *snapshot con `capturedAt`*. No se sobrescribe estado —
cada sync agrega una fila nueva. Eso permite historial y comparación temporal, que es lo que
hace posible la auditoría.

---

## 3. Stack real

### Backend (`audi-back/`)

| Área | Tecnología |
|---|---|
| Framework | NestJS 11.1 |
| ORM / BD | TypeORM 0.3.28 → **PostgreSQL** (`pg`) |
| Auth | Passport: `local`, `jwt`, `google-oauth20` + bcrypt |
| Validación | `class-validator` + `class-transformer` |
| Docs API | `@nestjs/swagger` |
| IA | `@anthropic-ai/sdk` 0.78 + OpenAI vía HTTP |

**Modelos IA configurados:**
- `providers/claude.provider.ts` → `claude-opus-4-5`
- `providers/openai.provider.ts` → `gpt-4o`
- Selección por variable de entorno `AI_PROVIDER`

### Frontend (`audi-front/`)

React 19 · Vite 7 · TypeScript 5.8 (`erasableSyntaxOnly: true` → **`enum` prohibido**,
usar `const` + tipo derivado) · TanStack Query 5 · React Router 7 · Tailwind 4 ·
Radix UI (shadcn) · Zustand · Zod 4 · react-hook-form · framer-motion · sonner

### Agente (`ejecutar-pcs/`)

PowerShell 5.1. Modo `full` (todo) o `quick` (solo actualiza `lastConnection`).
Lanzado por `sync_agent.bat` con `-ExecutionPolicy Bypass`.

---

## 4. Módulos del backend

Ubicación: `audi-back/src/modules/`

| Módulo | Entidades | Responsabilidad |
|---|---|---|
| `equipos/` | `Laboratory`, `Equipment` | Registro de laboratorios y PCs. `Equipment.code` (ej. `LAB01-PC05`) es la llave que usa el agente. |
| `agent/` | — | Ingesta. Protegido por `ApiKeyGuard`. |
| `hardware/` | `HardwareSnapshot` | CPU, RAM, disco, equipo físico, obsolescencia. |
| `software/` | `SoftwareInstalled`, `AuthorizedSoftware` | Inventario instalado + lista blanca + licencias. |
| `security/` | `SecuritySnapshot` | SO, Windows Update, antivirus, firewall, políticas de password, usuarios locales. |
| `performance/` | `PerformanceSnapshot` | Métricas de uso y alertas. |
| `audit-analysis/` | `AiAuditReport`, `AuditFinding` | Consolidación diaria, llamada a IA, hallazgos. |
| `auth/` + `users/` | `User` | Login local, Google OAuth, JWT. |
| `seguridad/` | `Role` | Roles y autorización. |
| `dev/` | — | Utilidad de demo (ver §7). |

### Entidad central: `AuditFinding`

```
equipment · laboratory · aiReport · findingDate
auditTest    → "PS-HW-01" … "PS-SW-07"  (pruebas del plan de auditoría)
severity     → low | medium | high | critical
status       → open | in-progress | resolved | accepted-risk
source       → ai-generated | manual
recommendation · auditorNotes
```

### Pruebas del plan de auditoría (codificadas en el prompt de IA)

| Código | Prueba | | Código | Prueba |
|---|---|---|---|---|
| PS-HW-01 | Estado físico | | PS-SW-01 | Actualizaciones SO |
| PS-HW-02 | Inventario | | PS-SW-02 | Antimalware |
| PS-HW-03 | Rendimiento / temperatura | | PS-SW-03 | Licencias |
| PS-HW-04 | Mantenimiento | | PS-SW-04 | Control de acceso |
| PS-HW-05 | Obsolescencia | | PS-SW-05 | Rendimiento |
| PS-HW-06 | Protección eléctrica | | PS-SW-06 | Software no autorizado |
| PS-HW-07 | Disposición de equipos | | PS-SW-07 | Gestión de incidentes |

---

## 5. Endpoints implementados

| Recurso | Endpoints |
|---|---|
| `auth` | `POST /login` · `POST /register` · `GET /me` · `GET /google/login` · `GET /google/callback` |
| `agent` | `POST /agent/sync` *(público + API key)* |
| `equipment` | `POST` · `GET` · `GET /:id` · `PATCH /:id` · `DELETE /:id` · `GET /:id/history` |
| `laboratorios` | `POST` · `GET` · `GET /:id` · `PATCH /:id` |
| `hardware` | `GET /equipment/:id/latest` · `/history` · `GET /obsolete` |
| `software` | `/equipment/:id/latest` · `/history` · `/risky` · `GET /risky` · `/unlicensed` · CRUD `/whitelist` |
| `security` | `/equipment/:id/latest` · `/history` · `GET /risks` · `/no-antivirus` · `/pending-updates` |
| `performance` | `/equipment/:id/latest` · `/history` · `/averages` · `GET /alerts` |
| `audit-analysis` | `GET /daily` · `/equipment-detail` · `POST /ai` · `GET /ai/history` · `GET /findings` · `/findings/equipment/:id` · `/findings/trends` · `/findings/recurring` · `PATCH /findings/:id/status` |
| `roles` | CRUD completo *(JWT + AuthorizationGuard)* |
| `users` | `GET` · `GET /:id` · `PATCH /:id` · `DELETE /:id` |

---

## 6. Frontend — features y rutas

Convención: `src/features/<nombre>/{interfaces,services,hooks,schemas,components,pages}`
(ver `audi-front/CLAUDE.md` para las reglas de nombres completas).

| Ruta | Página | Estado |
|---|---|---|
| `/auth/login` | `Login` | ✅ |
| `/auth/register` | — | 🔴 placeholder `<h1>Register</h1>` |
| `/main/dashboard` | — | 🔴 **placeholder** `<h1>DASHBOARD HOME :3</h1>` |
| `/main/equipos` | `EquiposPage` | ✅ |
| `/main/laboratorios` | `LabsPage` | ✅ |
| `/main/software` | `AuthorizedSoftwarePage` | ✅ |
| `/main/software/historial/:id` | `SoftwareHistoryPage` | ✅ |
| `/main/hardware/historial/:id` | `HardwareHistoryPage` | ✅ |
| `/main/security` | `SecurityRisksPage` | ✅ |
| `/main/security/historial/:id` | `SecurityHistoryPage` | ✅ |
| `/main/performance` | `PerformanceAlertsPage` | ✅ |
| `/main/performance/historial/:id` | `PerformanceHistoryPage` | ✅ |
| `/main/analysis` | `AnalysisPage` (heat map) | ✅ |
| `/main/analysis/equipo/:id` | `EquipmentDetailPage` | ✅ |
| `/main/employee` | — | 🔴 placeholder |

---

## 7. Deuda técnica y riesgos — LEER ANTES DE TOCAR

Ordenado por severidad. Todo verificado en el código.

### 🔴 Crítico

**1. API key hardcodeada en el agente**
`ejecutar-pcs/sync_agent.ps1:6` contiene la API key en texto plano, junto al endpoint.
Ese archivo se copia a **cada PC del laboratorio**, donde cualquier alumno puede abrirlo con
el Bloc de notas. Con esa clave se puede inyectar datos falsos en `POST /agent/sync`.
→ Es, irónicamente, un hallazgo de auditoría dentro del sistema de auditoría.
→ Mínimo: key por equipo, rotable, y el `.ps1` distribuido sin credencial embebida.

**2. `modules/dev/` expone `POST /dev/clone-snapshots`**
Clona snapshots de un equipo/fecha a otro. La descripción dice *"Solo para uso en demo/expo"*.
Está registrado en `app.module.ts` sin condición de entorno.
→ **Verificar que no llegue a producción.** Permite fabricar evidencia de auditoría.

### 🟠 Importante

**3. `audi-back/CLAUDE.md` documenta módulos que no existen**
Lista `incidentes/`, `auditoria/` (sesiones formales de auditoría) y `reportes/`
(generación Word/PDF). **Ninguno de los tres existe en `src/modules/`.**
→ No hay generación de informes. No hay sesiones formales de auditoría.
→ O se implementan, o se corrige el documento. Hoy induce a error al equipo.

**4. Sin tests**
Un solo archivo: `audi-back/test/app.e2e-spec.ts` (scaffolding por defecto de Nest).
Cero tests en el frontend. Jest está configurado y sin usar.

**5. Sin migraciones de TypeORM**
Cero migraciones. El esquema depende de `synchronize` por variable de entorno
(`DATABASE_SYNCHRONIZE`). En producción, `synchronize: true` puede borrar columnas.

**6. Sin gobernanza sobre los hallazgos generados por IA**
`AuditFinding.source` distingue `ai-generated` de `manual`, y existe `auditorNotes` — buen
punto de partida. Pero **no hay flujo de aprobación**: un hallazgo generado por el modelo
nace con el mismo peso que uno validado por un auditor humano. Tampoco se persiste qué
modelo ni qué versión lo generó (`AiAuditReport` guarda `sentContext` y `tokensUsed`, no el
identificador del modelo).
→ Ver §8: esto es exactamente lo que el curso de Gobierno de TIC pide gobernar.

### 🟡 Menor / consistencia

**7. `modules/seguridad/` vs `modules/security/`**
Dos módulos con nombres casi idénticos y propósitos distintos: `seguridad/` son roles de la
aplicación, `security/` son snapshots de seguridad de las PCs. Confunde a cualquiera que entre
nuevo. Además `seguridad/entitys/` está mal escrito (debería ser `entities/`).

**8. Idioma mezclado en el backend**
`equipos/` y `seguridad/` en español; `hardware/`, `software/`, `security/`, `performance/`,
`audit-analysis/`, `users/` en inglés. Elegir uno.

**9. `mysql2` en `dependencies`**
La app corre PostgreSQL (`app.module.ts` → `type: 'postgres'`). Dependencia muerta.

**10. Nombre del paquete backend: `auth-crud`**
Resto del scaffolding inicial. `audi-front` es `base-front`. Renombrar.

---

## 8. Relación con el curso de Gobierno de TIC (4499)

Contexto: el sílabo 2026-II del curso exige diseñar un **sistema de gobierno** con COBIT 2019.
Vale entender dónde está parado este proyecto respecto de eso, porque **no es lo mismo**.

### Lo que el sistema cubre hoy

| Módulo | Objetivo COBIT 2019 | Dominio |
|---|---|---|
| `equipos/` + `hardware/` | **BAI09** Managed Assets | Build |
| Snapshots de configuración | **BAI10** Managed Configuration | Build |
| `security/` | **DSS05** Managed Security Services | Deliver |
| `software/` (lista blanca, licencias) | **BAI09** + **APO10** Managed Vendors | Build / Align |
| `performance/` | **BAI04** Managed Availability and Capacity | Build |
| `audit-analysis/` | **MEA01** Performance & Conformance Monitoring | Monitor |
| Hallazgos con severidad y estado | **MEA02** System of Internal Control | Monitor |
| Marco normativo declarado | **MEA03** Compliance External Requirements | Monitor |

Son ~8 de los 40 objetivos de COBIT 2019. Sólido para **auditoría informática operativa**
(que es el curso prerrequisito, 4491).

### Lo que falta para que sea gobierno

- **Dominio EDM completo (EDM01–EDM05) en cero.** Evaluate, Direct, Monitor es *el* dominio
  de gobierno, y es literalmente la capacidad terminal CT 1.4 del sílabo.
- **Los 11 Design Factors** de COBIT 2019 no están modelados.
- **Goals Cascade** (metas de la Escuela → metas de alineamiento → objetivos de gobierno): no existe.
- **Capability Levels 0–5** por objetivo. Hoy hay *severidad de hallazgo*, que **no** es lo
  mismo que madurez de proceso — confundirlos es un error clásico.
- **Decision rights / RACI**: quién decide qué sobre la TI del laboratorio.
- **Métricas de gobierno**, no técnicas. Hoy se mide "% de PCs con firewall activo"; gobierno
  mide "% de decisiones de TI con dueño formal y trazabilidad".

### Propuesta mínima para cerrar la brecha

No hay que reescribir nada. Tres entidades nuevas encima de lo existente:

1. `governance_objective` — los 40 objetivos COBIT con capability level actual y objetivo.
2. `design_factor` — los 11 factores con su scoring para el contexto del laboratorio.
3. `objective_control_mapping` — ata cada prueba (`PS-HW-01`, `PS-SW-03`…) a su objetivo COBIT.

Con eso, cada hallazgo técnico que ya se genera sube automáticamente a un indicador de gobierno.

**Ángulo adicional:** el sílabo dedica la Semana 14 a *"COBIT para un gobierno eficaz de los
sistemas de IA"*, y este sistema **usa IA para generar hallazgos de auditoría**. Gobernar esa
IA (aprobación humana, trazabilidad de modelo, costo/beneficio de tokens → **EDM02**) es
material directo para el Trabajo Aplicativo.

---

## 9. Cómo levantar el proyecto

### Backend

```bash
cd audi-back
npm install
# configurar .env (ver variables abajo)
npm run seed        # datos iniciales
npm run start:dev   # http://localhost:3030
```

Swagger disponible una vez levantado el servidor.

**Variables de entorno requeridas:**

```
# Servidor
NODE_ENV · PORT · HOST · PROTOCOL · APP_URL · FRONTEND_URL

# Base de datos (PostgreSQL)
DATABASE_HOST · DATABASE_PORT · DATABASE_USER · DATABASE_PASSWORD
DATABASE_NAME · DATABASE_SYNCHRONIZE · DATABASE_LOGGING

# Auth
JWT_SECRET · JWT_EXPIRES_IN
GOOGLE_CLIENT_ID · GOOGLE_SECRET · GOOGLE_CALLBACK_URL

# CORS
CORS_ORIGIN · CORS_METHODS · CORS_CREDENTIALS

# Agente e IA
AGENT_API_KEY
AI_PROVIDER          # "claude" | "openai"
ANTHROPIC_API_KEY
OPENAI_API_KEY
```

### Frontend

```bash
cd audi-front
npm install
npm run dev
```

### Agente (en una PC del laboratorio)

1. Editar `ejecutar-pcs/sync_agent.ps1`:
   - `$ENDPOINT` → URL del backend
   - `$API_KEY` → debe coincidir con `AGENT_API_KEY`
   - `$EQUIPMENT_CODE` → **debe existir** previamente registrado vía `POST /equipment`
   - `$MODE` → `full` o `quick`
2. Ejecutar `sync_agent.bat`.

> ⚠️ El equipo debe estar registrado antes de correr el agente, o el sync falla.

---

## 10. Próximos pasos sugeridos

| # | Tarea | Prioridad |
|---|---|---|
| 1 | Sacar la API key del `.ps1` y hacerla por equipo | 🔴 |
| 2 | Blindar o eliminar `modules/dev/` fuera de desarrollo | 🔴 |
| 3 | Implementar el dashboard home (hoy es placeholder) | 🟠 |
| 4 | Módulo `reportes/` — generación Word/PDF del informe | 🟠 |
| 5 | Flujo de aprobación humana para hallazgos `ai-generated` | 🟠 |
| 6 | Corregir `audi-back/CLAUDE.md` (documenta módulos inexistentes) | 🟠 |
| 7 | Migraciones de TypeORM + apagar `synchronize` | 🟠 |
| 8 | Capa de gobierno COBIT (§8) si aplica al Trabajo Aplicativo | 🟡 |
| 9 | Unificar `seguridad/` vs `security/` e idioma de módulos | 🟡 |
| 10 | Tests — al menos los servicios de `audit-analysis/` | 🟡 |

---

## 11. Documentos relacionados

| Archivo | Contenido |
|---|---|
| `audi-back/CLAUDE.md` | Memoria del sistema — ⚠️ desactualizado, ver §7.3 |
| `audi-back/MANUAL_DE_CODIGO.md` | Manual de código del backend |
| `audi-back/src/modules/documentation.md` | Documentación de módulos |
| `audi-back/src/modules/audi-analysis.md` | Detalle del módulo de análisis |
| `audi-front/CLAUDE.md` | **Convenciones del frontend — lectura obligatoria antes de escribir código** |
| `audi-front/src/features/analysis/analysis.md` | Detalle del feature de análisis |
