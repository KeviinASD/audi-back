export enum LicenseStatus {
  FREE       = 'free',        // Software gratuito / open-source — no requiere licencia comercial
  LICENSED   = 'licensed',   // Software comercial con licencia institucional verificada
  UNLICENSED = 'unlicensed', // Software comercial sin licencia — riesgo de cumplimiento
  UNKNOWN    = 'unknown',    // No reconocido en el catálogo
}
