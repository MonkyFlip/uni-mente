/**
 * seed.ts — UniMente (MSSQL)
 *
 * SECURITY — CWE-547 / CWE-798:
 *   Contraseñas leídas desde variables de entorno, nunca hardcodeadas.
 *   Hashes generados con bcrypt en runtime.
 */

import * as bcrypt       from 'bcrypt';
import { randomBytes }   from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as mssql        from 'mssql';

const SALT_ROUNDS = 12;

const ESPECIALIDADES = [
  'Psicologia Clinica', 'Psicologia Educativa', 'Psicologia Organizacional',
  'Neuropsicologia', 'Terapia Cognitivo-Conductual', 'Psicologia Infantil',
  'Orientacion Vocacional', 'Salud Mental',
];
const CARRERAS = [
  'Ingenieria en Sistemas', 'Ingenieria Industrial', 'Administracion de Empresas',
  'Contaduria Publica', 'Derecho', 'Medicina', 'Arquitectura', 'Comunicacion',
];
const DIAS = ['lunes','martes','miercoles','jueves','viernes'];
const SLOTS = [
  { inicio: '08:00:00', fin: '09:00:00' }, { inicio: '09:00:00', fin: '10:00:00' },
  { inicio: '10:00:00', fin: '11:00:00' }, { inicio: '11:00:00', fin: '12:00:00' },
  { inicio: '14:00:00', fin: '15:00:00' }, { inicio: '15:00:00', fin: '16:00:00' },
  { inicio: '16:00:00', fin: '17:00:00' }, { inicio: '17:00:00', fin: '18:00:00' },
];
const NOTAS = [
  'Paciente presenta ansiedad generalizada. Se aplico escala GAD-7 con puntuacion 12.',
  'Sesion de psicoeducacion sobre manejo del estres. Buena receptividad.',
  'Se trabajaron tecnicas de respiracion diafragmatica y relajacion progresiva.',
  'Exploracion de expectativas vocacionales. Se identificaron fortalezas.',
  'Paciente reporta mejoria. Se refuerzan estrategias de afrontamiento.',
];
const RECOMENDACIONES = [
  'Practicar respiracion profunda 10 min al dia.',
  'Llevar diario de pensamientos. Identificar situaciones de ansiedad.',
  'Ejercicio aerobico 30 min tres veces por semana.',
  'Investigar opciones vocacionales antes de la proxima sesion.',
  'Mantener contacto social y participar en actividades extracurriculares.',
];
const MOTIVOS: (string | null)[] = [
  'Ansiedad academica', 'Dificultades de concentracion', 'Orientacion vocacional',
  'Manejo de emociones', 'Autoestima', null,
];
const NOMBRES_M = ['Carlos','Miguel','Jose','Luis','Juan','Pedro','Andres','Diego'];
const NOMBRES_F = ['Maria','Ana','Laura','Sofia','Valentina','Camila','Daniela','Fernanda'];
const APELLIDOS = ['Garcia','Martinez','Lopez','Gonzalez','Rodriguez','Hernandez','Perez','Torres'];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getPassword(key: string, label: string, cfg?: ConfigService): string {
  const val = cfg ? cfg.get<string>(key) : process.env[key];
  if (val && val.trim().length >= 8) return val.trim();
  if (process.env.NODE_ENV === 'production')
    throw new Error(`[Seed] Variable "${key}" no configurada. Obligatoria en produccion.`);
  const generated = randomBytes(12).toString('base64url');
  console.warn(`[Seed] ${key} no encontrada. Generada aleatoriamente: ${generated}`);
  return generated;
}

function fechaPasada(dia: string, offsetSemanas: number): string {
  const DIA_MAP: Record<string,number> = { lunes:1,martes:2,miercoles:3,jueves:4,viernes:5 };
  const target = DIA_MAP[dia] ?? 1;
  const hoy    = new Date();
  const diff   = (hoy.getDay() - target + 7) % 7 || 7;
  const d      = new Date(hoy);
  d.setDate(d.getDate() - diff - offsetSemanas * 7);
  return d.toISOString().slice(0, 10);
}

function fechaFutura(dia: string, offsetSemanas: number): string {
  const DIA_MAP: Record<string,number> = { lunes:1,martes:2,miercoles:3,jueves:4,viernes:5 };
  const target = DIA_MAP[dia] ?? 1;
  const hoy    = new Date();
  const diff   = (target - hoy.getDay() + 7) % 7 || 7;
  const d      = new Date(hoy);
  d.setDate(d.getDate() + diff + offsetSemanas * 7);
  return d.toISOString().slice(0, 10);
}

export async function runSeed(pool: mssql.ConnectionPool, cfg?: ConfigService): Promise<void> {
  // CWE-547 / CWE-798: contraseñas desde env, nunca hardcodeadas
  const pwdAdmin = getPassword('SEED_ADMIN_PASSWORD',        'admin',   cfg);
  const pwdBrend = getPassword('SEED_ADMIN_BRENDA_PASSWORD', 'brenda',  cfg);
  const pwdAbril = getPassword('SEED_ADMIN_ABRIL_PASSWORD',  'abril',   cfg);
  const pwdMai   = getPassword('SEED_ADMIN_MAI_PASSWORD',    'mai',     cfg);
  const pwdDef   = getPassword('SEED_DEFAULT_PASSWORD',      'default', cfg);

  const [HASH_ADMIN, HASH_BREND, HASH_ABRIL, HASH_MAI, HASH_DEF] = await Promise.all([
    bcrypt.hash(pwdAdmin, SALT_ROUNDS),
    bcrypt.hash(pwdBrend, SALT_ROUNDS),
    bcrypt.hash(pwdAbril, SALT_ROUNDS),
    bcrypt.hash(pwdMai,   SALT_ROUNDS),
    bcrypt.hash(pwdDef,   SALT_ROUNDS),
  ]);

  // Helper: ejecutar query parametrizado (A03: no SQL injection)
  const q = (sql: string, ...params: any[]) => {
    const req = pool.request();
    params.forEach((v, i) => req.input(`p${i}`, v));
    const paramSql = params.reduce((s, _, i) => s.replace('?', `@p${i}`), sql);
    return req.query(paramSql);
  };

  // Helper: obtener ID del último insert
  const insertGetId = async (sql: string, ...params: any[]): Promise<number> => {
    const result = await q(sql + '; SELECT SCOPE_IDENTITY() AS id', ...params);
    return Number(result.recordset[0]?.id ?? 0);
  };

  // Limpiar datos en orden inverso de FK
  await pool.request().query(`
    ALTER TABLE dbo.Detalle_Historial NOCHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Historial_Clinico NOCHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Sesion            NOCHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Cita              NOCHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Horario_Psicologo NOCHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Psicologo         NOCHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Estudiante        NOCHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Usuario           NOCHECK CONSTRAINT ALL;

    DELETE FROM dbo.Detalle_Historial;
    DELETE FROM dbo.Historial_Clinico;
    DELETE FROM dbo.Sesion;
    DELETE FROM dbo.Cita;
    DELETE FROM dbo.Horario_Psicologo;
    DELETE FROM dbo.Psicologo;
    DELETE FROM dbo.Estudiante;
    DELETE FROM dbo.Usuario;

    DBCC CHECKIDENT('dbo.Usuario',           RESEED, 0);
    DBCC CHECKIDENT('dbo.Psicologo',         RESEED, 0);
    DBCC CHECKIDENT('dbo.Estudiante',        RESEED, 0);
    DBCC CHECKIDENT('dbo.Horario_Psicologo', RESEED, 0);
    DBCC CHECKIDENT('dbo.Cita',              RESEED, 0);
    DBCC CHECKIDENT('dbo.Sesion',            RESEED, 0);
    DBCC CHECKIDENT('dbo.Historial_Clinico', RESEED, 0);
    DBCC CHECKIDENT('dbo.Detalle_Historial', RESEED, 0);

    ALTER TABLE dbo.Detalle_Historial CHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Historial_Clinico CHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Sesion            CHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Cita              CHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Horario_Psicologo CHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Psicologo         CHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Estudiante        CHECK CONSTRAINT ALL;
    ALTER TABLE dbo.Usuario           CHECK CONSTRAINT ALL;
  `);

  // Roles
  const getRolId = async (nombre: string): Promise<number> => {
    const res = await q('SELECT id_rol FROM dbo.Rol WHERE nombre=?', nombre);
    return Number(res.recordset[0]?.id_rol ?? 0);
  };
  const idAdmin = await getRolId('administrador');
  const idPsi   = await getRolId('psicologo');
  const idEst   = await getRolId('estudiante');

  // Administradores
  const admins = [
    { nombre: 'Administrador', correo: 'admin@unimente.edu',       hash: HASH_ADMIN },
    { nombre: 'Brenda Admin',  correo: 'brendaAdmin@unimente.com', hash: HASH_BREND },
    { nombre: 'Abril Admin',   correo: 'abrilAdmin@unimente.com',  hash: HASH_ABRIL },
    { nombre: 'Mai Admin',     correo: 'maiAdmin@unimente.com',    hash: HASH_MAI },
  ];
  for (const a of admins) {
    await q('INSERT INTO dbo.Usuario (nombre,correo,password_hash,id_rol) VALUES (?,?,?,?)',
      a.nombre, a.correo, a.hash, idAdmin);
  }

  // 12 Psicólogos
  const psicologoIds: number[] = [];
  const psRows = [
    ['Mario Ramos Perez',       'psicologo1@unimente.edu',  'PSI000001'],
    ['Valentina Moreno Garcia', 'psicologo2@unimente.edu',  'PSI000002'],
    ['Carlos Mendoza Rios',     'psicologo3@unimente.edu',  'PSI000003'],
    ['Laura Jimenez Torres',    'psicologo4@unimente.edu',  'PSI000004'],
    ['Roberto Flores Castillo', 'psicologo5@unimente.edu',  'PSI000005'],
    ['Ana Gutierrez Soto',      'psicologo6@unimente.edu',  'PSI000006'],
    ['Fernando Ruiz Vargas',    'psicologo7@unimente.edu',  'PSI000007'],
    ['Monica Mendoza Flores',   'psicologo8@unimente.edu',  'PSI000008'],
    ['Eduardo Sanchez Pena',    'psicologo9@unimente.edu',  'PSI000009'],
    ['Patricia Medina Reyes',   'psicologo10@unimente.edu', 'PSI000010'],
    ['Jorge Gomez Morales',     'psicologo11@unimente.edu', 'PSI000011'],
    ['Sofia Castro Herrera',    'psicologo12@unimente.edu', 'PSI000012'],
  ];
  for (let i = 0; i < psRows.length; i++) {
    const [nombre, correo, cedula] = psRows[i];
    const especialidad = ESPECIALIDADES[i % ESPECIALIDADES.length];
    const uId = await insertGetId(
      'INSERT INTO dbo.Usuario (nombre,correo,password_hash,id_rol) VALUES (?,?,?,?)',
      nombre, correo, HASH_DEF, idPsi
    );
    const pId = await insertGetId(
      'INSERT INTO dbo.Psicologo (id_usuario,especialidad,cedula) VALUES (?,?,?)',
      uId, especialidad, cedula
    );
    psicologoIds.push(pId);
  }

  // Horarios
  interface Horario { id: number; id_psicologo: number; dia_semana: string; hora_inicio: string; hora_fin: string; }
  const horarios: Horario[] = [];
  for (const id_psicologo of psicologoIds) {
    const num = rndInt(3, 4);
    const diasUsados = new Set<string>();
    let tries = 0;
    while (horarios.filter(h => h.id_psicologo === id_psicologo).length < num && tries++ < 30) {
      const dia  = rnd(DIAS);
      if (diasUsados.has(dia)) continue;
      diasUsados.add(dia);
      const slot = rnd(SLOTS);
      const hId = await insertGetId(
        'INSERT INTO dbo.Horario_Psicologo (id_psicologo,dia_semana,hora_inicio,hora_fin,disponible) VALUES (?,?,?,?,1)',
        id_psicologo, dia, slot.inicio, slot.fin
      );
      horarios.push({ id: hId, id_psicologo, dia_semana: dia, hora_inicio: slot.inicio, hora_fin: slot.fin });
    }
  }

  // 80 Estudiantes
  const estudianteIds: number[] = [];
  for (let i = 1; i <= 80; i++) {
    const genero = i % 3 === 0 ? 'M' : 'F';
    const nombre = `${rnd(genero === 'M' ? NOMBRES_M : NOMBRES_F)} ${rnd(APELLIDOS)} ${rnd(APELLIDOS)}`;
    const correo = `estudiante${i}@unimente.edu`;
    const matricula = `2${rndInt(20, 24)}${String(rndInt(1000, 9999))}`;
    const uId = await insertGetId(
      'INSERT INTO dbo.Usuario (nombre,correo,password_hash,id_rol) VALUES (?,?,?,?)',
      nombre, correo, HASH_DEF, idEst
    );
    const eId = await insertGetId(
      'INSERT INTO dbo.Estudiante (id_usuario,matricula,carrera) VALUES (?,?,?)',
      uId, matricula, rnd(CARRERAS)
    );
    estudianteIds.push(eId);
  }

  // Citas, Sesiones, Historiales
  const citasUsadas = new Set<string>();
  const historialMap = new Map<string, number>();
  let totalCitas = 0, totalSesiones = 0, totalHistoriales = 0;

  for (const id_estudiante of estudianteIds) {
    const numCitas = rndInt(5, 12);
    const sesXPsi  = new Map<number, number>();

    for (let ci = 0; ci < numCitas; ci++) {
      const horario      = rnd(horarios);
      const id_psicologo = horario.id_psicologo;
      const esPasada     = ci < Math.floor(numCitas * 0.7);
      const fecha = esPasada
        ? fechaPasada(horario.dia_semana, rndInt(1, 16))
        : fechaFutura(horario.dia_semana, rndInt(1, 6));

      const key = `${id_psicologo}-${fecha}-${horario.hora_inicio}`;
      if (citasUsadas.has(key)) continue;
      citasUsadas.add(key);

      const r = Math.random();
      const estado = !esPasada ? 'PENDIENTE' : r < 0.65 ? 'ASISTIDA' : r < 0.85 ? 'CANCELADA' : 'PENDIENTE';

      try {
        const cId = await insertGetId(
          'INSERT INTO dbo.Cita (id_estudiante,id_psicologo,fecha,hora_inicio,hora_fin,estado,motivo) VALUES (?,?,?,?,?,?,?)',
          id_estudiante, id_psicologo, fecha, horario.hora_inicio, horario.hora_fin, estado, rnd(MOTIVOS)
        );
        totalCitas++;

        if (estado === 'ASISTIDA') {
          const numSesion = (sesXPsi.get(id_psicologo) ?? 0) + 1;
          sesXPsi.set(id_psicologo, numSesion);

          const sId = await insertGetId(
            'INSERT INTO dbo.Sesion (id_cita,numero_sesion,notas,recomendaciones) VALUES (?,?,?,?)',
            cId, numSesion, rnd(NOTAS), rnd(RECOMENDACIONES)
          );
          totalSesiones++;

          const hKey = `${id_estudiante}-${id_psicologo}`;
          let id_historial = historialMap.get(hKey);
          if (!id_historial) {
            // MSSQL MERGE INTO para INSERT IF NOT EXISTS
            const hRes = await pool.request()
              .input('ie', id_estudiante)
              .input('ip', id_psicologo)
              .query(`
                MERGE dbo.Historial_Clinico AS target
                USING (SELECT @ie AS ie, @ip AS ip) AS src ON target.id_estudiante=src.ie AND target.id_psicologo=src.ip
                WHEN NOT MATCHED THEN INSERT (id_estudiante,id_psicologo) VALUES (src.ie,src.ip);
                SELECT id_historial FROM dbo.Historial_Clinico WHERE id_estudiante=@ie AND id_psicologo=@ip;
              `);
            id_historial = Number(hRes.recordset[0]?.id_historial);
            historialMap.set(hKey, id_historial);
            totalHistoriales++;
          }

          await q(
            'IF NOT EXISTS (SELECT 1 FROM dbo.Detalle_Historial WHERE id_sesion=?) INSERT INTO dbo.Detalle_Historial (id_historial,id_sesion) VALUES (?,?)',
            sId, id_historial, sId
          );
        }
      } catch { /* ignorar duplicados */ }
    }
  }

  console.log(`  Seed completado:
    Admins: 4  |  Psicologos: ${psicologoIds.length}  |  Horarios: ${horarios.length}
    Estudiantes: ${estudianteIds.length}  |  Citas: ${totalCitas}
    Sesiones: ${totalSesiones}  |  Historiales: ${totalHistoriales}`);
}
