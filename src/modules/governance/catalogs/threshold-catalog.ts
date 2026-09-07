// governance/catalogs/threshold-catalog.ts

/**
 * CATÁLOGO BASE DE UMBRALES DE GOBIERNO
 *
 * Cada entrada es una decisión propuesta con su fundamento. Se siembra
 * una sola vez; a partir de ahí se edita desde el dashboard y queda
 * registrado quién aprobó qué y cuándo (EDM01).
 *
 * ⚠️ Los valores son PROPUESTAS defendibles, no verdades absolutas.
 * El valor de este catálogo no está en el número: está en que cada
 * número tiene una justificación trazable a un estándar, una norma
 * o un criterio profesional declarado.
 */

export interface ThresholdSeed {
  code: string;
  category: string;
  field: string;
  label: string;
  whatItMeasures: string;
  whyItMatters: string;
  howItIsEvaluated: string;
  operator: 'lte' | 'gte' | 'eq' | 'neq' | 'is_true' | 'is_false';
  value: string | null;
  unit: string | null;
  severityOnBreach: 'low' | 'medium' | 'high' | 'critical';
  cobitObjective: string;
  isoClause: string | null;
  legalBasis: string | null;
  sourceType: 'standard' | 'regulation' | 'professional_judgment';
  sourceReference: string | null;
  rationale: string;
}

export const THRESHOLD_CATALOG: ThresholdSeed[] = [

  // ══════════════════════════════════════════════════════════════
  // ACTUALIZACIONES DEL SISTEMA OPERATIVO
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-PAR-01',
    category: 'patches',
    field: 'isCriticalUpdatePending',
    label: 'Parches críticos pendientes',
    whatItMeasures:
      'Si el equipo tiene actualizaciones marcadas como críticas por Microsoft y todavía no aplicadas.',
    whyItMatters:
      'Un parche crítico corrige una vulnerabilidad que ya es pública y suele tener código de explotación disponible. Cada día sin aplicarlo es un día con la puerta abierta.',
    howItIsEvaluated:
      'Se incumple si el equipo reporta al menos un parche crítico pendiente por más de 15 días.',
    operator: 'is_false',
    value: null,
    unit: null,
    severityOnBreach: 'critical',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.8',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: 'Ventana de riesgo para vulnerabilidades críticas',
    rationale:
      'Quince días es el punto medio entre la capacidad operativa real de una organización pequeña y la ventana en que una vulnerabilidad crítica pasa de publicada a explotada masivamente.',
  },
  {
    code: 'UMB-PAR-02',
    category: 'patches',
    field: 'daysSinceLastUpdate',
    label: 'Días sin actualizar el sistema operativo',
    whatItMeasures:
      'Cuántos días pasaron desde la última actualización aplicada al sistema operativo.',
    whyItMatters:
      'Un equipo que no se actualiza acumula vulnerabilidades conocidas. Es el hallazgo más común y el más barato de corregir.',
    howItIsEvaluated:
      'Se incumple si superó los 30 días desde la última actualización.',
    operator: 'lte',
    value: '30',
    unit: 'días',
    severityOnBreach: 'high',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.8',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'Ciclo mensual de actualizaciones de Microsoft (Patch Tuesday)',
    rationale:
      'Microsoft publica actualizaciones el segundo martes de cada mes. Treinta días equivale a un ciclo completo: si pasó más, el equipo se salteó una tanda entera.',
  },
  {
    code: 'UMB-PAR-03',
    category: 'patches',
    field: 'pendingUpdatesCount',
    label: 'Actualizaciones pendientes acumuladas',
    whatItMeasures:
      'Cuántas actualizaciones de cualquier tipo están descargadas o disponibles sin instalar.',
    whyItMatters:
      'Una acumulación alta indica que nadie administra el equipo. Es un indicador de proceso, no sólo de riesgo técnico.',
    howItIsEvaluated:
      'Se incumple si hay más de 5 actualizaciones pendientes.',
    operator: 'lte',
    value: '5',
    unit: 'actualizaciones',
    severityOnBreach: 'medium',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.8',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: null,
    rationale:
      'Más de cinco pendientes deja de ser un retraso puntual y pasa a ser evidencia de ausencia de mantenimiento planificado.',
  },

  // ══════════════════════════════════════════════════════════════
  // PROTECCIÓN ANTIMALWARE
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-AVM-01',
    category: 'antimalware',
    field: 'antivirusEnabled',
    label: 'Antivirus instalado y activo',
    whatItMeasures:
      'Si el equipo tiene una solución antimalware instalada y con la protección en tiempo real encendida.',
    whyItMatters:
      'Es el control base. Un equipo sin antivirus activo no tiene ninguna barrera frente a malware común, y en un entorno con usuarios que instalan software eso es cuestión de tiempo.',
    howItIsEvaluated:
      'Se incumple si el antivirus no está instalado o está deshabilitado. Tolerancia cero.',
    operator: 'is_true',
    value: null,
    unit: null,
    severityOnBreach: 'critical',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.7',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'ISO/IEC 27001:2022 — A.8.7 Protección contra malware',
    rationale:
      'No admite umbral gradual. O está protegido o no lo está. El 100% de los equipos debe cumplirlo sin excepción.',
  },
  {
    code: 'UMB-AVM-02',
    category: 'antimalware',
    field: 'antivirusDefinitionsUpdated',
    label: 'Definiciones de antivirus actualizadas',
    whatItMeasures:
      'Si la base de firmas del antivirus está al día.',
    whyItMatters:
      'Un antivirus con definiciones viejas da una falsa sensación de seguridad: está encendido, se ve verde, y no reconoce ninguna amenaza reciente.',
    howItIsEvaluated:
      'Se incumple si las definiciones tienen más de 3 días de antigüedad.',
    operator: 'is_true',
    value: null,
    unit: null,
    severityOnBreach: 'high',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.7',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: 'Cadencia diaria de publicación de firmas de Microsoft Defender',
    rationale:
      'Defender publica definiciones varias veces al día. Tres días de margen absorbe un fin de semana con el equipo apagado sin volverse permisivo.',
  },
  {
    code: 'UMB-AVM-03',
    category: 'antimalware',
    field: 'antivirusLastScanDate',
    label: 'Días desde el último escaneo completo',
    whatItMeasures:
      'Cuánto hace que no se ejecuta un análisis completo del disco.',
    whyItMatters:
      'La protección en tiempo real revisa lo que se ejecuta, no lo que ya está dormido en el disco. El escaneo completo es lo que encuentra lo que entró antes.',
    howItIsEvaluated:
      'Se incumple si pasaron más de 7 días desde el último escaneo completo.',
    operator: 'lte',
    value: '7',
    unit: 'días',
    severityOnBreach: 'medium',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.7',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: null,
    rationale:
      'Cadencia semanal: suficiente para detectar amenazas latentes sin afectar el rendimiento durante horas de uso.',
  },

  // ══════════════════════════════════════════════════════════════
  // FIREWALL Y SUPERFICIE DE ATAQUE
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-FWL-01',
    category: 'firewall',
    field: 'firewallEnabled',
    label: 'Firewall activo en los tres perfiles',
    whatItMeasures:
      'Si el firewall de Windows está encendido en los perfiles de dominio, privado y público.',
    whyItMatters:
      'Basta con que un perfil esté apagado para que el equipo quede expuesto al conectarse a una red de ese tipo. Es un agujero que sólo aparece en cierto contexto, y por eso se pasa por alto.',
    howItIsEvaluated:
      'Se incumple si cualquiera de los tres perfiles está deshabilitado.',
    operator: 'is_true',
    value: null,
    unit: null,
    severityOnBreach: 'critical',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.20',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'Microsoft Security Baseline para Windows',
    rationale:
      'La línea base de Microsoft exige los tres perfiles activos. No hay escenario legítimo en un equipo de usuario final para apagar uno.',
  },
  {
    code: 'UMB-FWL-02',
    category: 'firewall',
    field: 'uacEnabled',
    label: 'Control de cuentas de usuario (UAC) habilitado',
    whatItMeasures:
      'Si Windows pide confirmación antes de ejecutar acciones que requieren privilegios de administrador.',
    whyItMatters:
      'Con UAC apagado, cualquier programa que el usuario ejecute corre con permisos totales sin avisar. Es la diferencia entre un malware que infecta una carpeta y uno que toma el equipo entero.',
    howItIsEvaluated:
      'Se incumple si UAC está deshabilitado.',
    operator: 'is_true',
    value: null,
    unit: null,
    severityOnBreach: 'high',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.2',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'Microsoft Security Baseline para Windows',
    rationale:
      'Control de elevación de privilegios. Deshabilitarlo suele hacerse "para que no moleste" y anula la separación de privilegios del sistema.',
  },
  {
    code: 'UMB-FWL-03',
    category: 'firewall',
    field: 'rdpEnabled',
    label: 'Escritorio remoto (RDP) deshabilitado',
    whatItMeasures:
      'Si el equipo acepta conexiones de Escritorio Remoto.',
    whyItMatters:
      'RDP expuesto es uno de los vectores de entrada más explotados: ataques de fuerza bruta contra contraseñas débiles y vulnerabilidades históricas del propio servicio.',
    howItIsEvaluated:
      'Se incumple si RDP está habilitado sin una excepción documentada y aprobada.',
    operator: 'is_false',
    value: null,
    unit: null,
    severityOnBreach: 'high',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.20',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: null,
    rationale:
      'Un equipo de usuario final no necesita RDP. Si alguno lo requiere, se documenta la excepción con su responsable — eso también es gobierno.',
  },
  {
    code: 'UMB-FWL-04',
    category: 'firewall',
    field: 'remoteRegistryEnabled',
    label: 'Registro remoto deshabilitado',
    whatItMeasures:
      'Si el servicio que permite leer y modificar el registro de Windows desde otra máquina está activo.',
    whyItMatters:
      'Es un servicio que casi nadie usa y que permite reconocimiento y modificación del sistema a distancia. Superficie de ataque gratuita.',
    howItIsEvaluated:
      'Se incumple si el servicio de Registro Remoto está habilitado.',
    operator: 'is_false',
    value: null,
    unit: null,
    severityOnBreach: 'medium',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.20',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'CIS Microsoft Windows Benchmark',
    rationale:
      'Principio de superficie mínima: todo servicio que no se usa se apaga. Este no tiene uso legítimo en un equipo de usuario final.',
  },

  // ══════════════════════════════════════════════════════════════
  // CONTRASEÑAS Y CUENTAS LOCALES
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-PWD-01',
    category: 'passwords',
    field: 'passwordMinLength',
    label: 'Longitud mínima de contraseña',
    whatItMeasures:
      'La cantidad mínima de caracteres que la política del equipo exige para una contraseña.',
    whyItMatters:
      'La longitud es la variable que más encarece un ataque de fuerza bruta. Mucho más que la complejidad.',
    howItIsEvaluated:
      'Se incumple si la política permite contraseñas de menos de 14 caracteres.',
    operator: 'gte',
    value: '14',
    unit: 'caracteres',
    severityOnBreach: 'medium',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.5',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'CIS Microsoft Windows Benchmark',
    rationale:
      'CIS recomienda 14 caracteres o más. Duplicar la longitud vale mucho más que agregar símbolos raros a una contraseña corta.',
  },
  {
    code: 'UMB-PWD-02',
    category: 'passwords',
    field: 'accountLockoutThreshold',
    label: 'Intentos fallidos antes de bloquear la cuenta',
    whatItMeasures:
      'Cuántos intentos de inicio de sesión fallidos se permiten antes de bloquear temporalmente la cuenta.',
    whyItMatters:
      'Sin bloqueo, un atacante puede probar contraseñas indefinidamente. Con bloqueo, la fuerza bruta deja de ser viable.',
    howItIsEvaluated:
      'Se incumple si el umbral es 0 (sin bloqueo) o mayor a 5 intentos.',
    operator: 'lte',
    value: '5',
    unit: 'intentos',
    severityOnBreach: 'medium',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.5',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'CIS Microsoft Windows Benchmark',
    rationale:
      'Cinco intentos tolera el error humano razonable y corta cualquier intento automatizado.',
  },
  {
    code: 'UMB-PWD-03',
    category: 'passwords',
    field: 'localUsers',
    label: 'Cuentas administrativas locales',
    whatItMeasures:
      'Cuántas cuentas con privilegios de administrador existen en el equipo.',
    whyItMatters:
      'Cada cuenta administrativa extra es una llave más del mismo candado, y normalmente ninguna tiene dueño identificado.',
    howItIsEvaluated:
      'Se incumple si hay más de 1 cuenta administrativa local habilitada.',
    operator: 'lte',
    value: '1',
    unit: 'cuentas',
    severityOnBreach: 'high',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.2',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'Principio de mínimo privilegio — ISO/IEC 27002',
    rationale:
      'Una sola cuenta administrativa, nominada y con responsable identificable. Las cuentas genéricas compartidas destruyen la trazabilidad.',
  },
  {
    code: 'UMB-PWD-04',
    category: 'passwords',
    field: 'passwordMaxAgeDays',
    label: 'Vigencia máxima de la contraseña',
    whatItMeasures:
      'Cada cuántos días el sistema obliga a cambiar la contraseña.',
    whyItMatters:
      'Contra la intuición, forzar cambios frecuentes DEBILITA la seguridad: la gente termina usando variaciones predecibles del tipo Verano2026 → Otono2026.',
    howItIsEvaluated:
      'Se incumple si la vigencia es menor a 365 días o si es 0 (sin expiración) sin justificación documentada.',
    operator: 'gte',
    value: '365',
    unit: 'días',
    severityOnBreach: 'low',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.5',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'NIST SP 800-63B / CIS Microsoft Windows Benchmark',
    rationale:
      'NIST SP 800-63B desaconseja la expiración periódica obligatoria y recomienda cambiar la contraseña sólo ante evidencia de compromiso. CIS acompañó ese cambio elevando la vigencia máxima a 365 días. Mantener la regla clásica de 90 días sería aplicar una recomendación que el propio organismo que la popularizó ya revirtió.',
  },
  {
    code: 'UMB-PWD-05',
    category: 'passwords',
    field: 'passwordComplexityEnabled',
    label: 'Complejidad de contraseña habilitada',
    whatItMeasures:
      'Si Windows exige combinar mayúsculas, minúsculas, números y símbolos.',
    whyItMatters:
      'Aporta, pero mucho menos que la longitud. Se mantiene como control complementario porque es la configuración que un auditor externo espera encontrar.',
    howItIsEvaluated:
      'Se incumple si la política de complejidad está deshabilitada.',
    operator: 'is_true',
    value: null,
    unit: null,
    severityOnBreach: 'low',
    cobitObjective: 'DSS05',
    isoClause: 'A.8.5',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'CIS Microsoft Windows Benchmark',
    rationale:
      'Se conserva por alineación con la línea base, con la reserva de que NIST SP 800-63B desaconseja las reglas de composición obligatorias frente a la verificación contra listas de contraseñas filtradas.',
  },

  // ══════════════════════════════════════════════════════════════
  // ACTIVOS Y HARDWARE
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-HWD-01',
    category: 'hardware',
    field: 'manufactureYear',
    label: 'Antigüedad máxima del equipo',
    whatItMeasures:
      'Los años transcurridos desde el año de fabricación del equipo.',
    whyItMatters:
      'Un equipo fuera de vida útil deja de recibir soporte del fabricante, no soporta versiones actuales del sistema operativo y su tasa de falla se dispara.',
    howItIsEvaluated:
      'Se incumple si el equipo supera los 6 años desde su fabricación.',
    operator: 'lte',
    value: '6',
    unit: 'años',
    severityOnBreach: 'medium',
    cobitObjective: 'BAI09',
    isoClause: 'A.7.14',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: 'Vida útil operativa de equipos de escritorio',
    rationale:
      'Seis años de vida operativa. Conviene contrastar este valor con la tasa de depreciación contable que la organización aplica a equipos de procesamiento de datos: un umbral alineado al criterio contable es mucho más defendible ante la dirección que uno puramente técnico.',
  },
  {
    code: 'UMB-HWD-02',
    category: 'hardware',
    field: 'diskSmartStatus',
    label: 'Estado SMART del disco',
    whatItMeasures:
      'El diagnóstico de autodetección de fallas que reporta el propio disco duro.',
    whyItMatters:
      'SMART avisa ANTES de que el disco falle. Ignorar un aviso es elegir perder los datos en vez de programar el reemplazo.',
    howItIsEvaluated:
      'Se incumple si el estado no es "good". Un estado "failed" exige retiro inmediato del equipo.',
    operator: 'eq',
    value: 'good',
    unit: null,
    severityOnBreach: 'critical',
    cobitObjective: 'BAI09',
    isoClause: 'A.7.10',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'S.M.A.R.T. (Self-Monitoring, Analysis and Reporting Technology)',
    rationale:
      'Una advertencia SMART es una predicción de falla, no una opinión. Es de los pocos indicadores que permiten actuar antes del incidente.',
  },

  // ══════════════════════════════════════════════════════════════
  // RENDIMIENTO Y CAPACIDAD
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-RND-01',
    category: 'performance',
    field: 'diskUsagePercent',
    label: 'Ocupación máxima del disco',
    whatItMeasures:
      'El porcentaje del disco que está ocupado.',
    whyItMatters:
      'Por encima del 85% el sistema no tiene espacio para archivos temporales, memoria virtual ni actualizaciones. Un disco lleno impide parchear, y ahí un problema de capacidad se vuelve un problema de seguridad.',
    howItIsEvaluated:
      'Se incumple si la ocupación supera el 85%.',
    operator: 'lte',
    value: '85',
    unit: '%',
    severityOnBreach: 'medium',
    cobitObjective: 'BAI04',
    isoClause: 'A.8.6',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: null,
    rationale:
      'El 15% libre es el margen mínimo para swap, archivos temporales y la instalación de actualizaciones acumulativas.',
  },
  {
    code: 'UMB-RND-02',
    category: 'performance',
    field: 'ramUsagePercent',
    label: 'Uso máximo de memoria RAM',
    whatItMeasures:
      'El porcentaje de memoria RAM en uso al momento de la captura.',
    whyItMatters:
      'Uso sostenido por encima del 85% fuerza al sistema a usar el disco como memoria, degrada la experiencia y suele indicar que el equipo quedó por debajo de lo que necesita.',
    howItIsEvaluated:
      'Se incumple si el uso supera el 85% de forma sostenida.',
    operator: 'lte',
    value: '85',
    unit: '%',
    severityOnBreach: 'low',
    cobitObjective: 'BAI04',
    isoClause: 'A.8.6',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: null,
    rationale:
      'Indicador de capacidad, no de seguridad. Alimenta las decisiones de renovación de equipamiento (EDM04).',
  },
  {
    code: 'UMB-RND-03',
    category: 'performance',
    field: 'cpuTemperatureC',
    label: 'Temperatura máxima del procesador',
    whatItMeasures:
      'La temperatura del procesador reportada por los sensores del equipo.',
    whyItMatters:
      'Temperatura alta sostenida reduce el rendimiento por throttling y acorta la vida del hardware. Suele indicar ventilación obstruida o pasta térmica vencida.',
    howItIsEvaluated:
      'Se incumple si la temperatura supera los 85°C.',
    operator: 'lte',
    value: '85',
    unit: '°C',
    severityOnBreach: 'medium',
    cobitObjective: 'BAI09',
    isoClause: 'A.7.13',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: 'Margen sobre la temperatura máxima de unión típica',
    rationale:
      'Deja margen frente al límite térmico típico de un procesador de escritorio. Es un indicador directo de necesidad de mantenimiento preventivo (PS-HW-04).',
  },
  {
    code: 'UMB-RND-04',
    category: 'performance',
    field: 'uptimeSeconds',
    label: 'Días sin reiniciar',
    whatItMeasures:
      'Cuánto tiempo lleva el equipo encendido sin reiniciarse.',
    whyItMatters:
      'Muchos parches de seguridad recién se aplican al reiniciar. Un equipo con semanas de uptime puede aparecer como "actualizado" y no tener las correcciones activas.',
    howItIsEvaluated:
      'Se incumple si el equipo lleva más de 7 días sin reiniciarse.',
    operator: 'lte',
    value: '7',
    unit: 'días',
    severityOnBreach: 'low',
    cobitObjective: 'DSS01',
    isoClause: 'A.8.8',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: null,
    rationale:
      'Se cruza con el umbral de parches: un equipo parcheado pero sin reiniciar no está realmente protegido.',
  },

  // ══════════════════════════════════════════════════════════════
  // SOFTWARE Y LICENCIAMIENTO
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-SFW-01',
    category: 'software',
    field: 'licenseStatus',
    label: 'Software sin licencia',
    whatItMeasures:
      'Si hay programas instalados cuyo estado de licenciamiento es "sin licencia".',
    whyItMatters:
      'Además del riesgo técnico, expone a la organización a responsabilidad legal por infracción de derechos de autor. Es de los pocos hallazgos con consecuencia jurídica directa.',
    howItIsEvaluated:
      'Se incumple si existe al menos un programa marcado como sin licencia. Tolerancia cero.',
    operator: 'neq',
    value: 'unlicensed',
    unit: null,
    severityOnBreach: 'high',
    cobitObjective: 'APO10',
    isoClause: 'A.5.32',
    legalBasis: 'D. Leg. 822 — Ley sobre el Derecho de Autor (Perú)',
    sourceType: 'regulation',
    sourceReference: 'ISO/IEC 27001:2022 A.5.32 — Derechos de propiedad intelectual',
    rationale:
      'No es un umbral graduable: el uso de software sin licencia es una infracción legal, no una desviación técnica tolerable.',
  },
  {
    code: 'UMB-SFW-02',
    category: 'software',
    field: 'isWhitelisted',
    label: 'Software fuera de la lista blanca',
    whatItMeasures:
      'Si hay programas instalados que no figuran en el catálogo de software autorizado.',
    whyItMatters:
      'Software no autorizado significa que alguien instaló algo sin pasar por ningún control. Puede ser inofensivo o puede ser el vector de entrada; el problema es que nadie lo sabe.',
    howItIsEvaluated:
      'Se incumple si hay software instalado ausente de la lista blanca. Plazo de desinstalación: 15 días.',
    operator: 'is_true',
    value: null,
    unit: null,
    severityOnBreach: 'medium',
    cobitObjective: 'BAI10',
    isoClause: 'A.8.19',
    legalBasis: null,
    sourceType: 'standard',
    sourceReference: 'ISO/IEC 27001:2022 A.8.19 — Instalación de software en sistemas operativos',
    rationale:
      'Control de línea base de configuración. La lista blanca ya existe en el sistema; este umbral la convierte en política evaluable.',
  },

  // ══════════════════════════════════════════════════════════════
  // OPERACIÓN Y TRAZABILIDAD
  // ══════════════════════════════════════════════════════════════
  {
    code: 'UMB-OPE-01',
    category: 'operations',
    field: 'lastConnection',
    label: 'Días sin reportar al sistema de auditoría',
    whatItMeasures:
      'Cuántos días pasaron desde la última vez que el agente envió datos desde ese equipo.',
    whyItMatters:
      'Un equipo que no reporta es un punto ciego. No se sabe si está apagado, si le desinstalaron el agente o si dejó de existir. La cobertura del inventario es la base de toda la auditoría.',
    howItIsEvaluated:
      'Se incumple si pasaron más de 7 días sin sincronizar. Más de 30 días exige investigar la pérdida del activo.',
    operator: 'lte',
    value: '7',
    unit: 'días',
    severityOnBreach: 'medium',
    cobitObjective: 'BAI09',
    isoClause: 'A.5.9',
    legalBasis: null,
    sourceType: 'professional_judgment',
    sourceReference: null,
    rationale:
      'Sin cobertura del inventario, todos los demás indicadores quedan sesgados: se mide sólo lo que reporta, no el parque completo.',
  },
];

/**
 * MATRIZ DE SEVERIDAD
 *
 * Define qué hace que un hallazgo sea crítico, alto, medio o bajo.
 * Hasta ahora ese criterio lo aplicaba el modelo de IA por su cuenta;
 * a partir de acá es una decisión humana declarada y aprobada.
 */
export const SEVERITY_MATRIX = [
  {
    severity: 'critical',
    label: 'Crítica',
    criterion: 'Expone el equipo a compromiso inmediato.',
    examples: 'Sin antivirus · Firewall apagado · Parche crítico > 15 días · Disco en estado failed',
  },
  {
    severity: 'high',
    label: 'Alta',
    criterion: 'Control ausente o degradado, sin explotación inmediata.',
    examples: 'Definiciones vencidas · RDP habilitado · Software sin licencia · Más de 1 admin local',
  },
  {
    severity: 'medium',
    label: 'Media',
    criterion: 'Desvío de política sin riesgo directo de compromiso.',
    examples: 'Software no autorizado · Disco > 85% · Contraseña mínima < 14 caracteres',
  },
  {
    severity: 'low',
    label: 'Baja',
    criterion: 'Observación u oportunidad de mejora.',
    examples: 'Uptime > 7 días · RAM alta puntual · Complejidad de contraseña deshabilitada',
  },
] as const;
