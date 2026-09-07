# Estado de Alineación con Gobierno de TI — COBIT 2019

> **Para el equipo del curso Gobierno de TIC (4499) — 2026-II.**
>
> Este documento responde una sola pregunta: **¿qué tan alineado está nuestro sistema de
> auditoría con un sistema de gobierno de TI según COBIT 2019, y qué falta para cerrarlo?**
>
> Todo el "estado actual" fue verificado contra el código fuente. Todo lo marcado como
> *propuesta* todavía no existe. Última revisión: **31/08/2026**.
>
> Para el estado técnico general del proyecto (stack, endpoints, deuda técnica),
> ver `ESTADO_DEL_PROYECTO.md`.

---

## 0. Resumen ejecutivo — leé esto si no leés nada más

| Indicador | Estado |
|---|---|
| Objetivos COBIT con evidencia (nivel ≥ 1) | **17 de 40** |
| Objetivos con proceso definido (nivel ≥ 3) | **4 de 40** |
| Dominio **MEA** (Monitor, Evaluate, Assess) | **4/4 objetivos cubiertos** ✅ |
| Dominio **EDM** (Evaluate, Direct, Monitor) — *el dominio de gobierno* | **0/5 efectivos** 🔴 |
| Componentes del sistema de gobierno construidos | **2 de 7** |
| Design Factors documentados | **0 de 11** |

**El diagnóstico en una línea:**
Construimos un **instrumento de monitoreo de clase MEA01**, no un sistema de gobierno.

Es una herramienta de **auditoría informática operativa** excelente — que es el curso
prerrequisito (4491), no éste. Para Gobierno de TIC falta la capa que *evalúa, dirige y
supervisa*, que es literalmente la capacidad terminal **CT 1.4** del sílabo.

La buena noticia: **no hay que reescribir nada.** Lo construido es la base de evidencia que
un sistema de gobierno necesita. Falta la capa de arriba.

---

## 1. El error conceptual que hay que evitar

COBIT 2019, **Principio 4 del sistema de gobierno**: *"Governance Distinct From Management"*
— el gobierno es **distinto** de la gestión.

| | Gestión (management) | Gobierno (governance) |
|---|---|---|
| Pregunta | ¿Está funcionando bien? | ¿Quién decide, con qué autoridad, alineado a qué? |
| Dominios COBIT | APO · BAI · DSS · MEA | **EDM** |
| Responsable | Dirección de TI | Junta directiva / dirección |
| Nuestro sistema | ✅ acá está | 🔴 acá no está |

Nuestro software responde *"¿esta PC tiene el antivirus actualizado?"*.
Gobierno responde *"¿quién decidió el estándar de antivirus del laboratorio, con qué
autoridad, y cómo medimos si esa decisión creó valor?"*.

Una es el **termómetro**. La otra es el **médico que decide el tratamiento y responde por él**.
Tenemos un termómetro muy bueno.

---

## 2. Autoevaluación de los 40 objetivos de COBIT 2019

**Escala de capacidad (COBIT 2019, base CMMI):**

| Nivel | Nombre | Significado |
|---|---|---|
| 0 | Incomplete | No se ejecuta o no logra su propósito |
| 1 | Initial / Performed | Se ejecuta, logra el propósito, sin formalizar |
| 2 | Managed | Planificado y con seguimiento |
| 3 | Defined | Proceso definido, estandarizado, documentado |
| 4 | Quantitative | Medido cuantitativamente |
| 5 | Optimizing | Mejora continua |

> ⚠️ **Limitación metodológica:** esto es una **autoevaluación basada en evidencia de código**,
> no una evaluación formal COBIT (que requiere el *Capability Assessment Method* de ISACA con
> evaluador independiente). Sirve como línea base, no como certificación.

---

### 🔴 Dominio EDM — Evaluate, Direct and Monitor *(el dominio de gobierno)*

| Obj. | Nombre | Nivel | Evidencia en el sistema |
|---|---|:---:|---|
| EDM01 | Ensured Governance Framework Setting and Maintenance | **0** | Ninguna. No existe artefacto que defina el marco de gobierno del laboratorio. |
| EDM02 | Ensured Benefits Delivery | **0** | `AiAuditReport.tokensUsed` registra costo de IA, pero nadie lo analiza contra beneficio. Dato crudo sin proceso. |
| EDM03 | Ensured Risk Optimization | **1** | `AuditFinding.severity` (low/medium/high/critical) es dato de riesgo. **No hay** apetito de riesgo, tolerancia, ni registro de riesgos. |
| EDM04 | Ensured Resource Optimization | **1** | `GET /hardware/obsolete` + `manufactureYear` informan decisiones de recursos. No hay proceso de optimización. |
| EDM05 | Ensured Stakeholder Engagement | **0** | `Laboratory.responsible` y `responsibleEmail` identifican un responsable. No hay flujo de reporte ni engagement. |

**Promedio EDM: 0.4 / 5.** Este es el hallazgo central del documento.

---

### 🟠 Dominio APO — Align, Plan and Organize

| Obj. | Nombre | Nivel | Evidencia |
|---|---|:---:|---|
| APO01 | Managed I&T Management Framework | 0 | — |
| APO02 | Managed Strategy | 0 | — |
| APO03 | Managed Enterprise Architecture | 0 | — |
| APO04 | Managed Innovation | 0 | — |
| APO05 | Managed Portfolio | 0 | — |
| APO06 | Managed Budget and Costs | 0 | `tokensUsed` sin proceso presupuestario. |
| APO07 | Managed Human Resources | 0 | `Role` es RBAC de la app, no competencias de personal de TI. |
| APO08 | Managed Relationships | 0 | — |
| APO09 | Managed Service Agreements | 0 | Sin SLA definido para el laboratorio. |
| APO10 | Managed Vendors | **1** | `SoftwareInstalled.publisher` + licencias. Datos de proveedor sin proceso de gestión. |
| APO11 | Managed Quality | 0 | — |
| APO12 | Managed Risk | **1** | Hallazgos con severidad = riesgo crudo. Sin escenarios de riesgo ni registro formal. |
| APO13 | Managed Security | **1** | Se recolecta evidencia de controles, pero no existe un SGSI definido que gobierne. |
| APO14 | Managed Data | **1** | Snapshots con `capturedAt` = retención implícita. Sin política de datos. |

**4 de 14 objetivos con evidencia. Ninguno supera nivel 1.**

---

### 🟡 Dominio BAI — Build, Acquire and Implement

| Obj. | Nombre | Nivel | Evidencia |
|---|---|:---:|---|
| BAI01 | Managed Programs | 0 | — |
| BAI02 | Managed Requirements Definition | 0 | — |
| BAI03 | Managed Solutions Identification and Build | 0 | — |
| BAI04 | Managed Availability and Capacity | **2** | `PerformanceSnapshot` + `GET /performance/alerts` + `/averages`. Monitoreo real con seguimiento. |
| BAI05 | Managed Organizational Change | 0 | — |
| BAI06 | Managed IT Changes | **1** | El diff de software entre snapshots detecta cambios **no autorizados**, pero no hay proceso de gestión de cambios. |
| BAI07 | Managed IT Change Acceptance | 0 | — |
| BAI08 | Managed Knowledge | 0 | — |
| **BAI09** | **Managed Assets** | **3** ⭐ | **Nuestro punto más fuerte.** `Equipment` + `Laboratory` + `HardwareSnapshot` con `serialNumber`, `manufactureYear`, `GET /obsolete`. Inventario definido y estandarizado con ciclo de vida. |
| **BAI10** | **Managed Configuration** | **3** ⭐ | Snapshots de configuración versionados en el tiempo + `AuthorizedSoftware` como línea base. Detección de desvío. |
| BAI11 | Managed Projects | 0 | — |

**4 de 11. Dos objetivos en nivel 3 — los más maduros del sistema.**

---

### 🟢 Dominio DSS — Deliver, Service and Support

| Obj. | Nombre | Nivel | Evidencia |
|---|---|:---:|---|
| DSS01 | Managed Operations | **1** | `Equipment.lastConnection` + `status` (operativo/degradado/crítico/sin-datos). |
| DSS02 | Managed Service Requests and Incidents | **0** 🔴 | **Brecha crítica:** la prueba **PS-SW-07 es "gestión de incidentes"** y el módulo `incidentes/` **no existe**. Auditamos algo que no tenemos. |
| DSS03 | Managed Problems | **1** | `GET /findings/recurring` detecta equipos con hallazgos recurrentes. Es gestión de problemas embrionaria — buena base. |
| DSS04 | Managed Continuity | 0 | Sin plan de continuidad ni respaldo. |
| **DSS05** | **Managed Security Services** | **3** ⭐ | `SecuritySnapshot`: antivirus (instalado/activo/definiciones/último escaneo), firewall (dominio/privado/público), Windows Update, política de contraseñas, usuarios locales. Cobertura amplia y estandarizada. |
| DSS06 | Managed Business Process Controls | 0 | — |

**3 de 6. DSS05 es nivel 3.**

---

### ✅ Dominio MEA — Monitor, Evaluate and Assess

| Obj. | Nombre | Nivel | Evidencia |
|---|---|:---:|---|
| **MEA01** | **Managed Performance and Conformance Monitoring** | **3** ⭐ | `DailyConsolidatorService`: heat map diario, `getEquipmentDetail`, `GET /findings/trends`. **Este es el corazón del sistema.** |
| MEA02 | Managed System of Internal Control | **2** | `AuditFinding` con ciclo de vida completo: `open → in-progress → resolved → accepted-risk`, más el catálogo de 14 pruebas PS-HW/PS-SW. |
| MEA03 | Managed Compliance With External Requirements | **2** | Marco normativo declarado en el prompt (COBIT, ISO 27001/27002, Ley 30096, NTP-ISO/IEC 17799) + control de licencias y lista blanca. **Declarado ≠ mapeado**: no hay trazabilidad prueba → cláusula. |
| MEA04 | Managed Assurance | **1** | La IA genera informes de aseguramiento, pero sin plan de aseguramiento ni independencia del evaluador. |

**4 de 4 objetivos cubiertos — 100% del dominio.**

---

### El patrón que revela la evaluación

```
EDM  ░░░░░  0.4/5   ← Evaluar · Dirigir · Supervisar  (GOBIERNO)
APO  ░░░░░  0.3/5
BAI  ██░░░  0.6/5
DSS  ██░░░  0.8/5
MEA  ████░  2.0/5   ← Monitorear · Evaluar · Valorar  (GESTIÓN)
```

**Recordá que EDM significa Evaluate–Direct–Monitor.**
Construimos la **"M"** — y solo la de MEA. No hay **"E"** ni **"D"** en ningún lado.

Esa es la brecha, en una imagen.

---

## 3. Componentes del sistema de gobierno — 2 de 7

COBIT 2019 define **siete componentes** que debe tener todo sistema de gobierno.
Un software es *uno* de ellos, no el sistema completo.

| # | Componente | Estado | Detalle |
|---|---|:---:|---|
| 1 | **Procesos** | 🟡 Parcial | Las 14 pruebas `PS-HW-01…07` / `PS-SW-01…07` son actividades de proceso definidas. Pero no hay procesos de gobierno. |
| 2 | **Estructuras organizacionales** | 🔴 Ausente | `Role` es RBAC de la aplicación, **no** una estructura de gobierno. No hay comité de TI, ni derechos de decisión, ni RACI. |
| 3 | **Principios, políticas y procedimientos** | 🟡 Parcial | `AuthorizedSoftware` (lista blanca) **es** un artefacto de política. Es el único. No hay política formal escrita. |
| 4 | **Información** | ✅ **Fuerte** | Snapshots versionados, hallazgos, informes de IA. Nuestra mayor fortaleza. |
| 5 | **Cultura, ética y comportamiento** | 🔴 Ausente | — |
| 6 | **Personas, habilidades y competencias** | 🔴 Ausente | — |
| 7 | **Servicios, infraestructura y aplicaciones** | ✅ **Fuerte** | **El software ES este componente.** |

**Conclusión:** construimos los componentes 4 y 7 — *información* y *aplicación*.
Los cinco restantes son organizacionales y **no se resuelven programando**. Se resuelven
documentando, decidiendo y asignando responsabilidades.

Esto es importante decirlo: **la mayor parte de lo que falta no es código.**

---

## 4. Los 11 Design Factors — 0 documentados

COBIT 2019 exige determinar los factores de diseño antes de definir qué objetivos priorizar.
Es el contenido de la **Unidad III** del sílabo. **Ninguno está documentado hoy.**

Propuesta de valores para nuestro contexto (Laboratorios EPIS-UNT), a validar con el equipo:

| # | Design Factor | Valor propuesto para el laboratorio |
|---|---|---|
| 1 | Enterprise Strategy | *Client Service / Stability* — el laboratorio da servicio docente, no innova |
| 2 | Enterprise Goals | Calidad del servicio educativo · Cumplimiento normativo · Optimización de costos |
| 3 | Risk Profile | Alto en: indisponibilidad de equipos, software no licenciado, malware |
| 4 | I&T-Related Issues | Obsolescencia de hardware · Falta de inventario confiable · Parches desactualizados |
| 5 | Threat Landscape | **Normal** — entorno académico, pero con acceso físico abierto de estudiantes |
| 6 | Compliance Requirements | **Alto** — Ley N° 30096, NTP-ISO/IEC 17799, licenciamiento de software |
| 7 | Role of IT | **Factory** — la TI debe funcionar; una caída detiene las clases |
| 8 | Sourcing Model | **Insourced** — administración propia de la universidad |
| 9 | IT Implementation Methods | Tradicional / híbrido |
| 10 | Technology Adoption Strategy | **Slow adopter** — restricción presupuestaria pública |
| 11 | Enterprise Size | Pequeña (una escuela profesional dentro de la UNT) |

> Estos valores determinan qué objetivos COBIT priorizar. Con *Role of IT = Factory* y
> *Compliance = Alto*, COBIT prioriza **DSS**, **BAI09/BAI10** y **MEA03** — que es
> exactamente lo que ya construimos. **Eso valida nuestras decisiones técnicas.** Pero hay que
> demostrarlo con el método, no afirmarlo.

---

## 5. Gobernanza de la IA — nuestra oportunidad más fuerte

**Semana 14 del sílabo:** *"COBIT para un gobierno eficaz de los sistemas de IA"*.

Nuestro sistema **usa IA para generar hallazgos de auditoría** (`claude-opus-4-5` /
`gpt-4o`, seleccionable por `AI_PROVIDER`). Es decir: tenemos un sistema de IA que produce
juicios de auditoría, dentro de un proyecto para un curso que pide gobernar la IA.

Además, tres de los artículos científicos referenciados en el sílabo son sobre IA y gobierno
de TI, y el coordinador del curso es coautor de los tres.

### Estado actual de la gobernanza de nuestra IA

| Control de gobierno | Estado | Evidencia |
|---|:---:|---|
| Distinguir juicio de IA vs. humano | ✅ | `AuditFinding.source`: `ai-generated` \| `manual` |
| Espacio para criterio del auditor | ✅ | `AuditFinding.auditorNotes` |
| Trazabilidad del input | ✅ | `AiAuditReport.sentContext` (JSONB) |
| Control de costo | 🟡 | `tokensUsed` se registra, nadie lo revisa → **EDM02** |
| Mitigación de alucinación | 🟡 | El prompt exige *"basarse ÚNICAMENTE en los datos"* — buena práctica, sin verificación |
| **Aprobación humana antes de oficializar** | 🔴 | **No existe.** Un hallazgo de IA nace con el mismo peso que uno validado |
| **Trazabilidad del modelo y versión** | 🔴 | No se persiste qué modelo generó cada informe |
| **Responsabilidad ante error del modelo** | 🔴 | Nadie definido |
| Sesgo / equidad del modelo | 🔴 | Sin evaluación |

Tres controles verdes y un prompt bien diseñado es **más de lo que tiene la mayoría**.
Los tres rojos son los que convierten esto en un caso de estudio de gobernanza de IA.

---

## 6. Dos hallazgos técnicos con lectura de gobierno

Estos ya están en `ESTADO_DEL_PROYECTO.md` como deuda técnica. Acá van releídos desde el
gobierno, porque **comprometen la integridad de la evidencia de auditoría**:

| Hallazgo | Lectura de gobierno |
|---|---|
| **API key en texto plano** en `sync_agent.ps1:6`, distribuida a cada PC del laboratorio | Rompe la **cadena de custodia de la evidencia**. Cualquiera con acceso a una PC puede inyectar datos falsos en `POST /agent/sync`. Afecta **MEA04** (aseguramiento) y **DSS05**. |
| **`POST /dev/clone-snapshots`** registrado sin guarda de entorno | Permite **fabricar evidencia de auditoría** clonando snapshots entre equipos y fechas. Afecta **MEA02** (control interno) y **MEA04**. |

Vale decirlo con todas las letras: **son hallazgos de auditoría dentro del sistema de
auditoría**. Presentarlos así, autodetectados y corregidos, es más valioso académicamente que
esconderlos.

---

## 7. Hoja de ruta alineada al Trabajo Aplicativo

El sílabo evalúa el Trabajo Aplicativo en **tres avances**, uno por unidad. En las Unidades II
y III el TAD pesa **doble** (`PU2 = [PFD + TAD*2 + ELD]/4`), así que ahí se define la nota.

### Avance 1 — Unidad I (CT 1.1, alineamiento) · semanas 1–5

*Organiza la gestión de TI de una organización.*

- [ ] Documentar el contexto: Escuela Profesional de Ingeniería de Sistemas, UNT
- [ ] Identificar al responsable de TI del laboratorio (rol tipo CIO) y sus decisiones
- [ ] Alinear el sistema con la estrategia de la Escuela → cascada de metas inicial
- [ ] Usar `Laboratory.responsible` / `responsibleEmail` como base real de stakeholders

### Avance 2 — Unidad II (CT 1.3, marcos) · semanas 6–10

*Recomienda un marco de referencia para la gestión de tecnologías.*

- [ ] Comparar **COBIT 2019 vs ISO/IEC 38500 vs Calder-Moir** para nuestro contexto
- [ ] Justificar la elección de COBIT 2019
- [ ] Presentar **la tabla de los 40 objetivos de §2** como línea base de capacidad
- [ ] Mapear las 14 pruebas `PS-HW/PS-SW` a objetivos COBIT y a cláusulas ISO 27001
      *(cierra la brecha de MEA03: "declarado ≠ mapeado")*

### Avance 3 — Unidad III (CT 1.4, diseño) · semanas 11–16

*Diseña un sistema de gobierno de TI.*

- [ ] Aplicar los **11 Design Factors** (§4) con su scoring formal
- [ ] Derivar los objetivos prioritarios según el método COBIT
- [ ] Definir **capability level objetivo** por objetivo prioritario y la brecha
- [ ] Diseñar los **7 componentes** (§3) — los 5 organizacionales que faltan
- [ ] Definir derechos de decisión / RACI *(referencia Weill, en el sílabo)*
- [ ] **Capítulo de gobernanza de la IA** (§5) — el diferenciador
- [ ] Posicionar el software como **componente 7 e instrumento de MEA01**, no como el sistema

---

## 8. Qué construir en código — mínimo viable

No hay que reescribir. Tres entidades encima de lo existente:

```
governance_objective
  code            "EDM01" … "MEA04"        (los 40)
  domain          EDM | APO | BAI | DSS | MEA
  name
  currentLevel    0-5      ← autoevaluación de §2
  targetLevel     0-5      ← derivado de los Design Factors
  priority        derivado del scoring
  justification

design_factor
  number          1-11
  name
  value           valor determinado para el laboratorio
  score
  rationale

objective_control_mapping
  governanceObjective  → governance_objective
  auditTest            "PS-HW-01" … "PS-SW-07"   ← ya existe en AuditFinding
  isoClause            "A.8.1.1", …               ← cierra MEA03
```

**El efecto:** con `objective_control_mapping`, cada `AuditFinding` que la IA ya genera
**sube automáticamente a un indicador de gobierno**. Un hallazgo PS-SW-02 (antimalware)
deja de ser un dato técnico y pasa a ser evidencia del nivel de capacidad de **DSS05**.

Ese es el puente entre lo que tenemos y lo que el curso pide.

---

## 9. Conclusión honesta

**Lo que tenemos:** un instrumento de monitoreo de auditoría técnicamente sólido, con dos
objetivos COBIT en nivel 3 (BAI09, BAI10), cobertura del 100% del dominio MEA, y un modelo de
datos de snapshots que soporta análisis temporal real. Eso no es poco.

**Lo que no tenemos:** el dominio EDM, los Design Factors, los niveles de capacidad, y cinco
de los siete componentes del sistema de gobierno.

**Lo que hay que entender:** la mayor parte de lo que falta **no es código** — son decisiones,
responsabilidades y documentos. Programar más no cierra esta brecha.

Tal como está, el proyecto responde con solvencia al curso de **Auditoría Informática (4491)**.
Para **Gobierno de TIC (4499)** necesita la capa EDM + Design Factors + gobernanza de la IA
descrita acá.

---

## 10. Referencias del sílabo aplicables

- **ISACA (2018).** *COBIT 2019 Framework: Introduction and Methodology* — Design Factors, componentes, principios
- **ISACA (2018).** *COBIT 2019 Framework: Governance and Management Objectives* — los 40 objetivos y niveles de capacidad
- **Weill, P. (2004).** *IT Governance: How Top Performers Manage IT Decision Rights* — derechos de decisión (§7, Avance 3)
- **Piattini, M. & Hervada, F. (2007).** *Gobierno de las Tecnologías y los Sistemas de Información*
- **Selig & Wilkinson (2008).** *Implementing IT Governance: A Practical Guide*
- **Merino & Cañizares.** *Auditoría de Sistemas de Gestión de Seguridad de la Información*

**Artículos del sílabo — relevantes para §5 (gobernanza de IA):**

- Azabache, Ángeles & Mendoza de los Santos (2024). *Impacto de la integración del Gobierno de TI en la adopción de la IA.* Rev. Investigación & Desarrollo, 23(2).
- Caciano-Arroyo, Vásquez-Cabrera & Mendoza-de-los-Santos (2025). *Integración de IA en la gobernanza de TI: revisión sistemática.* AiBi, 13(2).
- Lecca-Rengifo, Paz-Medrano & Mendoza de los Santos (2025). *Impacto de los marcos de gobierno de TI en la seguridad de la información.* Tecnología en Marcha, 38(1).
