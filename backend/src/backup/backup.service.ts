/**
 * backup.service.ts — MSSQL
 *
 * Diferencias clave vs MySQL:
 *  - TRUNCATE TABLE → TRUNCATE TABLE (mismo, pero sin FK_CHECKS)
 *  - Deshabilitar FK:  ALTER TABLE ... NOCHECK CONSTRAINT ALL
 *  - REPLACE INTO  → MERGE INTO ... WHEN MATCHED THEN UPDATE
 *  - INSERT IGNORE → IF NOT EXISTS INSERT
 *  - Backtick `x`  → corchete [x]
 *  - Generación SQL: INSERT vs MERGE según tipo de backup
 */

import {
  Injectable, NotFoundException, Logger, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  existsSync, mkdirSync, writeFileSync, readFileSync,
  unlinkSync, statSync, readdirSync,
} from 'fs';
import { join } from 'path';
import * as mssql    from 'mssql';
import * as ExcelJS  from 'exceljs';
import { BackupLog }    from './entities/backup-log.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { MfaService }   from '../mfa/mfa.service';
import { CreateBackupInput, RestaurarBackupInput, ConfigBackupAutoInput } from './dto/backup.dto';

const BACKUP_DIR  = join(process.cwd(), 'Backup');
const MAX_BACKUPS = 3;

const TABLES = [
  'Rol','Usuario','Estudiante','Psicologo',
  'Horario_Psicologo','Cita','Sesion',
  'Historial_Clinico','Detalle_Historial',
];

const TS_COL: Record<string, string | null> = {
  Rol: null, Usuario: 'created_at', Estudiante: null, Psicologo: null,
  Horario_Psicologo: null, Cita: 'created_at', Sesion: 'fecha_registro',
  Historial_Clinico: 'fecha_apertura', Detalle_Historial: 'fecha_registro',
};

/** Columnas IDENTITY por tabla (para SET IDENTITY_INSERT) */
const IDENTITY_TABLES = new Set(['Rol','Usuario','Estudiante','Psicologo',
  'Horario_Psicologo','Cita','Sesion','Historial_Clinico','Detalle_Historial']);

/** Serializa valor para T-SQL */
function toSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString().slice(0,19).replace('T',' ')}'`;
  // A03: escapar comillas simples — NO usar interpolación de strings con datos de usuario
  return `'${String(val).replace(/'/g, "''")}'`;
}

function toCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const s = val instanceof Date
    ? val.toISOString().slice(0,19).replace('T',' ')
    : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildFilename(tipo: string, formato: string): string {
  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
  const ext = formato === 'EXCEL' ? 'xlsx' : formato.toLowerCase();
  return `backup_${tipo}_${ts}.${ext}`;
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @InjectRepository(BackupLog)    private readonly logRepo:    Repository<BackupLog>,
    @InjectRepository(BackupConfig) private readonly configRepo: Repository<BackupConfig>,
    private readonly dataSource:    DataSource,
    private readonly configService: ConfigService,
    private readonly mfaService:    MfaService,
  ) {}

  onModuleInit() {
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
      this.logger.log(`Carpeta Backup/ creada en ${BACKUP_DIR}`);
    }
    this.syncFilesystemToLog().catch(() => {});
  }

  private async syncFilesystemToLog(): Promise<void> {
    try {
      if (await this.logRepo.count() > 0) return;
      if (!existsSync(BACKUP_DIR)) return;
      for (const filename of readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup_')).slice(0, MAX_BACKUPS)) {
        const stat   = statSync(join(BACKUP_DIR, filename));
        const partes = filename.replace(/\.\w+$/, '').split('_');
        const tipo   = partes[1] ?? 'COMPLETO';
        const ext    = filename.split('.').pop()?.toUpperCase() ?? 'SQL';
        await this.logRepo.save(this.logRepo.create({
          tipo, formato: ext === 'XLSX' ? 'EXCEL' : ext,
          nombre_archivo: filename, tamanio_kb: Math.ceil(stat.size / 1024), modo: 'MANUAL',
        }));
      }
    } catch { /* ignorar */ }
  }

  // ─── API pública ────────────────────────────────────────────────────────────

  async crearBackup(input: CreateBackupInput, id_usuario: number): Promise<BackupLog> {
    await this.mfaService.requireMfa(id_usuario, input.codigo_mfa);
    return this.ejecutarBackup(input.tipo, input.formato, 'MANUAL');
  }

  async restaurarBackup(input: RestaurarBackupInput, id_usuario: number): Promise<boolean> {
    await this.mfaService.requireMfa(id_usuario, input.codigo_mfa);
    const reg = await this.logRepo.findOneBy({ id_backup: input.id_backup });
    if (!reg) throw new NotFoundException(`Backup #${input.id_backup} no encontrado.`);
    const fp = join(BACKUP_DIR, reg.nombre_archivo);
    if (!existsSync(fp)) throw new NotFoundException(`Archivo no existe: ${reg.nombre_archivo}`);
    await this.restaurarArchivo(fp, reg.formato, reg.tipo);
    await this.syncFilesystemToLog();
    return true;
  }

  async configurarAutomatico(input: ConfigBackupAutoInput, id_usuario: number): Promise<BackupConfig> {
    await this.mfaService.requireMfa(id_usuario, input.codigo_mfa);
    let config = await this.configRepo.findOne({ where: {} });
    if (!config) config = this.configRepo.create();
    Object.assign(config, { tipo: input.tipo, formato: input.formato, frecuencia_horas: input.frecuencia_horas, activo: true, ultima_ejecucion: new Date() });
    const guardado = await this.configRepo.save(config);
    await this.ejecutarBackup(input.tipo, input.formato, 'AUTOMATICO');
    return guardado;
  }

  async listarBackups(): Promise<BackupLog[]> {
    let logs = await this.logRepo.find({ order: { created_at: 'DESC' } });
    if (!logs.length) { await this.syncFilesystemToLog(); logs = await this.logRepo.find({ order: { created_at: 'DESC' } }); }
    return logs;
  }

  async obtenerConfig(): Promise<BackupConfig | null> { return this.configRepo.findOne({ where: {} }); }

  async restaurarEmergencia(id_backup: number): Promise<void> {
    const reg = await this.logRepo.findOneBy({ id_backup });
    if (!reg) throw new NotFoundException(`Backup #${id_backup} no encontrado.`);
    const fp = join(BACKUP_DIR, reg.nombre_archivo);
    if (!existsSync(fp)) throw new NotFoundException(`Archivo no existe: ${reg.nombre_archivo}`);
    await this.restaurarArchivo(fp, reg.formato, reg.tipo);
  }

  async restaurarEmergenciaPorArchivo(nombre_archivo: string): Promise<void> {
    const fp  = join(BACKUP_DIR, nombre_archivo);
    if (!existsSync(fp)) throw new NotFoundException(`Archivo no existe: ${nombre_archivo}`);
    const ext    = nombre_archivo.split('.').pop()?.toUpperCase() ?? 'SQL';
    const formato = ext === 'XLSX' ? 'EXCEL' : ext;
    const tipo    = nombre_archivo.replace(/\.\w+$/, '').split('_')[1] ?? 'COMPLETO';
    await this.restaurarArchivo(fp, formato, tipo);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAutoBackup() {
    const config = await this.configRepo.findOne({ where: { activo: true } });
    if (!config) return;
    const ms = Date.now() - (config.ultima_ejecucion ?? new Date(0)).getTime();
    if (ms >= config.frecuencia_horas * 3_600_000) {
      try {
        await this.ejecutarBackup(config.tipo, config.formato, 'AUTOMATICO');
        config.ultima_ejecucion = new Date();
        await this.configRepo.save(config);
      } catch (e) { this.logger.error('Error backup automatico:', e.message); }
    }
  }

  // ─── Lógica interna ─────────────────────────────────────────────────────────

  private async ejecutarBackup(tipo: string, formato: string, modo: string): Promise<BackupLog> {
    const sinceDate = await this.getRefDate(tipo);
    const data      = await this.fetchAllData(sinceDate);
    const filename  = buildFilename(tipo, formato);
    const filePath  = join(BACKUP_DIR, filename);
    await this.escribirArchivo(data, formato, filePath, tipo);
    const registro = this.logRepo.create({
      tipo, formato, nombre_archivo: filename,
      tamanio_kb: Math.ceil(statSync(filePath).size / 1024), modo,
    });
    const guardado = await this.logRepo.save(registro);
    await this.pruneBackups();
    return guardado;
  }

  private async getRefDate(tipo: string): Promise<Date | null> {
    if (tipo === 'COMPLETO') return null;
    if (tipo === 'DIFERENCIAL') {
      const u = await this.logRepo.findOne({ where: { tipo: 'COMPLETO' }, order: { created_at: 'DESC' } });
      return u?.created_at ?? null;
    }
    const u = await this.logRepo.findOne({ order: { created_at: 'DESC' } });
    return u?.created_at ?? null;
  }

  private async fetchAllData(sinceDate: Date | null): Promise<Record<string,any[]>> {
    const data: Record<string,any[]> = {};
    for (const t of TABLES) {
      const tsCol = TS_COL[t];
      // A03: query parametrizada para la fecha
      data[t] = sinceDate && tsCol
        ? await this.dataSource.query(`SELECT * FROM [dbo].[${t}] WHERE [${tsCol}] > @0`, [sinceDate])
        : await this.dataSource.query(`SELECT * FROM [dbo].[${t}]`);
    }
    return data;
  }

  private async escribirArchivo(data: Record<string,any[]>, formato: string, fp: string, tipo: string): Promise<void> {
    switch (formato) {
      case 'SQL':   writeFileSync(fp, this.generarSQL(data, tipo), 'utf8'); break;
      case 'JSON':  writeFileSync(fp, this.generarJSON(data, tipo), 'utf8'); break;
      case 'CSV':   writeFileSync(fp, this.generarCSV(data, tipo), 'utf8'); break;
      case 'EXCEL': await this.generarExcel(data, fp); break;
      default: throw new Error(`Formato desconocido: ${formato}`);
    }
  }

  /** Genera T-SQL compatible con SQL Server */
  private generarSQL(data: Record<string,any[]>, tipo: string): string {
    const full = tipo === 'COMPLETO';
    let sql = `-- UniMente Backup T-SQL\n-- Tipo: ${tipo}\n-- Fecha: ${new Date().toISOString()}\n\n`;
    sql += 'USE unimente;\n\n';

    // Deshabilitar FK constraints
    sql += TABLES.map(t => `ALTER TABLE [dbo].[${t}] NOCHECK CONSTRAINT ALL;`).join('\n') + '\n\n';

    for (const table of TABLES) {
      const rows = data[table] ?? [];
      if (!rows.length) continue;
      sql += `-- ${table} (${rows.length} filas)\n`;

      if (full) {
        sql += `TRUNCATE TABLE [dbo].[${table}];\n`;
      }

      if (rows.length) {
        const hasIdentity = IDENTITY_TABLES.has(table);
        if (hasIdentity) sql += `SET IDENTITY_INSERT [dbo].[${table}] ON;\n`;

        for (const row of rows) {
          const cols = Object.keys(row).map(c => `[${c}]`).join(', ');
          const vals = Object.values(row).map(toSql).join(', ');
          if (full) {
            sql += `INSERT INTO [dbo].[${table}] (${cols}) VALUES (${vals});\n`;
          } else {
            // MERGE INTO (equivalente a REPLACE INTO en MySQL)
            const pk  = Object.keys(row)[0];
            const upd = Object.keys(row).filter(k => k !== pk).map(k => `target.[${k}] = src.[${k}]`).join(', ');
            sql += `MERGE [dbo].[${table}] AS target\n`;
            sql += `USING (SELECT ${Object.keys(row).map(k => `${toSql(row[k])} AS [${k}]`).join(', ')}) AS src\n`;
            sql += `ON target.[${pk}] = src.[${pk}]\n`;
            sql += `WHEN MATCHED THEN UPDATE SET ${upd}\n`;
            sql += `WHEN NOT MATCHED THEN INSERT (${cols}) VALUES (${Object.values(row).map(toSql).join(', ')});\n`;
          }
        }

        if (hasIdentity) sql += `SET IDENTITY_INSERT [dbo].[${table}] OFF;\n`;
      }
      sql += '\n';
    }

    sql += TABLES.map(t => `ALTER TABLE [dbo].[${t}] CHECK CONSTRAINT ALL;`).join('\n') + '\n';
    return sql;
  }

  private generarJSON(data: Record<string,any[]>, tipo: string): string {
    return JSON.stringify({
      metadata: { tipo, fecha: new Date().toISOString(), motor: 'MSSQL' },
      data: Object.fromEntries(TABLES.map(t => [t, data[t] ?? []])),
    }, null, 2);
  }

  private generarCSV(data: Record<string,any[]>, tipo: string): string {
    let csv = `## UNIMENTE BACKUP MSSQL ##\n## TIPO: ${tipo} ##\n## FECHA: ${new Date().toISOString()} ##\n\n`;
    for (const t of TABLES) {
      const rows = data[t] ?? [];
      csv += `## TABLE: ${t} ##\n`;
      if (rows.length) {
        csv += Object.keys(rows[0]).join(',') + '\n';
        for (const row of rows) csv += Object.values(row).map(toCsv).join(',') + '\n';
      }
      csv += '\n';
    }
    return csv;
  }

  private async generarExcel(data: Record<string,any[]>, fp: string): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'UniMente';
    for (const t of TABLES) {
      const rows = data[t] ?? [];
      const ws   = wb.addWorksheet(t);
      if (!rows.length) continue;
      const cols = Object.keys(rows[0]);
      ws.addRow(cols);
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A6E' } };
      for (const row of rows)
        ws.addRow(cols.map(c => row[c] instanceof Date ? row[c].toISOString().slice(0,19).replace('T',' ') : row[c]));
      ws.columns.forEach(col => { col.width = 18; });
    }
    writeFileSync(fp, Buffer.from(await wb.xlsx.writeBuffer()));
  }

  // ─── Restauración ───────────────────────────────────────────────────────────

  private async restaurarArchivo(fp: string, formato: string, tipo: string): Promise<void> {
    switch (formato) {
      case 'SQL':   await this.restaurarSQL(fp); break;
      case 'JSON':  await this.restaurarJSON(fp, tipo); break;
      case 'CSV':   await this.restaurarCSV(fp, tipo); break;
      case 'EXCEL': await this.restaurarExcel(fp, tipo); break;
      default: throw new Error(`Formato desconocido: ${formato}`);
    }
  }

  private async restaurarSQL(fp: string): Promise<void> {
    const sql  = readFileSync(fp, 'utf8');
    const pool = await this.getPool();
    try {
      // T-SQL: ejecutar batch por batch separados por GO
      const batches = sql.split(/^\s*GO\s*$/im).filter(b => b.trim());
      for (const batch of batches) await pool.request().query(batch);
    } finally { await pool.close(); }
  }

  private async restaurarJSON(fp: string, tipo: string): Promise<void> {
    const payload = JSON.parse(readFileSync(fp, 'utf8'));
    await this.restaurarData(payload.data, tipo);
  }

  private async restaurarCSV(fp: string, tipo: string): Promise<void> {
    const lines = readFileSync(fp, 'utf8').split('\n');
    const data: Record<string,any[]> = {};
    let currentTable = '', headers: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('##')) {
        const tm = t.match(/^## TABLE: (\w+) ##$/);
        if (tm) { currentTable = tm[1]; data[currentTable] = []; headers = []; }
        continue;
      }
      if (!headers.length) { headers = t.split(','); continue; }
      if (t && currentTable) {
        const vals = t.split(',');
        const obj: Record<string,any> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? null; });
        data[currentTable].push(obj);
      }
    }
    await this.restaurarData(data, tipo);
  }

  private async restaurarExcel(fp: string, tipo: string): Promise<void> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fp);
    const data: Record<string,any[]> = {};
    for (const ws of wb.worksheets) {
      if (ws.name === '_metadata') continue;
      const rows: any[] = [];
      let headers: string[] = [];
      ws.eachRow((row, n) => {
        const vals = (row.values as any[]).slice(1);
        if (n === 1) headers = vals.map(String);
        else {
          const obj: Record<string,any> = {};
          headers.forEach((h, i) => { obj[h] = vals[i] ?? null; });
          rows.push(obj);
        }
      });
      data[ws.name] = rows;
    }
    await this.restaurarData(data, tipo);
  }

  private async restaurarData(data: Record<string,any[]>, tipo: string): Promise<void> {
    const full = tipo === 'COMPLETO';
    const pool = await this.getPool();
    try {
      // Deshabilitar FK
      for (const t of TABLES) await pool.request().query(`ALTER TABLE [dbo].[${t}] NOCHECK CONSTRAINT ALL`);

      for (const t of TABLES) {
        const rows = data[t] ?? [];
        if (!rows.length) continue;

        if (full) await pool.request().query(`
          IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='${t}')
            TRUNCATE TABLE [dbo].[${t}]
        `);

        const hasIdentity = IDENTITY_TABLES.has(t);
        if (hasIdentity) await pool.request().query(`SET IDENTITY_INSERT [dbo].[${t}] ON`);

        for (const row of rows) {
          const pk  = Object.keys(row)[0];
          const cols = Object.keys(row).map(c => `[${c}]`).join(', ');
          const req  = pool.request();
          Object.entries(row).forEach(([k, v], i) => req.input(`p${i}`, v));
          const paramVals = Object.keys(row).map((_, i) => `@p${i}`).join(', ');

          if (full) {
            await req.query(`INSERT INTO [dbo].[${t}] (${cols}) VALUES (${paramVals})`);
          } else {
            // MERGE INTO (UPSERT para MSSQL)
            const upd = Object.keys(row).filter(k => k !== pk).map((k, i) => `target.[${k}] = @p${Object.keys(row).indexOf(k)}`).join(', ');
            await req.query(`
              MERGE [dbo].[${t}] AS target
              USING (SELECT ${paramVals}) AS src (${cols.replace(/\[|\]/g, '')})
              ON target.[${pk}] = src.${pk.replace(/\[|\]/g, '')}
              WHEN MATCHED AND (${upd.replace(/target\./g,'')}) IS NOT NULL THEN UPDATE SET ${upd}
              WHEN NOT MATCHED THEN INSERT (${cols}) VALUES (${paramVals});
            `);
          }
        }

        if (hasIdentity) await pool.request().query(`SET IDENTITY_INSERT [dbo].[${t}] OFF`);
      }
    } finally {
      for (const t of TABLES) await pool.request().query(`ALTER TABLE [dbo].[${t}] CHECK CONSTRAINT ALL`).catch(() => {});
      await pool.close();
    }
  }

  private async pruneBackups(): Promise<void> {
    const todos = await this.logRepo.find({ order: { created_at: 'DESC' } });
    for (const b of todos.slice(MAX_BACKUPS)) {
      const fp = join(BACKUP_DIR, b.nombre_archivo);
      if (existsSync(fp)) try { unlinkSync(fp); } catch { /* ignorar */ }
      await this.logRepo.delete(b.id_backup);
      this.logger.log(`Backup antiguo eliminado: ${b.nombre_archivo}`);
    }
  }

  private async getPool(): Promise<mssql.ConnectionPool> {
    return mssql.connect({
      server:   this.configService.get('DB_HOST', 'localhost'),
      port:     +this.configService.get('DB_PORT', 1433),
      user:     this.configService.get('DB_USER', 'sa'),
      password: this.configService.get('DB_PASSWORD', ''),
      database: this.configService.get('DB_NAME', 'unimente'),
      options: {
        trustServerCertificate: this.configService.get('NODE_ENV') !== 'production',
        encrypt: this.configService.get('NODE_ENV') === 'production',
        enableArithAbort: true,
      },
      requestTimeout: 60_000,
    });
  }
}
