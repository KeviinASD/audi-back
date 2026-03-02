// software/catalogs/license-catalog.ts
// Catálogo de referencia para determinar el estado de licencia de software
// en laboratorios de cómputo de la Escuela de Ingeniería de Sistemas - UNT.
//
// Estrategia de matching: substrings en minúsculas sobre el nombre del software.
// Agregar nuevas entradas según el inventario real del laboratorio.

import { LicenseStatus } from 'src/common/enums/license-status.enum';

// ── Software GRATUITO / Open-Source / Freeware ────────────────────────────────
// No requiere licencia comercial — marcar como LICENSED (sin riesgo de licencia)

const FREE_PATTERNS: string[] = [
  // Microsoft — runtimes y SDKs (todos gratuitos)
  'microsoft .net',
  'microsoft asp.net',
  'microsoft visual c++',
  'microsoft netstandard sdk',
  'microsoft mpi',
  'microsoft odbc driver',
  'microsoft ole db driver',
  'microsoft command line utilities',
  'microsoft system clr types',
  'microsoft testplatform',
  'microsoft update health tools',
  'microsoft asp.net diagnostic pack',
  'microsoft asp.net web tools packages',
  'clickonce bootstrapper',
  '.net for android templates',
  '.net maui',

  // Microsoft — herramientas de diagnóstico y profiling de Visual Studio
  'application verifier x64',
  'diagnosticshub_collectionservice',
  'icecap_collection',
  'intellitraceprofilerpro',

  // Microsoft — IIS Express (gratuito)
  'iis 10.0 express',
  'iis express application compatibility',

  // Microsoft — Windows SDK tools
  'kits configuration installer',

  // Microsoft — Entity Framework (open-source / gratuito)
  'entity framework',

  // Microsoft — Navegadores y herramientas de usuario
  'microsoft edge',

  // Microsoft — Power BI Desktop (gratuito)
  'microsoft power bi desktop',
  'microsoft powerbi desktop',

  // Microsoft — SQL Server ediciones gratuitas
  'microsoft sql server 2019 localdb',
  'microsoft sql server 2022 rsfx',
  'microsoft sql server reporting services',
  'explorador de sql server 2022',

  // Navegadores (gratuitos)
  'google chrome',
  'mozilla firefox',
  'brave',

  // Control de versiones (open-source)
  'git',

  // Contenedores y virtualización
  'docker desktop',

  // IDEs y editores (gratuitos)
  'android studio',
  'apache netbeans',
  'visual studio code',
  'microcode studio',

  // Ciencia de datos y ML
  'anaconda',
  'python',

  // Redes y simulación (gratuito para educación - Cisco NetAcad)
  'cisco packet tracer',

  // Modelado de procesos (edición gratuita)
  'bizagi modeler',

  // Gestión de dependencias (open-source)
  'composer - php dependency manager',

  // Java — Eclipse Adoptium / Temurin (open-source, gratuito)
  'eclipse temurin jdk',

  // Java — JDK Oracle (gratuito para uso académico y desarrollo)
  'java(tm) se development kit',
  'java(tm) se runtime',

  // Emuladores educativos (uso académico gratuito)
  'emu8086 microprocessor emulator',

  // Control educativo de aula (institucionalmente instalado — licencia institucional)
  'lanschool student',
];

// ── Software COMERCIAL que REQUIERE licencia ──────────────────────────────────
// Si no está en whitelist = riesgo de cumplimiento

const UNLICENSED_PATTERNS: string[] = [
  // IBM — todos requieren licencia comercial
  'ibm spss statistics',
  'ibm rational rose',
  'ibm rational software architect',
  'ibm software delivery platform',
  'ibm installation manager',

  // Modelado de datos (comercial)
  'erwin data modeler',

  // Modelado UML/arquitectura (comercial)
  'enterprise architect',

  // Microsoft Office — licencia institucional requerida
  'microsoft office ltsc',
  'microsoft project profesional',
  'microsoft visio ltsc',

  // Herramientas de ocultamiento (uso cuestionable en laboratorio)
  'hide folders',
];

// ── Función principal ─────────────────────────────────────────────────────────

export function checkLicenseStatus(name: string, publisher?: string | null): LicenseStatus {
  const nameLower = (name ?? '').toLowerCase();

  // Primero verificar si es software comercial que requiere licencia
  if (UNLICENSED_PATTERNS.some(p => nameLower.includes(p))) {
    return LicenseStatus.UNLICENSED;
  }

  // Luego verificar si es software gratuito conocido
  if (FREE_PATTERNS.some(p => nameLower.includes(p))) {
    return LicenseStatus.FREE;
  }

  // Publisher conocido como distribuidor de software gratuito
  const pubLower = (publisher ?? '').toLowerCase();
  const freePublishers = [
    'the git development community',
    'eclipse adoptium',
    'python software foundation',
    'anaconda, inc.',
    'docker inc.',
    'google llc',
    'cisco systems',
    'bizagi limited',
    'getcomposer.org',
  ];
  if (freePublishers.some(p => pubLower.includes(p))) {
    return LicenseStatus.FREE;
  }

  return LicenseStatus.UNKNOWN;
}
