import {
  Controller, Post, Get, Body, Headers,
  BadRequestException, UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BackupService } from '../backup/backup.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = join(process.cwd(), 'Backup');

/**
 * Restauración de emergencia — endpoint REST exclusivo para cuando
 * la base de datos está vacía o fue eliminada accidentalmente.
 *
 * POST /api/emergency-restore
 *
 * Condiciones de activación (TODAS deben cumplirse):
 *   1. La tabla Usuario tiene 0 registros (BD vacía / recién restaurada)
 *   2. El header X-Restore-Secret coincide con RESTORE_SECRET en .env
 *   3. Se envía el id del backup a restaurar
 *
 * Una vez restaurada la BD, el endpoint vuelve a ser inaccesible
 * porque habrá usuarios y el sistema normal toma el control.
 */
@Controller('api')
export class EmergencyRestoreController {
  private readonly logger = new Logger(EmergencyRestoreController.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly backupService: BackupService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Lista los backups disponibles en la carpeta Backup/.
   * Público — no requiere JWT ni clave secreta.
   * Útil para la página de restauración de emergencia.
   */
  @Get('emergency-backups')
  async listarBackupsEmergencia() {
    if (!existsSync(BACKUP_DIR)) {
      return { backups: [] };
    }

    // Leer archivos del directorio
    const archivos = readdirSync(BACKUP_DIR).filter(f =>
      f.startsWith('backup_') &&
      (f.endsWith('.sql') || f.endsWith('.json') || f.endsWith('.xlsx') || f.endsWith('.csv'))
    );

    // Intentar leer también los registros de Backup_Log si la BD tiene datos
    let registros: any[] = [];
    try {
      const [[{ total }]] = await this.dataSource.query<any>('SELECT COUNT(*) AS total FROM Backup_Log');
      if (Number(total) > 0) {
        registros = await this.dataSource.query('SELECT * FROM Backup_Log ORDER BY created_at DESC LIMIT 10');
      }
    } catch { /* BD vacía o tabla no existe — ignorar */ }

    // Combinar info del filesystem con registros de BD
    const backups = archivos.map(archivo => {
      const fp   = join(BACKUP_DIR, archivo);
      const stat = statSync(fp);
      const kb   = Math.ceil(stat.size / 1024);

      // Buscar registro coincidente en BD
      const reg  = registros.find(r => r.nombre_archivo === archivo);

      // Parsear tipo y formato del nombre del archivo
      const partes = archivo.replace(/\.\w+$/, '').split('_');
      const tipo   = partes[1] ?? 'DESCONOCIDO';

      // Determinar formato por extensión
      const ext = archivo.split('.').pop()?.toUpperCase() ?? '';
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

    // Ordenar por fecha más reciente primero
    backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { backups: backups.slice(0, 3) };
  }

    @Post('emergency-restore')
  async emergencyRestore(
    @Headers('x-restore-secret') secret: string,
    @Body('id_backup') id_backup: number,
    @Body('backup_filename') backup_filename: string,
  ) {
    // ── 1. Verificar que la BD está realmente vacía ───────────────
    const [[{ total }]] = await this.dataSource.query<any>(
      'SELECT COUNT(*) AS total FROM Usuario',
    );
    if (Number(total) > 0) {
      throw new UnauthorizedException(
        'La restauración de emergencia solo está disponible cuando la base de datos está vacía. ' +
        'Si la BD tiene usuarios, usa el flujo normal desde /admin/backup con MFA.',
      );
    }

    // ── 2. Verificar la clave secreta del .env ────────────────────
    const restoreSecret = this.configService.get<string>('RESTORE_SECRET', '');
    if (!restoreSecret || restoreSecret.length < 16) {
      throw new BadRequestException(
        'RESTORE_SECRET no está configurado en el servidor. Agrega una clave de al menos 16 caracteres en el archivo .env.',
      );
    }
    if (!secret || secret !== restoreSecret) {
      this.logger.warn('Intento de restauración de emergencia con clave incorrecta');
      throw new UnauthorizedException(
        'Clave de restauración incorrecta. Revisa el valor de RESTORE_SECRET en el archivo .env del servidor.',
      );
    }

    // ── 3. Validar que se proporcionó identificación del backup ───
    if (!id_backup && !backup_filename) {
      throw new BadRequestException(
        'Proporciona id_backup (número) o backup_filename (nombre del archivo).',
      );
    }

    // ── 4. Restaurar ──────────────────────────────────────────────
    this.logger.warn(
      `RESTAURACIÓN DE EMERGENCIA iniciada — backup: ${id_backup ?? backup_filename}`,
    );

    try {
      if (id_backup) {
        // Restaurar por ID de registro en Backup_Log
        await this.backupService.restaurarEmergencia(id_backup);
      } else {
        // Restaurar directamente por nombre de archivo en Backup/
        await this.backupService.restaurarEmergenciaPorArchivo(backup_filename);
      }

      this.logger.warn('RESTAURACIÓN DE EMERGENCIA completada exitosamente');
      return {
        ok: true,
        mensaje: 'Base de datos restaurada. Ya puedes iniciar sesión normalmente.',
      };
    } catch (e) {
      this.logger.error('Error en restauración de emergencia:', e.message);
      throw new BadRequestException(`Error al restaurar: ${e.message}`);
    }
  }
}