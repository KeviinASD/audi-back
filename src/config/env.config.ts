import { isBooleanString } from 'class-validator';
import { config as dotenvConfig } from 'dotenv'

// ===== TIPOS DE CONFIGURACIÓN =====
dotenvConfig();

export type HttpServer = {
    PORT: number;
    HOST: string;
    PROTOCOL: 'http' | 'https';
};

export type DatabaseConfig = {
    HOST: string;
    PORT: number;
    NAME: string;
    USER: string;
    PASSWORD: string;
    SYNCHRONIZE: boolean;
    LOGGING: boolean;
};

export type JwtConfig = {
    SECRET: string;
    EXPIRES_IN: string;
    REFRESH_SECRET?: string;
    REFRESH_EXPIRES_IN?: string;
};

export type CorsConfig = {
    ORIGIN: string[];
    METHODS: string[];
    CREDENTIALS: boolean;
};

// ===== INTERFAZ PRINCIPAL =====

export interface Env {
    NODE_ENV: 'development' | 'production' | 'test';
    SERVER: HttpServer;
    DATABASE: DatabaseConfig;
    JWT: JwtConfig;
    CORS: CorsConfig;
}

export type ConfigKey = keyof Env;

export class ConfigService {
    constructor() {
        this.LoadEnv();
    }

    private env: Env;

    /**
   * Obtiene un valor de configuración por clave
   */
    public get<T = any>(key: ConfigKey): T {
        return this.env[key] as T;
    }

    /**
   * Verifica si estamos en producción
   */
    public isProduction(): boolean {
        return this.env.NODE_ENV === 'production';
    }

    /**
     * Verifica si estamos en desarrollo
     */
    public isDevelopment(): boolean {
        return this.env.NODE_ENV === 'development';
    }

    /**
     * Obtiene la URL completa del servidor
     */
    public getServerUrl(): string {
        const { PROTOCOL, HOST, PORT } = this.env.SERVER;
        return `${PROTOCOL}://${HOST}:${PORT}`;
    }

    /**
     * Carga las variables de entorno desde el archivo .env 
    */
    private LoadEnv(): void {
        this.env = this.processEnv();
        this.validateRequired();
    }

    /**
    * Procesa y transforma las variables de entorno
    */
    private processEnv(): Env {
        return {
            NODE_ENV: (process.env.NODE_ENV as any) || 'development',

            SERVER: {
                PORT: this.parseNumber(process.env.PORT, 3000),
                HOST: process.env.HOST || 'localhost',
                PROTOCOL: (process.env.PROTOCOL as 'http' | 'https') || 'http',
            },

            DATABASE: {
                HOST: process.env.DATABASE_HOST || 'localhost',
                PORT: this.parseNumber(process.env.DATABASE_PORT, 5432),
                NAME: process.env.DATABASE_NAME || 'myapp',
                USER: process.env.DATABASE_USER || 'postgres',
                PASSWORD: process.env.DATABASE_PASSWORD || '',
                SYNCHRONIZE: this.parseBoolean(process.env.DATABASE_SYNCHRONIZE, false),
                LOGGING: this.parseBoolean(process.env.DATABASE_LOGGING, false),
            },

            JWT: {
                SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
                EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2d',
            },

            CORS: {
                ORIGIN: this.parseArray(process.env.CORS_ORIGIN, ['http://localhost:3000']),
                METHODS: this.parseArray(process.env.CORS_METHODS, ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
                CREDENTIALS: this.parseBoolean(process.env.CORS_CREDENTIALS, true),
            }
        }
    }

    /**
   * Valida que las variables requeridas estén presentes
   */

    private validateRequired(): void {
        const required = [
            'JWT_SECRET',
            'DATABASE_HOST',
            'DATABASE_NAME',
            'DATABASE_USER',
            'DATABASE_PASSWORD'
        ];

        // Validaciones adicionales
        if (this.isProduction() && this.env.JWT.SECRET === 'fallback-secret-change-in-production') {
            throw new Error('JWT_SECRET must be set in production');
        }

        if (this.env.JWT.SECRET.length < 32) {
            console.warn('⚠️  JWT_SECRET should be at least 32 characters long for better security');
        }
    }


    // ===== UTILIDADES PRIVADAS =====
    private parseNumber(value: string | undefined, defaultValue: number): number {
        if (!value) return defaultValue;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
        if (!value) return defaultValue;
        return isBooleanString(value) ? value === 'true' : defaultValue;
    }

    private parseArray(value: string | undefined, defaultValue: string[]): string[] {
        if (!value) return defaultValue;
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }
}

// ===== INSTANCIA SINGLETON =====

export const configService = new ConfigService();

// ===== HELPERS PARA USO FÁCIL =====
export const config = {
  isDev: () => configService.isDevelopment(),
  isProd: () => configService.isProduction(),
  port: () => configService.get<HttpServer>('SERVER').PORT,
  serverUrl: () => configService.getServerUrl(),
  
  server: () => configService.get<HttpServer>('SERVER'),
  database: () => configService.get<DatabaseConfig>('DATABASE'),
  jwt: () => configService.get<JwtConfig>('JWT'),
  cors: () => configService.get<CorsConfig>('CORS'),
};
