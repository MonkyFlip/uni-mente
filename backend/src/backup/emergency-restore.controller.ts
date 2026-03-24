import {
  Controller, Post, Get, Param, Res,
  Body, Headers,
  BadRequestException, UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { BackupService } from '../backup/backup.service';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import * as mysql2 from 'mysql2/promise';

const BACKUP_DIR = join(process.cwd(), 'Backup');

/**
 * Restauración de emergencia.
 * Funciona incluso cuando la BD o sus tablas NO existen.
 *
 * GET  /api/emergency-backups  — lista backups disponibles (sin JWT)
 * POST /api/emergency-restore  — restaura la BD (requiere X-Restore-Secret)
 *
 * Protocolo completo:
 *   1. Crea la BD y las tablas con init.sql si no existen
 *   2. Verifica que la tabla Usuario tiene 0 registros (o no existe)
 *   3. Valida X-Restore-Secret contra .env
 *   4. Restaura el backup seleccionado
 */
@Controller('api')
export class EmergencyRestoreController {
  private readonly logger = new Logger(EmergencyRestoreController.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly configService: ConfigService,
  ) {}

  // ── GET /api/emergency-backups ────────────────────────────────
  @Get('emergency-backups')
  async listarBackupsEmergencia() {
    if (!existsSync(BACKUP_DIR)) return { backups: [] };

    const archivos = readdirSync(BACKUP_DIR).filter(f =>
      f.startsWith('backup_') &&
      /\.(sql|json|xlsx|csv)$/.test(f)
    );

    // Intentar leer registros de Backup_Log — puede fallar si la BD no existe
    let registros: any[] = [];
    try {
      const conn = await this.getConn(true); // conectar CON la BD
      try {
        const [rows] = await conn.query('SELECT * FROM Backup_Log ORDER BY created_at DESC LIMIT 10');
        registros = rows as any[];
      } finally {
        await conn.end();
      }
    } catch { /* BD vacía / no existe — continuar solo con filesystem */ }

    const backups = archivos.map(archivo => {
      const fp     = join(BACKUP_DIR, archivo);
      const stat   = statSync(fp);
      const kb     = Math.ceil(stat.size / 1024);
      const reg    = registros.find(r => r.nombre_archivo === archivo);
      const partes = archivo.replace(/\.\w+$/, '').split('_');
      const tipo   = partes[1] ?? 'DESCONOCIDO';
      const ext    = archivo.split('.').pop()?.toUpperCase() ?? '';
      const formato = ext === 'XLSX' ? 'EXCEL' : ext;

      return {
        id_backup:      reg?.id_backup ?? null,
        nombre_archivo: archivo,
        tipo,
        formato,
        tamanio_kb:     kb,
        modo:           reg?.modo ?? 'DESCONOCIDO',
        created_at:     reg?.created_at ?? stat.mtime,
      };
    });

    backups.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { backups: backups.slice(0, 3) };
  }

  // ── GET /api/backup-download/:filename ───────────────────────
  /**
   * Descarga un archivo de backup directamente.
   * Requiere JWT del admin en el header Authorization.
   *
   * SECURITY — OWASP A01/CWE-23 Path Traversal:
   *   Se aplica una lista blanca estricta (allowlist) de nombres de archivo válidos:
   *   - Solo se aceptan nombres que coincidan con el patrón de backups generados
   *     por el sistema: backup_TIPO_FECHA.ext
   *   - Se resuelve la ruta final con path.resolve y se verifica que el archivo
   *     resultante esté dentro de BACKUP_DIR (confinamiento de directorio)
   *   - Solo se permiten extensiones conocidas: sql, json, xlsx, csv
   *   - Se rechaza cualquier intento de traversal (../, %2F, null bytes, etc.)
   */
  @Get('backup-download/*path')
  async descargarBackup(
    @Param('path') rawPath: any,
    @Res() res: Response,
    @Headers('authorization') _auth: string,
  ) {
    // ── 1. Normalizar parámetro ───────────────────────────────────
    // Con wildcard /*path, NestJS puede entregar objeto o string
    const raw = typeof rawPath === 'object'
      ? Object.values(rawPath).join('/')
      : String(rawPath ?? '');

    // ── 2. Allowlist — solo nombres con el patrón conocido del sistema ──
    // Formato: backup_TIPO_DD-MM-YYYY_HH-MMam.ext
    // OWASP: Input Validation — rechazar todo lo que no cumpla el patrón
    const ALLOWED_PATTERN = /^backup_[A-Z]+_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}(?:am|pm)\.(sql|json|xlsx|csv)$/i;
    if (!ALLOWED_PATTERN.test(raw)) {
      this.logger.warn(`Intento de descarga con nombre inválido: "${raw}"`);
      throw new BadRequestException('Nombre de archivo inválido.');
    }

    // ── 3. Confinamiento de directorio (directory confinement) ────
    // Resolver la ruta absoluta y verificar que esté dentro de BACKUP_DIR
    // Esto bloquea cualquier secuencia ../ que haya sobrevivido la validación anterior
    const { resolve }         = await import('path');
    const { createReadStream } = await import('fs');

    const resolvedPath = resolve(BACKUP_DIR, raw);
    if (!resolvedPath.startsWith(BACKUP_DIR + require('path').sep) &&
        resolvedPath !== BACKUP_DIR) {
      this.logger.warn(`Intento de path traversal bloqueado: "${raw}" → "${resolvedPath}"`);
      throw new BadRequestException('Acceso denegado.');
    }

    // ── 4. Verificar existencia del archivo ───────────────────────
    if (!existsSync(resolvedPath)) {
      throw new BadRequestException(`Archivo no encontrado: ${raw}`);
    }

    // ── 5. Content-Type por extensión (solo extensiones conocidas) ─
    const ext = raw.split('.').pop()?.toLowerCase() ?? '';
    const MIME_MAP: Record<string, string> = {
      sql:  'application/sql',
      json: 'application/json',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv:  'text/csv',
    };
    const mime = MIME_MAP[ext] ?? 'application/octet-stream';

    // ── 6. Streaming seguro ───────────────────────────────────────
    // Content-Disposition usa el nombre ya validado (solo caracteres seguros)
    const stream = createReadStream(resolvedPath);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${raw}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(res as any);
  }

    // ── POST /api/emergency-restore ───────────────────────────────
  @Post('emergency-restore')
  async emergencyRestore(
    @Headers('x-restore-secret') secret: string,
    @Body('id_backup')        id_backup:        number,
    @Body('backup_filename')  backup_filename:  string,
  ) {
    // ── 1. Validar clave secreta ──────────────────────────────────
    const restoreSecret = this.configService.get<string>('RESTORE_SECRET', '');
    if (!restoreSecret || restoreSecret.length < 8) {
      throw new BadRequestException(
        'RESTORE_SECRET no está configurado en el .env del servidor (mínimo 8 caracteres).',
      );
    }
    if (!secret || secret !== restoreSecret) {
      this.logger.warn('Intento de restauración de emergencia con clave incorrecta');
      throw new UnauthorizedException('Clave de restauración incorrecta.');
    }

    // ── 2. Validar que se indicó qué restaurar ────────────────────
    if (!id_backup && !backup_filename) {
      throw new BadRequestException('Proporciona id_backup o backup_filename.');
    }

    // ── 3. Crear BD y tablas si no existen (init.sql) ─────────────
    this.logger.warn('RESTAURACIÓN DE EMERGENCIA — ejecutando init.sql...');
    try {
      const connInit = await this.getConn(false); // sin BD
      try {
        const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
        const sql     = readFileSync(sqlPath, 'utf8');
        await connInit.query(sql);
        this.logger.warn('init.sql ejecutado — BD y tablas creadas/verificadas.');
      } finally {
        await connInit.end();
      }
    } catch (e) {
      throw new BadRequestException(`Error al inicializar la BD: ${e.message}`);
    }

    // ── 4. Verificar que Usuario está vacía ───────────────────────
    try {
      const conn = await this.getConn(true);
      try {
        const [[{ total }]] = await conn.query<any>(
          'SELECT COUNT(*) AS total FROM Usuario',
        );
        if (Number(total) > 0) {
          throw new UnauthorizedException(
            'La restauración de emergencia solo está disponible cuando la base de datos está vacía. ' +
            'Usa el flujo normal desde /admin/backup con tu código MFA.',
          );
        }
      } finally {
        await conn.end();
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new BadRequestException(`Error al verificar el estado de la BD: ${e.message}`);
    }

    // ── 5. Restaurar ──────────────────────────────────────────────
    this.logger.warn(
      `RESTAURACIÓN DE EMERGENCIA — backup: ${id_backup ?? backup_filename}`,
    );
    try {
      if (id_backup) {
        await this.backupService.restaurarEmergencia(Number(id_backup));
      } else {
        await this.backupService.restaurarEmergenciaPorArchivo(backup_filename);
      }
      this.logger.warn('RESTAURACIÓN DE EMERGENCIA completada.');
      return {
        ok: true,
        mensaje: 'Base de datos restaurada correctamente. Ya puedes iniciar sesión.',
      };
    } catch (e) {
      this.logger.error('Error en restauración de emergencia:', e.message);
      throw new BadRequestException(`Error al restaurar: ${e.message}`);
    }
  }

  // ── Helper: conexión MySQL ────────────────────────────────────
  private async getConn(withDatabase: boolean): Promise<mysql2.Connection> {
    const cfg: mysql2.ConnectionOptions = {
      host:               this.configService.get('DB_HOST',     'localhost'),
      port:               +this.configService.get('DB_PORT',    3306),
      user:               this.configService.get('DB_USER',     'root'),
      password:           this.configService.get('DB_PASSWORD', ''),
      multipleStatements: true,
    };
    if (withDatabase) cfg.database = this.configService.get('DB_NAME', 'unimente');
    return mysql2.createConnection(cfg);
  }
}