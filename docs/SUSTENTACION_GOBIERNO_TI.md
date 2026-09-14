# Qué hace este sistema y por qué es gobierno de TI

**Guía para explicar y defender el proyecto — Gobierno de TIC (4499)**

> Escrito para ser explicado en voz alta. Todos los datos son del sistema
> funcionando, copiados tal cual salen en pantalla.

---

## 1. Empecemos por el problema real

Tenemos un agente instalado en las PCs del laboratorio. Cada vez que corre, manda al
servidor unos 80 datos del equipo. Uno de ellos es este:

```
daysSinceLastUpdate: 104
```

Ese equipo lleva 104 días sin actualizar Windows.

Ahora la pregunta incómoda: **¿eso está bien o está mal?**

Y la respuesta honesta, antes de este trabajo, era: **nadie lo sabía.** El sistema
mostraba "104" y ahí terminaba. Cada persona que lo miraba decidía por su cuenta si
le parecía mucho o poco. No había un criterio escrito en ningún lado.

Eso pasaba con los 80 datos. Medíamos todo con precisión y no habíamos definido
**contra qué**.

> Un número sin un criterio al lado no es información. Es solo un número.

**Eso es lo que este trabajo resuelve.**

---

## 2. Seguí un caso completo, de punta a punta

Tomemos un control concreto: **el antivirus**.

### Paso 1 — Alguien decide qué es aceptable

En la vista de Umbrales se define esto:

```
UMB-AVM-01   Antivirus instalado y activo

  Valor aceptado:  Debe estar activo
  Campo medido:    antivirusEnabled
  Si se incumple:  severidad CRÍTICA
```

Hasta acá es una regla. Lo importante viene ahora.

### Paso 2 — Hay que explicar POR QUÉ

El sistema no deja guardar un umbral suelto. Obliga a completar tres cosas, y las
muestra en pantalla para cualquiera que entre:

> **¿Qué mide?**
> Si el equipo tiene una solución antimalware instalada y con la protección en tiempo
> real encendida.
>
> **¿Por qué importa?**
> Es el control base. Un equipo sin antivirus activo no tiene ninguna barrera frente a
> malware común, y en un entorno con usuarios que instalan software eso es cuestión de
> tiempo.
>
> **¿De dónde sale el valor?**
> ISO/IEC 27001:2022 — A.8.7 Protección contra malware.
> No admite umbral gradual: o está protegido o no lo está.

**Ese es el punto que hay que remarcar.** El criterio no es una opinión de quien
programó el sistema: está escrito, fundamentado y es discutible. Si alguien no está de
acuerdo, discute contra un argumento, no contra un número que apareció de la nada.

### Paso 3 — Alguien lo firma

Hay un botón que dice **Aprobar**. Pide nombre y cargo, y guarda la fecha.

Hasta que alguien lo firma, el umbral aparece marcado como **«Sin aprobar»** — es una
propuesta, no una política.

Y hay un detalle que importa: **si después cambiás el valor, la firma se borra sola** y
hay que aprobarlo de nuevo. Si se pudiera cambiar el número dejando la firma vieja, la
firma no serviría para nada.

### Paso 4 — El sistema lo compara contra la realidad

Esto es lo que sale hoy para un equipo real del laboratorio:

```
EQUIPO-PRUEBA  ·  PC-PRUEBA-GOBIERNO

  ✗ [UMB-AVM-01] Antivirus instalado y activo
       Reportado: Ausente o deshabilitado    →    Política: que esté activo
       Ausente o deshabilitado — incumple: se exige que esté activo.
       Detalle: Windows Defender
       Evidencia del 31/08/2026 · hace 6 días
```

Ahí están las tres cosas juntas y a la vista: **lo que el equipo tiene, lo que la
política exige, y el veredicto.**

---

## 3. Ese mismo equipo, completo

```
EQUIPO-PRUEBA  ·  PC-PRUEBA-GOBIERNO
Cumple: 14    Incumple: 8    Sin datos: 2    →    64 % de cumplimiento
Evidencia del 31/08/2026 (hace 6 días)
```

Algunos de sus incumplimientos, copiados textuales de la pantalla:

```
✗ Longitud mínima de contraseña
     Reportado: 0 caracteres          →   Política: mínimo 14 caracteres

✗ Intentos fallidos antes de bloquear la cuenta
     Reportado: Sin bloqueo configurado   →   Política: máximo 5 intentos

✗ Definiciones de antivirus actualizadas
     Reportado: Definiciones desactualizadas
```

Y dos que **no se pudieron evaluar**:

```
? Días desde el último escaneo completo   →   Nunca se registró un escaneo
? Temperatura máxima del procesador       →   Sensor no disponible
```

Esos dos no cuentan como aprobados **ni** como reprobados. Volvemos sobre esto en el
punto 5, porque es importante.

---

## 4. Lo que apareció al mirar todo el laboratorio junto

Corriendo la evaluación sobre los 20 equipos: **480 comparaciones** (20 equipos × 24
umbrales). Resultado global: **57 % de cumplimiento**.

Pero el dato interesante no es ese. Es este — los controles que más fallan:

| Control | Equipos que lo incumplen |
|---|---|
| Antivirus instalado y activo | **19 de 19** |
| Definiciones de antivirus actualizadas | **19 de 19** |
| Longitud mínima de contraseña | **19 de 19** |
| Intentos fallidos antes de bloquear | **19 de 19** |
| Vigencia máxima de contraseña | **19 de 19** |
| Complejidad de contraseña habilitada | **19 de 19** |

**Todos los equipos fallan exactamente los mismos seis controles.**

Y acá está lo que hay que decir en la sustentación, porque es el corazón del trabajo:

> Si **un** equipo no tiene antivirus, es un descuido de alguien.
>
> Si **los 19** no tienen antivirus, no hay 19 descuidos.
> **Hay una política que nunca se definió.**

Eso cambia completamente qué hay que hacer. No son 19 tickets de soporte para 19
técnicos: es **una sola decisión** de quien dirige el laboratorio — desplegar una
política de dominio que configure los 19 equipos de una vez.

Y ese diagnóstico **no se puede ver mirando los equipos de a uno**. Solo aparece cuando
comparás el parque completo contra un criterio escrito.

---

## 5. Por qué el 57 % es un número honesto

Un porcentaje de cumplimiento es fácil de inflar. Tres decisiones evitan que este mienta:

### El sistema admite decir "no sé"

Hay cuatro respuestas posibles, no dos: **cumple · incumple · sin datos · no evaluable.**

De las 480 comparaciones, **44 quedaron sin datos** (como los dos del equipo de arriba:
"Nunca se registró un escaneo", "Sensor no disponible").

El 57 % se calcula **sin contar esas 44**. Si las contáramos como aprobadas, el número
subiría a 63 %. Se ve mejor, y sería mentira: no sabemos si esos 44 controles se
cumplen o no.

> Un dato que no llegó no es una buena noticia. Es una que no tenemos.

### Todo resultado dice de cuándo es

Cada veredicto muestra la fecha de la captura que usó. Si tiene más de 7 días, aparece
marcado como **evidencia vencida**.

Hoy: **18 de los 20 equipos** tienen evidencia vencida, y el sistema lo dice en pantalla.

Es incómodo mostrarlo, pero es necesario: un hallazgo que no dice de cuándo son los
datos no se puede defender ante nadie.

### Todo se puede rastrear hasta su norma

Desde cualquier incumplimiento se llega al objetivo COBIT y a la cláusula ISO 27001 que
lo respalda. En total: **24 umbrales, 6 objetivos COBIT, 12 cláusulas ISO** y una norma
legal peruana (D. Leg. 822, para el control de licencias).

---

## 6. La IA que escribe hallazgos, y quién responde por ella

El sistema usa un modelo de IA para redactar hallazgos de auditoría. Eso abre una
pregunta que hay que responder: **si el modelo dice que algo es "crítico", ¿quién lo
decidió?**

Antes: **el modelo, solo, según su propio criterio.**

Ahora existe una **matriz de severidad escrita y aprobada por el auditor**, que define
qué hace que un hallazgo sea crítico, alto, medio o bajo. El modelo aplica ese criterio
en lugar de inventar el suyo.

Además, cada hallazgo queda marcado según su origen (`ai-generated` o `manual`), tiene
espacio para las notas del auditor, y se guarda el contexto exacto que se le envió al
modelo.

> Le sacamos al modelo una decisión que no le correspondía y se la devolvimos a una
> persona. Eso es gobernar un sistema de IA.

**Lo que falta:** que un hallazgo generado por IA no sea oficial hasta que un humano lo
apruebe. Está identificado y es la próxima iteración.

---

## 7. Entonces, ¿por qué esto es gobierno y no auditoría?

Recién ahora, con todo lo anterior mostrado, conviene decir la parte conceptual. En una
comparación:

| | Auditoría | Gobierno |
|---|---|---|
| Qué hace | Verifica si se cumple un criterio | **Produce y administra ese criterio** |
| Pregunta | ¿Este equipo cumple? | ¿Quién decidió qué es cumplir, y con qué autoridad? |
| En este sistema | Paso 4 | **Pasos 1, 2 y 3** |

La auditoría informática —el curso anterior— es el paso 4: comparar contra un criterio.

Este trabajo agrega los pasos 1, 2 y 3: **de dónde sale ese criterio, cómo se
fundamenta, y quién responde por él.** Eso, en COBIT 2019, es el dominio EDM
(*Evaluar, Dirigir y Supervisar*), que es justamente el dominio de gobierno.

Y una aclaración que conviene hacer antes de que la pregunten:

> **El software no es el sistema de gobierno.** COBIT define siete componentes de un
> sistema de gobierno, y cinco de ellos son organizacionales: estructuras, políticas,
> cultura, personas, competencias. El software es uno de los dos restantes.
>
> No reemplaza esas decisiones. **Las hace verificables.**

---

## 8. Cómo mostrarlo en vivo — 5 minutos

**1. El problema (1 min)** — Vista de Seguridad, historial de un equipo.
> «Acá el sistema dice 104 días sin actualizar. Es un dato exacto. Pero solo, no dice
> nada: nadie había definido cuántos días son aceptables.»

**2. La decisión (1.5 min)** — `/main/gobierno/umbrales`, abrir un umbral.
> «Acá está la regla: máximo 30 días. Y fíjense que el sistema obliga a explicar qué
> mide, por qué importa y de dónde sale el número — en este caso, un ciclo completo de
> actualizaciones de Microsoft. Además está atado a ISO 27001.»

Mostrar el botón **Aprobar**.
> «Y alguien tiene que firmarlo. Si mañana cambio el valor, la firma se borra sola.»

**3. El cruce (1.5 min)** — `/main/gobierno/cumplimiento`.
> «Acá se juntan las dos cosas: lo que el equipo reportó contra lo que la regla exige.
> 20 equipos, 480 comparaciones, 57 % de cumplimiento.»

**4. El hallazgo (1 min)** — pestaña «Dónde actuar primero».
> «Y esto es lo que ninguna vista técnica muestra: los 19 equipos fallan los mismos
> seis controles. Eso no son 19 errores — es una política que no existe. Se arregla con
> una decisión, no con 19 arreglos.»

---

## 9. Preguntas que te pueden hacer

**«¿Esto no es lo mismo que el curso de auditoría?»**
> No. La auditoría verifica contra un criterio que ya existe. Acá el sistema **produce**
> el criterio: quién lo define, con qué fundamento, quién lo firma y desde cuándo rige.
> Verificar es el último paso; los tres anteriores son nuevos.

**«¿Los umbrales no son valores arbitrarios?»**
> Cada umbral declara su origen y el sistema no deja guardarlo sin justificación. De los
> 24: **12 salen de estándares técnicos** (CIS, Microsoft, ISO 27001), **1 de una norma
> legal peruana**, y **11 de criterio profesional con la justificación escrita**. Ese
> último grupo es discutible — y esa es la idea: si alguien no está de acuerdo, discute
> contra un argumento visible.

**«¿Cómo sé que el 57 % no está maquillado?»**
> Porque deja afuera los 44 controles sin datos en lugar de contarlos como aprobados.
> Si los contara, daría 63 %. Y porque avisa que 18 de 20 equipos tienen evidencia
> vencida. El sistema muestra sus propias limitaciones.

**«¿Y si la IA se equivoca?»**
> Todo hallazgo generado por IA queda marcado como tal, admite notas del auditor, y ya
> no decide la severidad por su cuenta. Lo que falta es que necesite aprobación humana
> antes de ser oficial — está identificado como siguiente paso.

**«¿El software resuelve el gobierno del laboratorio?»**
> No, y sería un error decir que sí. Resuelve dos de los siete componentes que COBIT
> pide. Los otros cinco son decisiones organizacionales que ninguna aplicación puede
> tomar por vos.

---

## 10. Lo que el sistema todavía no hace

Decirlo es parte del trabajo. Si no lo decimos nosotros, lo encuentra el evaluador.

- **No cubre todo el dominio EDM.** Aporta a EDM01 (marco de decisiones) y EDM03
  (apetito de riesgo). Faltan EDM02, EDM04 y EDM05.
- **No implementa los 11 Design Factors** de COBIT 2019 ni la cascada de metas.
- **No calcula niveles de capacidad (0 a 5)** por objetivo. Ojo con esto: la severidad
  de un hallazgo **no** es lo mismo que la madurez de un proceso. Confundirlas es un
  error clásico.
- **La cobertura COBIT es una autoevaluación**, no una evaluación formal — esa requiere
  el método de ISACA con un evaluador independiente.
- **No decide por nadie.** Registra quién decidió qué; las decisiones siguen siendo de
  las personas.

---

## 11. La frase de cierre

> Antes, el sistema **medía**: mostraba 104 días sin actualizar y nadie sabía si eso
> estaba bien.
>
> Ahora **compara contra una regla escrita, fundamentada y firmada por alguien**, sobre
> 20 equipos reales, y avisa cuando no tiene datos suficientes para opinar.
>
> Esa diferencia —entre mostrar un número y compararlo contra un criterio del que
> alguien responde— es la diferencia entre gestión y gobierno de TI.

---

### Documentos de respaldo

| Documento | Para qué sirve |
|---|---|
| `docs/ALINEACION_GOBIERNO_TI.md` | Los 40 objetivos COBIT evaluados uno por uno |
| `docs/PLAN_DE_ADAPTACION.md` | Qué falta y para cuándo, por unidad del sílabo |
| `docs/ESTADO_DEL_PROYECTO.md` | Estado técnico y deuda pendiente |
| `src/modules/governance.md` | Cómo está construido el módulo |
