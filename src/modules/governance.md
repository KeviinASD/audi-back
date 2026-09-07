# Módulo `governance/` — Umbrales de Gobierno

> Implementa la capa que faltaba para que el sistema deje de **medir**
> y empiece a **evaluar contra política aprobada**.
>
> Contexto y justificación: `docs/ALINEACION_GOBIERNO_TI.md` y `docs/PLAN_DE_ADAPTACION.md`.

---

## 1. El problema que resuelve

El agente reporta `daysSinceLastUpdate: 104`. El dashboard lo muestra.
**Nadie había definido cuántos días son tolerables.**

Eso pasaba con los ~80 campos que recolecta el agente: precisión quirúrgica en la
medición, cero umbrales declarados. Medíamos contra una vara que no existía.

COBIT 2019, Principio 4 — *Governance Distinct From Management*:

| | Gestión | Gobierno |
|---|---|---|
| Pregunta | ¿Está funcionando bien? | ¿Quién decide qué es aceptable, y con qué autoridad? |
| Antes de este módulo | ✅ | 🔴 |
| Después | ✅ | ✅ |

Un umbral de gobierno es una **decisión documentada, justificada y aprobada**
sobre un dato que ya se recolecta.

---

## 2. Entidad `governance_thresholds`

La entidad es deliberadamente verbosa: cada registro se explica solo, porque
el frontend renderiza esos campos tal cual para que el usuario entienda
**para qué sirve cada umbral** sin leer documentación aparte.

### Identificación

| Campo | Ejemplo |
|---|---|
| `code` | `UMB-PAR-02` — código estable, único |
| `category` | `patches` · `antimalware` · `firewall` · `passwords` · `hardware` · `performance` · `software` · `operations` |
| `field` | `daysSinceLastUpdate` — el campo del snapshot que evalúa |
| `label` | «Días sin actualizar el sistema operativo» |

### Explicación para el usuario ⭐

| Campo | Qué contiene |
|---|---|
| `whatItMeasures` | Qué mide, en lenguaje llano, sin jerga |
| `whyItMatters` | El riesgo real si se incumple — el «¿y qué?» |
| `howItIsEvaluated` | Cómo se evalúa, explicado en texto |

Estos tres campos son el núcleo del pedido: **que el usuario sepa para qué sirve
cada cosa.** No son comentarios de código, son datos que se muestran en pantalla.

### El umbral

| Campo | Valores |
|---|---|
| `operator` | `lte` · `gte` · `eq` · `neq` · `is_true` · `is_false` |
| `value` | Texto — soporta números, booleanos y enumerados con una sola columna |
| `unit` | `días` · `%` · `°C` · `caracteres` · `intentos` |
| `severityOnBreach` | `low` · `medium` · `high` · `critical` |

### Trazabilidad de gobierno

| Campo | Para qué |
|---|---|
| `cobitObjective` | Objetivo COBIT 2019 al que aporta evidencia (`DSS05`, `BAI09`…) |
| `isoClause` | Cláusula del Anexo A de ISO/IEC 27001:2022 — **cierra la brecha de MEA03** |
| `legalBasis` | Norma legal aplicable (`D. Leg. 822`) |
| `sourceType` | `standard` · `regulation` · `professional_judgment` |
| `sourceReference` | «CIS Windows Benchmark», «NIST SP 800-63B» |
| `rationale` | **Por qué ESE número y no otro.** Es lo que se defiende en la auditoría |

### Aprobación — EDM01

| Campo | Para qué |
|---|---|
| `approvedBy` | Nombre y cargo de quien asumió la decisión |
| `approvedAt` | Cuándo |
| `isActive` | Un umbral inactivo se conserva como historial, no se evalúa |

> ⚠️ **Regla de negocio importante:** cambiar `value`, `operator` o `severityOnBreach`
> **revoca automáticamente la aprobación** (`governance.service.ts` → `update`).
> Lo que se aprobó ya no es lo que rige, así que debe volver a aprobarse.
> Sin esa regla, la aprobación sería un sello decorativo.

---

## 3. Catálogo base — `catalogs/threshold-catalog.ts`

24 umbrales sembrados automáticamente en `onModuleInit`, distribuidos así:

| Categoría | Umbrales | Objetivos COBIT |
|---|:---:|---|
| Actualizaciones del sistema | 3 | DSS05 |
| Protección antimalware | 3 | DSS05 |
| Firewall y superficie de ataque | 4 | DSS05 |
| Contraseñas y cuentas | 5 | DSS05 |
| Activos y hardware | 2 | BAI09 |
| Rendimiento y capacidad | 4 | BAI04 · BAI09 · DSS01 |
| Software y licenciamiento | 2 | APO10 · BAI10 |
| Operación y trazabilidad | 1 | BAI09 |

**El seeding es incremental y no destructivo:** sólo inserta los `code` que faltan.
Nunca pisa un umbral que el auditor ya editó o aprobó.

### Sobre los valores

Son **propuestas defendibles, no verdades absolutas**. El valor del catálogo no
está en el número: está en que cada número tiene una justificación trazable a un
estándar, una norma o un criterio profesional declarado.

Distribución de las fuentes:

- **Estándar técnico** — CIS Microsoft Windows Benchmark, Microsoft Security Baseline, ISO/IEC 27001:2022, S.M.A.R.T.
- **Norma legal** — D. Leg. 822 (Derecho de Autor, Perú)
- **Criterio profesional** — declarado como tal, con su fundamento escrito

> 💡 **`UMB-PWD-04` (vigencia de contraseña) merece atención especial.**
> Va contra la intuición: propone **365 días o sin expiración**, no los clásicos 90.
> NIST SP 800-63B desaconseja la expiración periódica obligatoria porque induce
> contraseñas predecibles (`Verano2026` → `Otono2026`), y CIS acompañó ese cambio.
> Mantener la regla de 90 días sería aplicar una recomendación que el propio
> organismo que la popularizó ya revirtió.

### Matriz de severidad

`SEVERITY_MATRIX` define qué hace que un hallazgo sea crítico, alto, medio o bajo.

**Antes, ese criterio lo aplicaba el modelo de IA por su cuenta** — asignaba
`critical` según su propio juicio, sin criterio humano aprobado. Ahora es una
decisión declarada.

---

## 4. Endpoints

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/governance/thresholds` | Listado plano |
| `GET` | `/governance/thresholds/grouped` | **Vista principal** — agrupado por categoría + resumen + metadatos de presentación |
| `GET` | `/governance/thresholds/:id` | Detalle |
| `GET` | `/governance/severity-matrix` | Criterio de severidad aprobado |
| `PATCH` | `/governance/thresholds/:id` | Ajustar valor, operador, severidad o justificación |
| `POST` | `/governance/thresholds/:id/approve` | Aprobar formalmente (EDM01) |

`/grouped` devuelve además un `summary`:

```jsonc
{
  "total": 24,
  "active": 24,
  "approved": 0,
  "pendingApproval": 24,
  "approvalRate": 0,              // % de política formalizada
  "bySeverity": { "critical": 4, "high": 6, "medium": 10, "low": 4 },
  "cobitObjectives": ["APO10", "BAI04", "BAI09", "BAI10", "DSS01", "DSS05"]
}
```

Los metadatos de presentación de cada categoría (`label`, `description`, `order`)
viven en `CATEGORY_META` dentro del servicio: **el frontend no traduce ni inventa nada.**

---

## 5. Frontend — `features/governance/`

```
src/features/governance/
├── interfaces/
│   ├── governance-threshold.interface.ts
│   └── index.ts
├── services/
│   └── governance-threshold.service.ts
├── hooks/
│   └── useGovernanceThresholds.ts        ← 3 hooks: listado, matriz, acciones
├── lib/
│   └── threshold-display.ts              ← formateo y estilos por severidad
├── components/thresholds/
│   ├── ThresholdCard.tsx                 ← ⭐ la tarjeta explicativa
│   ├── SeverityMatrixPanel.tsx
│   ├── ThresholdEditDialog.tsx
│   └── ThresholdApproveDialog.tsx
└── pages/
    └── ThresholdsPage.tsx
```

Ruta: **`/main/gobierno/umbrales`** — en el sidebar bajo «Gobierno de TI».

### `ThresholdCard` — el componente que resuelve el pedido

Cada tarjeta muestra, sin que el usuario tenga que buscar en ningún lado:

```
┌──────────────────────────────────────────────────────────────┐
│ UMB-PAR-02                          [Alta]  [Sin aprobar]    │
│ Días sin actualizar el sistema operativo                     │
│                                                              │
│ ┌───────────────┐   ¿QUÉ MIDE?                              │
│ │ VALOR ACEPTADO│   Cuántos días pasaron desde la última…   │
│ │   ≤ 30 días   │                                            │
│ │               │   ¿POR QUÉ IMPORTA?                        │
│ │daysSinceLast… │   Un equipo que no se actualiza acumula…  │
│ └───────────────┘                                            │
│                     ¿CÓMO SE EVALÚA?                        │
│                     Se incumple si superó los 30 días.      │
│                     Se incumple si supera 30 días           │
│ ──────────────────────────────────────────────────────────  │
│ [COBIT DSS05] [ISO A.8.8] [Estándar técnico]  ▾ Ver fundamento│
└──────────────────────────────────────────────────────────────┘
```

Al desplegar «Ver fundamento» aparece el `rationale` (por qué ese número),
la referencia del estándar, la base legal, el estado de aprobación y las
acciones de ajustar/aprobar.

### `threshold-display.ts`

Traduce el par `operator` + `value` a lenguaje humano en dos niveles:

- `formatThresholdValue()` → `"≤ 30 días"`, `"Debe estar activo"`
- `describeOperator()` → `"Se incumple si supera 30 días"`

Porque no todo el mundo lee símbolos matemáticos de un vistazo.

---

## 6. Qué falta (siguiente iteración)

- [ ] **Motor de evaluación** — cruzar cada snapshot contra los umbrales activos
      y generar `AuditFinding` automáticamente. Hoy los umbrales están declarados
      pero todavía no se evalúan contra los datos.
- [ ] **Inyectar la matriz de severidad en el prompt de IA** — para que el modelo
      aplique el criterio aprobado en vez del suyo (`ai-analysis.service.ts:134`).
- [ ] **Entidades `governance_objective` y `design_factor`** — los 40 objetivos
      COBIT con capability level, y los 11 Design Factors.
- [ ] **`objective_control_mapping`** — atar las pruebas `PS-HW-01…PS-SW-07`
      a objetivos COBIT y cláusulas ISO. Cierra MEA03 del todo.
- [ ] **Dashboard de gobierno** en `/main/dashboard` (hoy es un placeholder).

---

## 7. Impacto en la alineación COBIT

| Objetivo | Antes | Ahora | Por qué |
|---|:---:|:---:|---|
| **EDM01** Governance Framework | 0 | **1** | Existe un marco de decisiones con responsable y fecha |
| **EDM03** Risk Optimization | 1 | **2** | El apetito de riesgo pasa de implícito a declarado y aprobado |
| **MEA03** Compliance | 2 | **2+** | Cada umbral trae su cláusula ISO y base legal — trazabilidad real |
| **APO01** I&T Management Framework | 0 | **1** | Primera política formal del sistema |

No es la brecha entera, pero es el primer objetivo del dominio EDM que deja de
estar en cero. Ver `docs/ALINEACION_GOBIERNO_TI.md` §2 para la evaluación completa.
