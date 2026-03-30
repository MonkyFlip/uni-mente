/**
 * http-exception.filter.ts
 *
 * OWASP A09 — Logging and Monitoring Failures:
 * - En producción: solo mensaje genérico al cliente, sin stacktrace.
 * - En desarrollo: mensaje completo para debugging.
 * - Nunca loguear datos sensibles (passwords, tokens, MFA codes).
 */

import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProd  = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    // Para contextos REST (emergency-restore endpoint)
    if (host.getType() === 'http') {
      const ctx    = host.switchToHttp();
      const res    = ctx.getResponse<Response>();
      const req    = ctx.getRequest<Request>();

      const status = exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

      const message = exception instanceof HttpException
        ? (exception.getResponse() as any)?.message ?? exception.message
        : this.isProd ? 'Internal server error' : String(exception);

      // A09: Loguear el error internamente sin exponer al cliente
      this.logger.error(`[${req.method}] ${req.url} → ${status}: ${message}`);

      return res.status(status).json({
        statusCode: status,
        message,
        // A09: Nunca incluir stack en producción
        ...(this.isProd ? {} : { stack: exception instanceof Error ? exception.stack : undefined }),
      });
    }

    // Para contextos GraphQL — re-lanzar para que Apollo lo maneje
    throw exception;
  }
}
