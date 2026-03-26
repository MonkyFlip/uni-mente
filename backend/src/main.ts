import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Body limits
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // ✅ CORS CORRECTO PARA AMPLIFY + APOLLO
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://prod.d1mrcwf1ifucba.amplifyapp.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Apollo-Require-Preflight',
    ],
  });

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ⚠️ IMPORTANTE: Railway asigna el puerto
  await app.listen(process.env.PORT || 3000);

  console.log(
    `UniMente Backend corriendo en ${process.env.PORT || 3000}`,
  );
}

bootstrap();
