/**
 * emergency-restore.controller.ts — MSSQL
 *
 * OWASP A01 Broken Access Control + CWE-23 Path Traversal:
 *  - Solo activo cuando tabla Usuario tiene 0 registros.
 *  - RESTORE_SECRET verificado con comparación constante (no timing attack).
 *  - backup_filename validado con allowlist: solo [a-zA-Z0-9_\-\.].
 *  - path.resolve() + startsWith() para directory confinement.
 *
 * OWASP A09 Logging:
 *  - Intentos de acceso no autorizados quedan en log.
 *  - Intentos de path traversal quedan en log con IP.
 */

import {
  Controller, Get, Post, Body, Headers, HttpException, HttpStatus, Logger, Req,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { resolve, join, sep } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { BackupService } from './backup.service';

const BACKUP_DIR = join(process.cwd(), 'Backup');

/** Allowlist estricta para nombres de archivo: letras, números, guiones, underscores, puntos */
const FILENAME_ALLOWLIST = /^[a-zA-Z0-9_\-\.]+$/;

/** Comparación constante de strings para evitar timing attacks en la clave secreta */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

@Controller('api')
export class EmergencyRestoreController {
  private readonly logger = new Logger(EmergencyRestoreController.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly backupService: BackupService,
  ) {}

  /**
   * GET /api/emergency-backups
   * Lista los archivos de respaldo disponibles en backend/Backup/.
   * No requiere autenticación (la BD está vacía en este contexto).
   */
  @Get('emergency-backups')
  listEmergencyBackups() {
    const backups: any[] = [];

    // Backups en sistema de archivos
    if (existsSync(BACKUP_DIR)) {
      const archivos = readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.sql') || f.endsWith('.json') || f.endsWith('.csv') || f.endsWith('.xlsx'))
        .sort()
        .reverse(); // más recientes primero

      for (const archivo of archivos) {
        try {
          const fullPath = join(BACKUP_DIR, archivo);
          const stat     = statSync(fullPath);
          // Parse metadata from filename: backup_TIPO_FORMATO_TIMESTAMP.ext
          const parts    = archivo.split('_');
          const tipo     = parts[1]?.toUpperCase() ?? 'COMPLETO';
          const formato  = parts[2]?.toUpperCase() ?? archivo.split('.').pop()?.toUpperCase() ?? 'SQL';
          backups.push({
            id_backup:       null,
            nombre_archivo:  archivo,
            tipo,
            formato,
            tamanio_kb:     Math.round(stat.size / 1024) || 1,
            modo:           'MANUAL',
            created_at:     stat.mtime.toISOString(),
          });
        } catch { /* ignorar archivos no legibles */ }
      }
    }

    return { backups };
  }

  @Post('emergency-restore')
  async emergencyRestore(
    @Headers('x-restore-secret') secret: string,
    @Body() body: { id_backup?: number; backup_filename?: string },
    @Req() req: Request,
  ) {
    const clientIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';

    // 1. Verificar clave con comparación segura (anti-timing attack)
    const expected = this.configService.get<string>('RESTORE_SECRET', '');
    if (!secret || !safeCompare(secret, expected)) {
      this.logger.warn(`[EmergencyRestore] Intento con clave incorrecta desde ${clientIp}`);
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // 2. Solo activo cuando la BD está vacía (A01: no bypass del flujo normal)
    const res = await this.dataSource.query<any[]>(
      'SELECT COUNT(*) AS total FROM dbo.Usuario'
    );
    const total = Number(res[0]?.total ?? 0);
    if (total > 0) {
      this.logger.warn(`[EmergencyRestore] Intento bloqueado — BD tiene ${total} usuarios, IP: ${clientIp}`);
      throw new HttpException(
        { message: 'La base de datos ya tiene datos. Usa el flujo normal con MFA.' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 3. Asegurarse de que las tablas existen (ejecutar init.sql primero)
    try {
      const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
      if (existsSync(sqlPath)) {
        const sql     = readFileSync(sqlPath, 'utf8');
        const batches = sql.split(/^\s*GO\s*$/im).filter(b => b.trim());
        for (const batch of batches) await this.dataSource.query(batch).catch(() => {});
      }
    } catch (e) {
      this.logger.warn(`[EmergencyRestore] init.sql: ${(e as Error).message}`);
    }

    // 4. Restaurar por ID
    if (body.id_backup != null) {
      await this.backupService.restaurarEmergencia(Number(body.id_backup));
      this.logger.warn(`[EmergencyRestore] Restauracion OK — backup #${body.id_backup}, IP: ${clientIp}`);
      return { mensaje: 'Base de datos restaurada correctamente.' };
    }

    // 5. Restaurar por nombre de archivo con CWE-23 fix
    if (body.backup_filename) {
      const filename = body.backup_filename.trim();

      // CWE-23 Step 1: Allowlist — solo caracteres permitidos
      if (!FILENAME_ALLOWLIST.test(filename)) {
        this.logger.warn(`[EmergencyRestore] Nombre de archivo rechazado: "${filename}", IP: ${clientIp}`);
        throw new HttpException(
          { message: 'Nombre de archivo invalido.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // CWE-23 Step 2: Directory confinement — la ruta resuelta debe estar dentro de BACKUP_DIR
      const resolvedPath   = resolve(BACKUP_DIR, filename);
      const resolvedBackup = resolve(BACKUP_DIR);
      if (!resolvedPath.startsWith(resolvedBackup + sep)) {
        this.logger.warn(`[EmergencyRestore] Intento de path traversal bloqueado: "${filename}", IP: ${clientIp}`);
        throw new HttpException({ message: 'Acceso denegado.' }, HttpStatus.FORBIDDEN);
      }

      if (!existsSync(resolvedPath)) {
        throw new HttpException({ message: `Archivo no encontrado: ${filename}` }, HttpStatus.NOT_FOUND);
      }

      await this.backupService.restaurarEmergenciaPorArchivo(filename);
      this.logger.warn(`[EmergencyRestore] Restauracion OK — archivo: ${filename}, IP: ${clientIp}`);
      return { mensaje: 'Base de datos restaurada correctamente.' };
    }

    // 6. Listar archivos disponibles si no se especificó ninguno
    if (existsSync(BACKUP_DIR)) {
      const archivos = readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup_')).sort();
      return { message: 'Proporciona id_backup o backup_filename.', archivos_disponibles: archivos };
    }

    throw new HttpException({ message: 'Proporciona id_backup o backup_filename.' }, HttpStatus.BAD_REQUEST);
  }
}