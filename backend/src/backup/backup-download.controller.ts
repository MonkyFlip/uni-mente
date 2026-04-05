/**
 * backup-download.controller.ts
 *
 * GET /api/backup-download/:filename
 * Descarga un archivo de backup. Requiere JWT válido (solo administrador).
 *
 * Seguridad:
 *  - CWE-23 Path Traversal: allowlist + resolve() + startsWith()
 *  - OWASP A01: protegido por JwtAuthGuard + RolesGuard
 */

import {
  Controller, Get, Param, Res, UseGuards,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard }   from '../common/guards/roles.guard';
import { Roles }        from '../common/decorators/roles.decorator';
import { join, resolve, sep } from 'path';
import { existsSync, statSync, createReadStream } from 'fs';

const BACKUP_DIR     = join(process.cwd(), 'Backup');
const FILENAME_SAFE  = /^[a-zA-Z0-9_\-\.]+$/;

@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupDownloadController {
  private readonly logger = new Logger(BackupDownloadController.name);

  @Get('backup-download/:filename')
  @Roles('administrador')
  async download(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // CWE-23 Step 1: allowlist
    if (!FILENAME_SAFE.test(filename)) {
      throw new HttpException('Nombre de archivo inválido.', HttpStatus.BAD_REQUEST);
    }

    // CWE-23 Step 2: directory confinement
    const fullPath = resolve(BACKUP_DIR, filename);
    if (!fullPath.startsWith(resolve(BACKUP_DIR) + sep)) {
      this.logger.warn(`[BackupDownload] Path traversal bloqueado: ${filename}`);
      throw new HttpException('Acceso denegado.', HttpStatus.FORBIDDEN);
    }

    if (!existsSync(fullPath)) {
      throw new HttpException('Archivo no encontrado.', HttpStatus.NOT_FOUND);
    }

    const stat = statSync(fullPath);
    this.logger.log(`[BackupDownload] Descarga: ${filename} (${stat.size} bytes)`);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/octet-stream');

    createReadStream(fullPath).pipe(res);
  }
}