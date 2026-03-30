/**
 * main.ts — Bootstrap de UniMente Backend (MSSQL)
 *
 * OWASP Top 10 mitigations aplicadas aquí:
 *  A05 Security Misconfiguration → Helmet (cabeceras HTTP seguras)
 *  A05 Security Misconfiguration → CORS restrictivo (whitelist de orígenes)
 *  A03 Injection              → ValidationPipe global (whitelist + transform)
 *  A07 Auth Failures          → ThrottlerGuard global (rate limiting)
 *  A09 Logging Failures       → HttpExceptionFilter sin stacktrace en producción
 */

import { NestFactory }         from '@nestjs/core';
import { ValidationPipe }      from '@nestjs/common';
import { AppModule }           from './app.module';
import helmet                  from 'helmet';
import { HttpExceptionFilter }  from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // A09: Nunca exponer stack traces en logs de producción
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['error', 'warn', 'log', 'debug'],
  });

  // ─── A05: Seguridad en cabeceras HTTP (OWASP) ─────────────────────────────
  // Helmet configura: Content-Security-Policy, HSTS, X-Frame-Options,
  // X-Content-Type-Options, Referrer-Policy, etc.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc:     ["'self'"],
          scriptSrc:      ["'self'", "'unsafe-inline'"],  // Apollo Sandbox necesita inline
          styleSrc:       ["'self'", "'unsafe-inline'"],
          imgSrc:         ["'self'", 'data:'],
          connectSrc:     ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // necesario para Apollo Sandbox
    }),
  );

  // ─── A05: CORS restrictivo ────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(o => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (ej. Postman en dev) o en lista blanca
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin "${origin}" not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-restore-secret'],
  });

  // ─── A03: Validación global de inputs ────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,   // elimina campos no declarados en el DTO
      forbidNonWhitelisted: false,  // GraphQL añade campos propios
      transform:            true,   // coerce tipos automáticamente
      stopAtFirstError:     true,
    }),
  );

  // ─── A09: Filtro global de excepciones (no expone stacktrace) ─────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`\nUniMente Backend corriendo en http://localhost:${port}/graphql\n`);
}

bootstrap();
