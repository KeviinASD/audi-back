import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configService, DatabaseConfig } from './config/env.config';
import { ConfigModule } from '@nestjs/config';
import { SeguridadModule } from './modules/seguridad/seguridad.module';
import { EquiposModule } from './modules/equipos/equipos.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import dbConfig from './config/db.config';

const config: DatabaseConfig = configService.get<DatabaseConfig>('DATABASE');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      /* Ejm de expandVariables:
        DB_NAME=example
        URL=${DB_NAME}.com # Esto se expandirá a "example.com"
      */
      expandVariables: true,
      load: [dbConfig]
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const db = dbConfig();
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          autoLoadEntities: db.autoLoadEntities,
          synchronize: db.synchronize,
        };
      }
    }),
    AuthModule,
    UsersModule,
    EquiposModule,
    SeguridadModule,
    ReportesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
