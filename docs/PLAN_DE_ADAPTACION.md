# Plan de Adaptación al Curso de Gobierno de TIC (4499)

> **Qué hacer, en qué orden, y para cuándo.**
>
> Documento de acción. El análisis está en `ALINEACION_GOBIERNO_TI.md`;
> el estado técnico en `ESTADO_DEL_PROYECTO.md`.
>
> Fecha de este plan: **lunes 07/09/2026 — Semana 03 del curso.**

---

## 0. Dónde estamos parados en el calendario

El curso corre del **24/08/2026 al 19/12/2026**.

```
U1 ██████░░░░░░░░░░  S01─S05   24/08 → 26/09   ← ESTAMOS ACÁ (S03)
U2 ░░░░░░██████░░░░  S06─S10   28/09 → 31/10
U3 ░░░░░░░░░░░█████  S11─S16   02/11 → 12/12
```

| Hito | Semana | Fechas | Faltan |
|---|---|---|---|
| **Avance 1 — Trabajo Aplicativo** | S04–S05 | 14/09 → 26/09 | **~2 semanas** |
| Evaluación Unidad I | S05 | 21/09 → 26/09 | ~2 semanas |
| **Avance 2 — Trabajo Aplicativo** | S09–S10 | 19/10 → 31/10 | ~7 semanas |
| **Avance 3 — Trabajo Aplicativo final** | S15–S16 | 30/11 → 12/12 | ~12 semanas |

**Peso en la nota** — el Trabajo Aplicativo (TAD) vale **doble** en las Unidades II y III:

```
PU1 = [PFD + TAD  + ELD*2] / 4      ← el laboratorio pesa más
PU2 = [PFD + TAD*2 + ELD]  / 4      ← el trabajo pesa doble
PU3 = [PFD + TAD*2 + AI + ELD] / 5  ← el trabajo pesa doble + Actividad Integradora
```

Traducción: **el Avance 1 es el más barato en nota y el más barato en esfuerzo. No lo dejen pasar.**

---

## ⚠️ 1. LO PRIMERO — confirmar con el docente esta semana

El sílabo dice, textual y repetido:

> *"Identifica el rol del Responsable de Tecnologías **en una empresa de la región**."*
> *"Identifica el alineamiento de las TI con la estrategia empresarial **de una empresa de la región**."*
> *"…de una **organización empresarial**."*

Nuestro caso es un **laboratorio universitario público**, no una empresa de la región.

**Pregunta a hacerle al docente antes de invertir una hora más:**

> *"¿El Trabajo Aplicativo debe ser sobre una empresa externa de la región, o podemos
> tomar la Escuela Profesional de Ingeniería de Sistemas / la UNT como la organización
> a gobernar?"*

**Los dos escenarios y qué cambia:**

| Escenario | Qué pasa con nuestro software |
|---|---|
| **A. La UNT/EPIS es la organización** | Camino directo. El sistema es el instrumento MEA01 del gobierno que diseñamos. Este plan aplica tal cual. |
| **B. Debe ser una empresa externa** | El software se convierte en **el producto/herramienta** que le proponemos a esa empresa. Todo el plan sirve igual, pero la cascada de metas y los Design Factors se determinan con datos de la empresa, no del laboratorio. |

En ambos casos el trabajo de las Fases 1–3 se aprovecha. Pero **el contexto se define primero**,
o se documentan los Design Factors dos veces. Preguntar cuesta cinco minutos.

---

## 2. El orden no es negociable

```
FASE 1  DECIDIR      ~45% del trabajo   ← nadie programa
   ↓
FASE 2  DOCUMENTAR   ~35% del trabajo   ← nadie programa
   ↓
FASE 3  CODIFICAR    ~20% del trabajo
```

Y te lo digo con todas las letras, porque conozco el reflejo del equipo:
**si abren el editor primero, van a construir tablas vacías con nombres elegantes.**

Una entidad `governance_objective` sin nadie que haya decidido los `targetLevel` es
una tabla vacía. Una entidad `governance_threshold` sin umbrales acordados es una tabla vacía.

**Primero se decide. Después se documenta. Al final se codifica.**

---

# FASE 1 — DECIDIR (Semanas 03–05)

Esta fase se hace en **reuniones**, no en el editor. Salida: documentos firmados.

## 1.1 · La tabla de umbrales — EMPEZAR POR ACÁ ⭐

Este es el ejercicio de mayor rendimiento de todo el proyecto, y se llena en **una reunión**.

**El problema, en una línea:** medimos ~80 campos con precisión quirúrgica y
**no definimos ni un solo umbral aceptable.**

El agente reporta `daysSinceLastUpdate: 104`. El dashboard lo muestra.
**Nadie decidió cuántos días son tolerables.** Eso es exactamente la brecha de gobierno.

### Plantilla a completar (una fila por decisión)

| # | Campo que ya medimos | Umbral a definir | Valor acordado | Justificación | Objetivo COBIT |
|---|---|---|---|---|---|
| 1 | `daysSinceLastUpdate` | Días máximos sin parche del SO | | | DSS05 / EDM03 |
| 2 | `pendingUpdatesCount` | Cantidad máxima de updates pendientes | | | DSS05 |
| 3 | `isCriticalUpdatePending` | ¿Tolerancia cero a parches críticos? | | | DSS05 |
| 4 | `antivirusInstalled` / `antivirusEnabled` | ¿Obligatorio en 100% de equipos? | | | DSS05 |
| 5 | `antivirusDefinitionsUpdated` | ¿Tolerancia cero a definiciones vencidas? | | | DSS05 |
| 6 | `antivirusLastScanDate` | Días máximos sin escaneo completo | | | DSS05 |
| 7 | `firewallDomainEnabled` / `Private` / `Public` | ¿Los tres perfiles obligatorios? | | | DSS05 |
| 8 | `uacEnabled` | ¿UAC obligatorio? | | | DSS05 |
| 9 | `rdpEnabled` | ¿Escritorio remoto permitido o prohibido? | | | DSS05 |
| 10 | `remoteRegistryEnabled` | ¿Registro remoto permitido? | | | DSS05 |
| 11 | `passwordMinLength` | Longitud mínima exigida | | | DSS05 |
| 12 | `passwordComplexityEnabled` | ¿Complejidad obligatoria? | | | DSS05 |
| 13 | `passwordMaxAgeDays` | Vigencia máxima de contraseña | | | DSS05 |
| 14 | `accountLockoutThreshold` | Intentos antes de bloquear | | | DSS05 |
| 15 | `localUsers` | ¿Cuántas cuentas admin locales se permiten? | | | DSS05 |
| 16 | `manufactureYear` / `isObsolete` | Año a partir del cual un equipo es obsoleto | | | BAI09 / EDM04 |
| 17 | `diskSmartStatus` | ¿Qué hacer ante `warning` / `failed`? | | | BAI09 |
| 18 | `diskUsagePercent` | % máximo de ocupación de disco | | | BAI04 |
| 19 | `ramUsagePercent` | % máximo de uso de RAM sostenido | | | BAI04 |
| 20 | `cpuTemperatureC` | Temperatura máxima aceptable | | | BAI04 |
| 21 | `uptimeSeconds` | ¿Días máximos sin reinicio? | | | DSS01 |
| 22 | `licenseStatus` | ¿Tolerancia a software sin licencia? | | | APO10 / MEA03 |
| 23 | `isWhitelisted` | Acción ante software no autorizado detectado | | | BAI10 |
| 24 | `lastConnection` | Días sin sync antes de marcar el equipo como perdido | | | BAI09 |
| 25 | `severity` de hallazgos | Criterio para `critical` vs `high` — **¿quién lo definió?** | | | EDM03 / MEA02 |

**Por qué esta tabla vale tanto:** un solo artefacto, cuatro usos.

1. Es la **declaración de apetito de riesgo** → **EDM03**
2. Es la base de la **política de seguridad del laboratorio** → componente 3 del sistema de gobierno
3. Se convierte en la entidad `governance_threshold` en Fase 3 → **código**
4. Es evidencia de **desempeño** para el Avance 1

> Ojo con la fila 25. Hoy la IA asigna `critical` según su propio criterio.
> Nadie humano definió qué hace crítico a un hallazgo. **Eso es gobierno, no es un bug.**

## 1.2 · Matriz de derechos de decisión (RACI)

Referencia del sílabo: **Weill, P. (2004)** — *IT Governance: How Top Performers Manage IT Decision Rights*.

| Decisión | ¿Quién decide? | ¿Quién ejecuta? | ¿A quién se consulta? | ¿A quién se informa? |
|---|---|---|---|---|
| Aprobar software en la lista blanca | | | | |
| Definir/cambiar los umbrales (§1.1) | | | | |
| Aceptar un riesgo (`status: accepted-risk`) | | | | |
| **Oficializar un hallazgo generado por IA** | | | | |
| Autorizar baja de un equipo obsoleto | | | | |
| Aprobar el presupuesto de tokens de IA | | | | |
| Definir la frecuencia de auditoría | | | | |

Sin esto no existe **EDM01**. Y es la tabla más corta del documento.

## 1.3 · Identificación de stakeholders

Base real ya existente en código: `Laboratory.responsible` y `Laboratory.responsibleEmail`.

- [ ] ¿Quién es el dueño real de la TI del laboratorio? Nombre y cargo.
- [ ] ¿A quién se le reporta y con qué frecuencia?
- [ ] ¿Qué pasa si un hallazgo crítico no se atiende? Escalamiento.

## ✅ Entregable Fase 1 → **Avance 1 (S04–S05)**

- [ ] Contexto confirmado con el docente (§1)
- [ ] Tabla de umbrales completa (§1.1) — **25 decisiones**
- [ ] Matriz RACI (§1.2)
- [ ] Stakeholders y flujo de reporte (§1.3)
- [ ] Alineamiento: estrategia de la organización → rol de la TI → nuestro sistema

---

# FASE 2 — DOCUMENTAR (Semanas 06–10)

Unidad II del sílabo: *Marcos de Gobierno de TI*. CT 1.3.

## 2.1 · Comparativa de marcos

El sílabo nombra específicamente: **COBIT, ISO 38500, Forrester, Calder-Moir**.

| Marco | Ventajas | Desventajas | ¿Aplica a nuestro caso? |
|---|---|---|---|
| COBIT 2019 | | | |
| ISO/IEC 38500 | | | |
| Forrester | | | |
| Calder-Moir | | | |

→ Justificar la elección de **COBIT 2019** con argumentos, no por defecto.

## 2.2 · Mapeo prueba → objetivo COBIT → cláusula ISO

Cierra la brecha de **MEA03** (hoy el prompt *menciona* ISO 27001 pero no hay trazabilidad).

| Prueba | Descripción | Objetivo COBIT | Cláusula ISO 27001:2022 |
|---|---|---|---|
| PS-HW-01 | Estado físico | BAI09 | |
| PS-HW-02 | Inventario | BAI09 | A.5.9 |
| PS-HW-03 | Rendimiento / temperatura | BAI04 | |
| PS-HW-04 | Mantenimiento | BAI09 | A.7.13 |
| PS-HW-05 | Obsolescencia | BAI09 / EDM04 | |
| PS-HW-06 | Protección eléctrica | DSS04 | A.7.11 |
| PS-HW-07 | Disposición de equipos | BAI09 | A.7.14 |
| PS-SW-01 | Actualizaciones SO | DSS05 | A.8.8 |
| PS-SW-02 | Antimalware | DSS05 | A.8.7 |
| PS-SW-03 | Licencias | APO10 / MEA03 | A.5.32 |
| PS-SW-04 | Control de acceso | DSS05 | A.8.2 / A.8.5 |
| PS-SW-05 | Rendimiento | BAI04 | A.8.6 |
| PS-SW-06 | Software no autorizado | BAI10 | A.8.19 |
| PS-SW-07 | Gestión de incidentes | DSS02 | A.5.24 |

> ⚠️ **PS-SW-07 no tiene módulo que la soporte.** El `incidentes/` que documenta
> `audi-back/CLAUDE.md` **no existe**. Estamos auditando una capacidad que no tenemos.
> Decidir en esta fase: ¿se implementa el módulo, o se retira la prueba del alcance?

## 2.3 · Autoevaluación de capacidad

**Ya está hecha** — los 40 objetivos con nivel y evidencia están en `ALINEACION_GOBIERNO_TI.md` §2.
Para el Avance 2 hay que: validarla en equipo, presentarla, y declarar la limitación
metodológica (autoevaluación ≠ *Capability Assessment Method* de ISACA).

## ✅ Entregable Fase 2 → **Avance 2 (S09–S10)**

- [ ] Comparativa de los 4 marcos + justificación de COBIT
- [ ] Tabla de mapeo completa (§2.2)
- [ ] Decisión sobre PS-SW-07
- [ ] Autoevaluación de los 40 objetivos validada por el equipo

---

# FASE 3 — DISEÑAR Y CODIFICAR (Semanas 11–16)

Unidad III: *Aplicación de marco de gobierno de TI*. CT 1.4. **Acá se juega la nota.**

## 3.1 · Los 11 Design Factors (S11–S13)

Contenido literal del sílabo: *"Factores de Diseño de un sistema de Gobierno"*,
*"Comprendiendo el contexto y estrategia empresarial"*, *"Determinar el alcance inicial"*,
*"Refinar el alcance inicial"*, *"Concluir el diseño"*.

Hay una propuesta de valores inicial en `ALINEACION_GOBIERNO_TI.md` §4 — **hay que validarla
y hacer el scoring formal**, no copiarla.

Salida: **lista priorizada de objetivos COBIT** con `targetLevel` por objetivo.

## 3.2 · Código — las cuatro cosas que sí se programan

```
governance_threshold          ← la tabla de §1.1 hecha entidad
  field · operator · value · severity · cobitObjective · approvedBy · approvedAt

governance_objective          ← los 40 objetivos
  code · domain · name · currentLevel · targetLevel · priority · justification

design_factor                 ← los 11 factores
  number · name · value · score · rationale

objective_control_mapping     ← la tabla de §2.2 hecha entidad
  auditTest → governanceObjective → isoClause
```

**El efecto:** con `objective_control_mapping`, cada `AuditFinding` que la IA ya genera
**sube automáticamente a un indicador de gobierno**. Un hallazgo PS-SW-02 deja de ser
un dato técnico y pasa a ser evidencia del nivel de capacidad de **DSS05**.

Ese es el puente entre lo que tenemos y lo que el curso pide.

## 3.3 · Gobernanza de la IA (S14) ⭐ — el diferenciador

Semana 14 del sílabo: *"COBIT para un gobierno eficaz de los sistemas de IA"*.

Tenemos un sistema de IA que emite juicios de auditoría. **Tres controles ya funcionan**
(`source`, `auditorNotes`, `sentContext`). Faltan tres:

| Control faltante | Implementación |
|---|---|
| **Aprobación humana** | Agregar estado `pending-approval` a `AuditFinding.status`. Un hallazgo `ai-generated` no es oficial hasta que un auditor lo aprueba. |
| **Trazabilidad del modelo** | Persistir `modelName` y `modelVersion` en `AiAuditReport`. Hoy no se sabe qué modelo generó qué. |
| **Control de costo** | `tokensUsed` ya se registra. Falta el reporte y el responsable → **EDM02**. |

Los tres artículos de Mendoza de los Santos citados en el sílabo son sobre IA y gobierno de TI.
**Es el capítulo que nos diferencia del resto de los grupos.**

## 3.4 · Higiene: dos hallazgos con lectura de gobierno

Ya documentados en `ESTADO_DEL_PROYECTO.md`. Corregirlos **antes de la exposición final**:

| Hallazgo | Impacto de gobierno |
|---|---|
| API key en texto plano en `sync_agent.ps1:6`, distribuida a cada PC | Rompe la cadena de custodia de la evidencia → **MEA04** |
| `POST /dev/clone-snapshots` sin guarda de entorno | Permite fabricar evidencia de auditoría → **MEA02 / MEA04** |

**Presentarlos como autodetectados y corregidos vale más académicamente que esconderlos.**
Es literalmente demostrar la competencia del curso: evaluar, dirigir, supervisar.

## ✅ Entregable Fase 3 → **Avance 3 final (S15–S16)**

- [ ] 11 Design Factors con scoring formal
- [ ] Objetivos priorizados con brecha `currentLevel` → `targetLevel`
- [ ] Diseño de los 7 componentes del sistema de gobierno
- [ ] Las 4 entidades implementadas
- [ ] Capítulo de gobernanza de la IA
- [ ] Los 2 hallazgos de §3.4 corregidos
- [ ] Sistema posicionado como **componente 7 + instrumento MEA01**, no como "el gobierno"

---

## 3. Qué hacer ESTA SEMANA (07/09 → 12/09)

Concreto, en orden:

1. **Preguntarle al docente** lo de §1 — empresa de la región vs. UNT. Cinco minutos.
2. **Agendar la reunión de umbrales** (§1.1). Dos horas, todo el equipo, tabla proyectada.
3. **Repartir la matriz RACI** (§1.2) para llenarla en esa misma reunión.
4. Leer `ALINEACION_GOBIERNO_TI.md` §2 antes de la reunión — todos.

Nada de esto requiere abrir el editor.

---

## 4. Qué NO hacer

| ❌ No | ✅ Sí |
|---|---|
| Empezar por las entidades de la Fase 3 | Empezar por la tabla de umbrales |
| Presentar el software como "el sistema de gobierno" | Presentarlo como **componente 7 + instrumento MEA01** |
| Copiar los Design Factors propuestos sin validarlos | Hacer el scoring formal en equipo |
| Confundir `severity` de hallazgo con capability level | Son escalas distintas — es el error clásico |
| Esconder los hallazgos de §3.4 | Presentarlos autodetectados y corregidos |
| Decir "cumplimos ISO 27001" | Decir "mapeamos N controles a N cláusulas" |

---

## 5. Resumen en una línea

**No hay que reescribir el software. Hay que ponerle una cabeza a un cuerpo que ya funciona.**

Y esa cabeza se construye en reuniones y documentos, no en el editor.
El 80% del trabajo que falta no es código.
