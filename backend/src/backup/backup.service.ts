import {
  Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit,
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
import * as mysql2 from 'mysql2/promise';
import * as ExcelJS from 'exceljs';
import { BackupLog } from './entities/backup-log.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { MfaService } from '../mfa/mfa.service';
import { CreateBackupInput, RestaurarBackupInput, ConfigBackupAutoInput } from './dto/backup.dto';

// ─── Constantes ───────────────────────────────────────────────────
const BACKUP_DIR  = join(process.cwd(), 'Backup');
const MAX_BACKUPS = 3;

/** Tablas de negocio en orden correcto de dependencias FK */
const TABLES = [
  'Rol', 'Usuario', 'Estudiante', 'Psicologo',
  'Horario_Psicologo', 'Cita', 'Sesion',
  'Historial_Clinico', 'Detalle_Historial',
];

/** Columna de timestamp por tabla (null = sin timestamp, siempre incluida en parciales) */
const TS_COL: Record<string, string | null> = {
  Rol:                 null,
  Usuario:             'created_at',
  Estudiante:          null,
  Psicologo:           null,
  Horario_Psicologo:   null,
  Cita:                'created_at',
  Sesion:              'fecha_registro',
  Historial_Clinico:   'fecha_apertura',
  Detalle_Historial:   'fecha_registro',
};

// ─── Helpers ──────────────────────────────────────────────────────

/** Serializa un valor para SQL: NULL, número o string escapado */
function toSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Serializa un valor para CSV */
function toCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const s = val instanceof Date
    ? val.toISOString().slice(0, 19).replace('T', ' ')
    : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/** Serializa valor para JSON de forma segura */
function toJson(val: any): any {
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  return val;
}

/** Genera nombre de archivo con timestamp */
function buildFilename(tipo: string, formato: string): string {
  const now  = new Date();
  const dia  = String(now.getDate()).padStart(2, '0');
  const mes  = String(now.getMonth() + 1).padStart(2, '0');
  const anio = now.getFullYear();
  const hrs  = now.getHours();
  const min  = String(now.getMinutes()).padStart(2, '0');
  const ampm = hrs >= 12 ? 'pm' : 'am';
  const h12  = String(hrs % 12 || 12).padStart(2, '0');
  const ext  = formato === 'EXCEL' ? 'xlsx' : formato.toLowerCase();
  return `backup_${tipo}_${dia}-${mes}-${anio}_${h12}-${min}${ampm}.${ext}`;
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
  }

  // ════════════════════════════════════════════════════════════════
  //  API pública
  // ════════════════════════════════════════════════════════════════

  /** Crear backup manual (MFA verificado en resolver) */
  async crearBackup(input: CreateBackupInput, id_usuario: number): Promise<BackupLog> {
    await this.mfaService.requireMfa(id_usuario, input.codigo_mfa);
    return this.ejecutarBackup(input.tipo, input.formato, 'MANUAL');
  }

  /** Restaurar backup (MFA verificado en resolver) */
  async restaurarBackup(input: RestaurarBackupInput, id_usuario: number): Promise<boolean> {
    await this.mfaService.requireMfa(id_usuario, input.codigo_mfa);

    const registro = await this.logRepo.findOneBy({ id_backup: input.id_backup });
    if (!registro) throw new NotFoundException(`Backup #${input.id_backup} no encontrado.`);

    const filePath = join(BACKUP_DIR, registro.nombre_archivo);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`El archivo del backup ya no existe: ${registro.nombre_archivo}`);
    }

    await this.restaurarArchivo(filePath, registro.formato, registro.tipo);
    this.logger.log(`Restauración completada desde ${registro.nombre_archivo}`);
    return true;
  }

  /** Configurar backup automático y ejecutar uno inmediatamente */
  async configurarAutomatico(input: ConfigBackupAutoInput, id_usuario: number): Promise<BackupConfig> {
    await this.mfaService.requireMfa(id_usuario, input.codigo_mfa);

    let config = await this.configRepo.findOne({ where: {} });
    if (!config) config = this.configRepo.create();

    config.tipo             = input.tipo;
    config.formato          = input.formato;
    config.frecuencia_horas = input.frecuencia_horas;
    config.activo           = true;
    config.ultima_ejecucion = new Date();
    const guardado = await this.configRepo.save(config);

    // Backup inmediato de seguridad al confirmar la configuración
    await this.ejecutarBackup(input.tipo, input.formato, 'AUTOMATICO');
    this.logger.log(`Backup automático configurado: ${input.tipo} / ${input.formato} cada ${input.frecuencia_horas}h`);

    return guardado;
  }

  async listarBackups(): Promise<BackupLog[]> {
    const enBD = await this.logRepo.find({ order: { created_at: 'DESC' } });

    // Si Backup_Log está vacío pero existen archivos en Backup/,
    // re-sincronizamos el registro (ocurre después de una restauración de emergencia).
    if (enBD.length === 0 && existsSync(BACKUP_DIR)) {
      const archivos = readdirSync(BACKUP_DIR).filter(f =>
        f.startsWith('backup_') && /\.(sql|json|xlsx|csv)$/.test(f)
      );

      for (const archivo of archivos) {
        const fp     = join(BACKUP_DIR, archivo);
        const kb     = Math.ceil(statSync(fp).size / 1024);
        const partes = archivo.replace(/\.\w+$/, '').split('_');
        const tipo   = partes[1] ?? 'COMPLETO';
        const ext    = archivo.split('.').pop()?.toUpperCase() ?? 'SQL';
        const formato = ext === 'XLSX' ? 'EXCEL' : ext;
        const modo   = archivo.includes('AUTO') ? 'AUTOMATICO' : 'MANUAL';

        // Inferir fecha del nombre del archivo (DD-MM-YYYY_HH-MMam/pm)
        // o usar la fecha de modificación del archivo
        const mtime = statSync(fp).mtime;

        try {
          const reg = this.logRepo.create({
            tipo, formato, nombre_archivo: archivo, tamanio_kb: kb, modo,
          });
          // Ajustar created_at al mtime del archivo
          (reg as any).created_at = mtime;
          await this.logRepo.save(reg);
        } catch { /* ignorar si ya existe */ }
      }

      return this.logRepo.find({ order: { created_at: 'DESC' } });
    }

    return enBD;
  }

  async obtenerConfig(): Promise<BackupConfig | null> {
    return this.configRepo.findOne({ where: {} });
  }

  // ════════════════════════════════════════════════════════════════
  //  Scheduler automático (revisa cada hora)
  // ════════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_HOUR)
  async checkAutoBackup() {
    const config = await this.configRepo.findOne({ where: { activo: true } });
    if (!config) return;

    const ahora     = new Date();
    const ultimaEjec = config.ultima_ejecucion ?? new Date(0);
    const msTranscurridos = ahora.getTime() - ultimaEjec.getTime();
    const msRequeridos    = config.frecuencia_horas * 3_600_000;

    if (msTranscurridos >= msRequeridos) {
      try {
        await this.ejecutarBackup(config.tipo, config.formato, 'AUTOMATICO');
        config.ultima_ejecucion = ahora;
        await this.configRepo.save(config);
        this.logger.log(`Backup automático ejecutado: ${config.tipo} ${config.formato}`);
      } catch (e) {
        this.logger.error('Error en backup automático:', e.message);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  Lógica de backup
  // ════════════════════════════════════════════════════════════════

  private async ejecutarBackup(tipo: string, formato: string, modo: string): Promise<BackupLog> {
    const sinceDate = await this.getRefDate(tipo);
    const data      = await this.fetchAllData(sinceDate);
    const filename  = buildFilename(tipo, formato);
    const filePath  = join(BACKUP_DIR, filename);

    await this.escribirArchivo(data, formato, filePath, tipo);

    const stats    = statSync(filePath);
    const tamanio  = Math.ceil(stats.size / 1024);

    const registro = this.logRepo.create({ tipo, formato, nombre_archivo: filename, tamanio_kb: tamanio, modo });
    const guardado = await this.logRepo.save(registro);

    await this.pruneBackups();
    return guardado;
  }

  /**
   * Fecha de referencia para backups parciales:
   *   DIFERENCIAL → desde el último backup COMPLETO
   *   INCREMENTAL → desde el último backup de cualquier tipo
   *   COMPLETO    → null (sin filtro)
   */
  private async getRefDate(tipo: string): Promise<Date | null> {
    if (tipo === 'COMPLETO') return null;

    if (tipo === 'DIFERENCIAL') {
      const ultimo = await this.logRepo.findOne({
        where: { tipo: 'COMPLETO' },
        order: { created_at: 'DESC' },
      });
      return ultimo?.created_at ?? null;
    }

    // INCREMENTAL: desde el último backup de cualquier tipo
    const ultimo = await this.logRepo.findOne({ order: { created_at: 'DESC' } });
    return ultimo?.created_at ?? null;
  }

  /** Lee todas las tablas, filtrando por fecha si es parcial */
  private async fetchAllData(sinceDate: Date | null): Promise<Record<string, any[]>> {
    const data: Record<string, any[]> = {};
    for (const table of TABLES) {
      data[table] = await this.fetchTable(table, sinceDate);
    }
    return data;
  }

  private async fetchTable(table: string, sinceDate: Date | null): Promise<any[]> {
    const tsCol = TS_COL[table];
    if (sinceDate && tsCol) {
      return this.dataSource.query(`SELECT * FROM \`${table}\` WHERE \`${tsCol}\` > ?`, [sinceDate]);
    }
    return this.dataSource.query(`SELECT * FROM \`${table}\``);
  }

  // ── Escritura de archivos ─────────────────────────────────────────

  private async escribirArchivo(
    data: Record<string, any[]>,
    formato: string,
    filePath: string,
    tipo: string,
  ): Promise<void> {
    switch (formato) {
      case 'SQL':   writeFileSync(filePath, this.generarSQL(data, tipo),  'utf8'); break;
      case 'JSON':  writeFileSync(filePath, this.generarJSON(data, tipo), 'utf8'); break;
      case 'CSV':   writeFileSync(filePath, this.generarCSV(data, tipo),  'utf8'); break;
      case 'EXCEL': await this.generarExcel(data, filePath); break;
      default: throw new Error(`Formato desconocido: ${formato}`);
    }
  }

  private generarSQL(data: Record<string, any[]>, tipo: string): string {
    const fullBackup = tipo === 'COMPLETO';
    let sql = `-- UniMente Backup\n`;
    sql    += `-- Tipo:   ${tipo}\n`;
    sql    += `-- Fecha:  ${new Date().toISOString()}\n\n`;
    sql    += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

    for (const table of TABLES) {
      const rows = data[table] ?? [];
      if (!rows.length) continue;

      sql += `-- ── ${table} (${rows.length} filas) ──\n`;
      if (fullBackup) sql += `TRUNCATE TABLE \`${table}\`;\n`;

      for (const row of rows) {
        const cols = Object.keys(row).map(c => `\`${c}\``).join(', ');
        const vals = Object.values(row).map(toSql).join(', ');
        if (fullBackup) {
          sql += `INSERT INTO \`${table}\` (${cols}) VALUES (${vals});\n`;
        } else {
          sql += `REPLACE INTO \`${table}\` (${cols}) VALUES (${vals});\n`;
        }
      }
      sql += '\n';
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
    return sql;
  }

  private generarJSON(data: Record<string, any[]>, tipo: string): string {
    const payload = {
      metadata: {
        tipo,
        fecha:    new Date().toISOString(),
        tablas:   TABLES.length,
        registros: Object.values(data).reduce((s, r) => s + r.length, 0),
      },
      data: Object.fromEntries(
        TABLES.map(t => [t, (data[t] ?? []).map(row =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k, toJson(v)]))
        )])
      ),
    };
    return JSON.stringify(payload, null, 2);
  }

  private generarCSV(data: Record<string, any[]>, tipo: string): string {
    let csv = `## UNIMENTE BACKUP ##\n`;
    csv    += `## TIPO: ${tipo} ##\n`;
    csv    += `## FECHA: ${new Date().toISOString()} ##\n\n`;

    for (const table of TABLES) {
      const rows = data[table] ?? [];
      csv += `## TABLE: ${table} ##\n`;
      if (rows.length === 0) { csv += '\n'; continue; }

      const cols = Object.keys(rows[0]);
      csv += cols.join(',') + '\n';
      for (const row of rows) {
        csv += cols.map(c => toCsv(row[c])).join(',') + '\n';
      }
      csv += '\n';
    }
    return csv;
  }

  private async generarExcel(data: Record<string, any[]>, filePath: string): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'UniMente';
    wb.created  = new Date();
    wb.modified = new Date();

    // Hoja de metadatos
    const meta = wb.addWorksheet('_metadata');
    meta.addRow(['Campo', 'Valor']);
    meta.addRow(['Sistema', 'UniMente']);
    meta.addRow(['Fecha',   new Date().toISOString()]);
    meta.addRow(['Tablas',  TABLES.length]);
    meta.columns = [{ width: 20 }, { width: 40 }];
    meta.getRow(1).font = { bold: true };

    // Una hoja por tabla
    for (const table of TABLES) {
      const rows = data[table] ?? [];
      const ws   = wb.addWorksheet(table);
      if (!rows.length) continue;

      const cols = Object.keys(rows[0]);
      ws.addRow(cols);
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A6E' } };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      for (const row of rows) {
        ws.addRow(cols.map(c => {
          const v = row[c];
          return v instanceof Date ? v.toISOString().slice(0, 19).replace('T', ' ') : v;
        }));
      }
      ws.columns.forEach(col => { col.width = 18; });
    }

    const buffer = await wb.xlsx.writeBuffer();
    writeFileSync(filePath, Buffer.from(buffer));
  }

  // ════════════════════════════════════════════════════════════════
  //  Restauración
  // ════════════════════════════════════════════════════════════════

  private async restaurarArchivo(filePath: string, formato: string, tipo: string): Promise<void> {
    switch (formato) {
      case 'SQL':   await this.restaurarSQL(filePath);              break;
      case 'JSON':  await this.restaurarJSON(filePath, tipo);       break;
      case 'CSV':   await this.restaurarCSV(filePath, tipo);        break;
      case 'EXCEL': await this.restaurarExcel(filePath, tipo);      break;
      default: throw new Error(`Formato desconocido: ${formato}`);
    }
  }

  private async restaurarSQL(filePath: string): Promise<void> {
    const sql  = readFileSync(filePath, 'utf8');
    const conn = await this.getMultiConn();
    try {
      await conn.query(sql);
    } finally {
      await conn.end();
    }
  }

  private async restaurarJSON(filePath: string, tipo: string): Promise<void> {
    const payload = JSON.parse(readFileSync(filePath, 'utf8'));
    await this.restaurarData(payload.data, tipo);
  }

  private async restaurarCSV(filePath: string, tipo: string): Promise<void> {
    const content = readFileSync(filePath, 'utf8');
    const lines   = content.split('\n');
    const data: Record<string, any[]> = {};
    let currentTable = '';
    let headers: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('## UNIMENTE') || trimmed.startsWith('## TIPO') || trimmed.startsWith('## FECHA')) continue;

      const tableMatch = trimmed.match(/^## TABLE: (\w+) ##$/);
      if (tableMatch) {
        currentTable = tableMatch[1];
        data[currentTable] = [];
        headers = [];
        continue;
      }

      if (!currentTable) continue;

      if (!headers.length) {
        headers = this.parseCSVRow(trimmed);
        continue;
      }
      if (trimmed) {
        const vals = this.parseCSVRow(trimmed);
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? null; });
        data[currentTable].push(obj);
      }
    }
    await this.restaurarData(data, tipo);
  }

  private parseCSVRow(line: string): string[] {
    const result: string[] = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result.map(v => v === '' ? null : v) as string[];
  }

  private async restaurarExcel(filePath: string, tipo: string): Promise<void> {
    const wb   = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const data: Record<string, any[]> = {};

    for (const ws of wb.worksheets) {
      if (ws.name === '_metadata') continue;
      const rows: any[] = [];
      let headers: string[] = [];
      ws.eachRow((row, rowNum) => {
        const vals = row.values as any[];
        vals.shift(); // ExcelJS rows are 1-indexed with an empty first element
        if (rowNum === 1) {
          headers = vals.map(String);
        } else {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => { obj[h] = vals[i] ?? null; });
          rows.push(obj);
        }
      });
      data[ws.name] = rows;
    }
    await this.restaurarData(data, tipo);
  }

  /**
   * Inserta/reemplaza datos en la BD.
   * COMPLETO: TRUNCATE + INSERT; DIFERENCIAL/INCREMENTAL: REPLACE INTO
   */
  private async restaurarData(data: Record<string, any[]>, tipo: string): Promise<void> {
    const isCompleto = tipo === 'COMPLETO';
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const table of TABLES) {
        const rows = data[table] ?? [];
        if (!rows.length) continue;

        if (isCompleto) await this.dataSource.query(`TRUNCATE TABLE \`${table}\``);

        for (const row of rows) {
          const cols   = Object.keys(row).map(c => `\`${c}\``).join(', ');
          const placeholders = Object.keys(row).map(() => '?').join(', ');
          const vals   = Object.values(row);
          const stmt   = isCompleto
            ? `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`
            : `REPLACE INTO \`${table}\` (${cols}) VALUES (${placeholders})`;
          await this.dataSource.query(stmt, vals);
        }
      }
    } finally {
      await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  }

  // ─── Restauración de emergencia (BD vacía, sin JWT) ─────────────────────────

  async restaurarEmergencia(id_backup: number): Promise<void> {
    const registro = await this.logRepo.findOneBy({ id_backup });
    if (!registro) throw new NotFoundException(`Backup #${id_backup} no encontrado.`);
    const filePath = join(BACKUP_DIR, registro.nombre_archivo);
    if (!existsSync(filePath)) throw new NotFoundException(`Archivo no encontrado: ${registro.nombre_archivo}`);
    await this.restaurarArchivo(filePath, registro.formato, registro.tipo);
  }

  async restaurarEmergenciaPorArchivo(nombre_archivo: string): Promise<void> {
    const filePath = join(BACKUP_DIR, nombre_archivo);
    if (!existsSync(filePath)) throw new NotFoundException(`Archivo no encontrado en Backup/: ${nombre_archivo}`);
    const ext = nombre_archivo.split('.').pop()?.toLowerCase() ?? '';
    const formatMap: Record<string, string> = { sql:'SQL', json:'JSON', xlsx:'EXCEL', csv:'CSV' };
    const formato = formatMap[ext];
    if (!formato) throw new BadRequestException(`Extensión no soportada: .${ext}`);
    const tipo = nombre_archivo.includes('COMPLETO') ? 'COMPLETO'
               : nombre_archivo.includes('DIFERENCIAL') ? 'DIFERENCIAL' : 'INCREMENTAL';
    await this.restaurarArchivo(filePath, formato, tipo);
  }

  // ─── Mantener solo los 3 últimos backups ──────────────────────────

  private async pruneBackups(): Promise<void> {
    const todos = await this.logRepo.find({ order: { created_at: 'DESC' } });
    if (todos.length <= MAX_BACKUPS) return;

    const aEliminar = todos.slice(MAX_BACKUPS);
    for (const b of aEliminar) {
      const fp = join(BACKUP_DIR, b.nombre_archivo);
      if (existsSync(fp)) { try { unlinkSync(fp); } catch { /* ignorar */ } }
      await this.logRepo.delete(b.id_backup);
      this.logger.log(`Backup antiguo eliminado: ${b.nombre_archivo}`);
    }
  }

  // ─── Conexión con multipleStatements para restaurar SQL ──────────

  private async getMultiConn(): Promise<mysql2.Connection> {
    return mysql2.createConnection({
      host:               this.configService.get('DB_HOST', 'localhost'),
      port:               +this.configService.get('DB_PORT', 3306),
      user:               this.configService.get('DB_USER', 'root'),
      password:           this.configService.get('DB_PASSWORD', ''),
      database:           this.configService.get('DB_NAME', 'unimente'),
      multipleStatements: true,
    });
  }
}