import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('CORS');

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.error(`Blocked CORS request from disallowed origin: ${origin}`);
        callback(null, false); // Rechaza sin lanzar error
      }
    },
    credentials: true,
  })
  // Aumentar límite de body
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  /* Configurando Swagger */
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API documentation for the application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3030;
  await app.listen(port);
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  Logger.log(`Application is running on: ${appUrl}`);
  Logger.log(`Documentation available at: ${appUrl}/api`);
}
bootstrap();
