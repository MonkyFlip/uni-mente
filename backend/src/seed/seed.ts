/**
 * UniMente — Seed de datos de prueba
 * Exporta runSeed() para ser llamado desde app.module.ts en el arranque.
 * También funciona standalone: npx ts-node src/seed/seed.ts
 */

import * as mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';

// ─── Datos ────────────────────────────────────────────────────────

const ESPECIALIDADES = [
  'Psicología Clínica', 'Psicología Educativa', 'Psicología Organizacional',
  'Neuropsicología', 'Terapia Cognitivo-Conductual', 'Psicología Infantil',
  'Orientación Vocacional', 'Salud Mental',
];
const CARRERAS = [
  'Ingeniería en Sistemas Computacionales', 'Ingeniería Industrial',
  'Administración de Empresas', 'Contaduría Pública', 'Derecho', 'Medicina',
  'Arquitectura', 'Diseño Gráfico', 'Comunicación', 'Psicología',
  'Nutrición', 'Enfermería',
];
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const SLOTS = [
  ['08:00:00','09:00:00'], ['09:00:00','10:00:00'], ['10:00:00','11:00:00'],
  ['11:00:00','12:00:00'], ['14:00:00','15:00:00'], ['15:00:00','16:00:00'],
  ['16:00:00','17:00:00'], ['17:00:00','18:00:00'],
];
const MOTIVOS = [
  'Ansiedad y estrés académico', 'Dificultades de concentración',
  'Problemas para dormir', 'Orientación vocacional', 'Manejo de emociones',
  'Relaciones interpersonales', 'Autoestima baja', 'Adaptación universitaria',
  'Duelo o pérdida', 'Problemas familiares', null,
];
const NOTAS = [
  'Paciente muestra signos de ansiedad generalizada. Se aplica escala GAD-7. Se inicia plan cognitivo-conductual.',
  'Se trabajó técnica de respiración diafragmática y relajación muscular. Buena receptividad.',
  'Sesión de psicoeducación sobre ciclos del sueño. Se establecieron rutinas de higiene del sueño.',
  'Se exploró historia académica y expectativas vocacionales. Se identificaron fortalezas e intereses.',
  'Paciente reporta mejoría en manejo del estrés. Se refuerzan estrategias de afrontamiento.',
  'Se abordó patrón de pensamientos automáticos negativos. Inicio de registro de pensamientos.',
  'Se realizó evaluación neuropsicológica básica. Resultados dentro de parámetros normales.',
  'Sesión de habilidades sociales y asertividad. Role-playing de situaciones conflictivas.',
  'Se exploran factores precipitantes. Planificación de actividades agradables.',
  'Paciente muestra resistencia al cambio. Se trabajan motivaciones y ambivalencia.',
];
const RECS = [
  'Practicar respiración profunda 10 min al día. Reducir cafeína.',
  'Llevar diario de pensamientos. Identificar situaciones que generan ansiedad.',
  'Ejercicio aeróbico 30 min, 3 veces por semana.',
  'Investigar opciones vocacionales antes de la próxima sesión.',
  'Mantener contacto social. Participar en actividades extracurriculares.',
  'Practicar técnica STOP ante pensamientos intrusivos.',
  'Comunicar sentimientos de manera asertiva. Establecer límites claros.',
  'Tomar descansos de 10 min cada hora de estudio. Técnica Pomodoro.',
];
const NOM_M = ['Carlos','Miguel','José','Luis','Juan','Pedro','Andrés','Diego','Fernando','Ricardo','Alejandro','Daniel','Jorge','Pablo','Roberto','Eduardo','Mario','Sergio','Iván','Héctor'];
const NOM_F = ['María','Ana','Laura','Sofía','Valentina','Isabella','Camila','Mariana','Daniela','Fernanda','Patricia','Gabriela','Andrea','Alejandra','Claudia','Verónica','Mónica','Sandra','Lucía','Elena'];
const APEL  = ['García','Martínez','López','González','Rodríguez','Hernández','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Gómez','Díaz','Cruz','Morales','Reyes','Gutiérrez','Ortiz','Chávez','Ramos','Vargas','Castillo','Jiménez','Moreno','Rojas','Herrera','Medina','Aguilar','Mendoza'];

// ─── Utilidades ───────────────────────────────────────────────────
const rnd  = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rndN = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const nom  = (g: 'M'|'F') => `${rnd(g==='M'?NOM_M:NOM_F)} ${rnd(APEL)} ${rnd(APEL)}`;

function fechaPasada(dia: string, semanas: number): string {
  const MAP: Record<string,number> = {domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
  const hoy = new Date();
  const diff = (hoy.getDay() - MAP[dia] + 7) % 7 || 7;
  const d = new Date(hoy); d.setDate(hoy.getDate() - diff - semanas * 7);
  return d.toISOString().split('T')[0];
}
function fechaFutura(dia: string, semanas: number): string {
  const MAP: Record<string,number> = {domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
  const hoy = new Date();
  const diff = (MAP[dia] - hoy.getDay() + 7) % 7 || 7;
  const d = new Date(hoy); d.setDate(hoy.getDate() + diff + semanas * 7);
  return d.toISOString().split('T')[0];
}

/** Lee el id de una fila de forma segura sin importar el formato de mysql2 */
async function getId(conn: mysql.Connection, sql: string, params: any[]): Promise<number> {
  const [rows] = await conn.query(sql, params);
  const arr = rows as any[];
  if (!arr || arr.length === 0) throw new Error(`No se encontró resultado para: ${sql}`);
  const row = arr[0];
  // El objeto puede tener la clave directamente o ser un array
  const val = typeof row === 'object' ? Object.values(row)[0] : row;
  return Number(val);
}

// ─── runSeed exportable ───────────────────────────────────────────

export async function runSeed(conn: mysql.Connection): Promise<void> {
  console.log('  Iniciando seed de datos de prueba...');

  // Limpiar tablas en orden inverso de FK
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['Detalle_Historial','Historial_Clinico','Sesion','Cita','Horario_Psicologo','Psicologo','Estudiante']) {
    await conn.query(`TRUNCATE TABLE ${t}`);
  }
  await conn.query(`DELETE FROM Usuario WHERE correo != 'admin@unimente.edu'`);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  // Leer id_rol con helper seguro
  const id_rol_psi = await getId(conn, "SELECT id_rol FROM Rol WHERE nombre='psicologo'",  []);
  const id_rol_est = await getId(conn, "SELECT id_rol FROM Rol WHERE nombre='estudiante'", []);

  const HASH = await bcrypt.hash('Password123!', 10);

  // ── 12 Psicólogos ─────────────────────────────────────────────
  const psicologoIds: number[] = [];
  for (let i = 1; i <= 12; i++) {
    const [ur] = await conn.query<any>(
      'INSERT INTO Usuario (nombre, correo, password_hash, id_rol) VALUES (?,?,?,?)',
      [nom(i%2===0?'F':'M'), `psicologo${i}@unimente.edu`, HASH, id_rol_psi],
    );
    const [pr] = await conn.query<any>(
      'INSERT INTO Psicologo (id_usuario, especialidad, cedula, telefono) VALUES (?,?,?,?)',
      [ur.insertId, ESPECIALIDADES[(i-1)%ESPECIALIDADES.length], `PSI${String(i).padStart(6,'0')}`, `55${rndN(10000000,99999999)}`],
    );
    psicologoIds.push(pr.insertId);
  }

  // ── Horarios (3-4 por psicólogo) ──────────────────────────────
  interface H { id_psi:number; dia:string; inicio:string; fin:string; }
  const horarios: H[] = [];
  for (const id_psi of psicologoIds) {
    const usados = new Set<string>();
    for (let h = 0; h < rndN(3,4); h++) {
      let dia='', slot: string[];
      let t = 0;
      do { dia = rnd(DIAS); slot = rnd(SLOTS); t++; } while (usados.has(dia) && t < 30);
      if (usados.has(dia)) continue;
      usados.add(dia);
      await conn.query(
        'INSERT INTO Horario_Psicologo (id_psicologo, dia_semana, hora_inicio, hora_fin, disponible) VALUES (?,?,?,?,1)',
        [id_psi, dia, slot[0], slot[1]],
      );
      horarios.push({ id_psi, dia, inicio: slot[0], fin: slot[1] });
    }
  }

  // ── 80 Estudiantes ────────────────────────────────────────────
  const estudianteIds: number[] = [];
  for (let i = 1; i <= 80; i++) {
    const [ur] = await conn.query<any>(
      'INSERT INTO Usuario (nombre, correo, password_hash, id_rol) VALUES (?,?,?,?)',
      [nom(i%3===0?'M':'F'), `estudiante${i}@unimente.edu`, HASH, id_rol_est],
    );
    const [er] = await conn.query<any>(
      'INSERT INTO Estudiante (id_usuario, matricula, carrera, telefono) VALUES (?,?,?,?)',
      [ur.insertId, `2${rndN(20,24)}${rndN(1000,9999)}`, rnd(CARRERAS), `55${rndN(10000000,99999999)}`],
    );
    estudianteIds.push(er.insertId);
  }

  // ── Citas + Sesiones + Historial ─────────────────────────────
  const usadas     = new Set<string>();
  const histMap    = new Map<string,number>();
  let nCitas=0, nSesiones=0, nHistoriales=0;

  for (const id_est of estudianteIds) {
    const numCitas = rndN(6,14);
    const sesXPsi  = new Map<number,number>();

    for (let ci = 0; ci < numCitas; ci++) {
      const h      = rnd(horarios);
      const pasada = ci < Math.floor(numCitas * 0.7);
      const fecha  = pasada ? fechaPasada(h.dia, rndN(1,18)) : fechaFutura(h.dia, rndN(1,8));
      const key    = `${h.id_psi}-${fecha}-${h.inicio}`;
      if (usadas.has(key)) continue;
      usadas.add(key);

      const r      = Math.random();
      const estado = !pasada ? 'PENDIENTE' : r < 0.65 ? 'ASISTIDA' : r < 0.85 ? 'CANCELADA' : 'PENDIENTE';

      try {
        const [cr] = await conn.query<any>(
          'INSERT INTO Cita (id_estudiante, id_psicologo, fecha, hora_inicio, hora_fin, estado, motivo) VALUES (?,?,?,?,?,?,?)',
          [id_est, h.id_psi, fecha, h.inicio, h.fin, estado, rnd(MOTIVOS)],
        );
        nCitas++;

        if (estado === 'ASISTIDA') {
          const nSes = (sesXPsi.get(h.id_psi) ?? 0) + 1;
          sesXPsi.set(h.id_psi, nSes);
          const [sr] = await conn.query<any>(
            'INSERT INTO Sesion (id_cita, numero_sesion, notas, recomendaciones) VALUES (?,?,?,?)',
            [cr.insertId, nSes, rnd(NOTAS), rnd(RECS)],
          );
          nSesiones++;

          const hKey = `${id_est}-${h.id_psi}`;
          let id_hist = histMap.get(hKey);
          if (!id_hist) {
            const [hhr] = await conn.query<any>(
              'INSERT IGNORE INTO Historial_Clinico (id_estudiante, id_psicologo) VALUES (?,?)',
              [id_est, h.id_psi],
            );
            if (hhr.insertId) {
              id_hist = hhr.insertId;
            } else {
              id_hist = await getId(conn,
                'SELECT id_historial FROM Historial_Clinico WHERE id_estudiante=? AND id_psicologo=?',
                [id_est, h.id_psi],
              );
            }
            histMap.set(hKey, id_hist!);
            nHistoriales++;
          }
          await conn.query(
            'INSERT IGNORE INTO Detalle_Historial (id_historial, id_sesion) VALUES (?,?)',
            [id_hist, sr.insertId],
          );
        }
      } catch { /* ignorar conflicto UNIQUE */ }
    }
  }

  console.log('  Seed completado:');
  console.log(`    Psicologos: 12  |  Horarios: ${horarios.length}  |  Estudiantes: 80`);
  console.log(`    Citas: ${nCitas}  |  Sesiones: ${nSesiones}  |  Historiales: ${nHistoriales}`);
  console.log('  Acceso: psicologo1@unimente.edu / estudiante1@unimente.edu  →  Password123!');
}

// ─── Standalone: npx ts-node src/seed/seed.ts ────────────────────
if (require.main === module) {
  (async () => {
    const dotenv = await import('dotenv');
    const { resolve } = await import('path');
    dotenv.config({ path: resolve(__dirname, '../../.env') });
    const conn = await mysql.createConnection({
      host:               process.env.DB_HOST     ?? 'localhost',
      port:               +(process.env.DB_PORT   ?? 3306),
      user:               process.env.DB_USER     ?? 'root',
      password:           process.env.DB_PASSWORD ?? '',
      database:           process.env.DB_NAME     ?? 'unimente',
      multipleStatements: true,
    });
    try { await runSeed(conn); }
    finally { await conn.end(); }
  })().catch(e => { console.error('ERROR en seed:', e.message); process.exit(1); });
}