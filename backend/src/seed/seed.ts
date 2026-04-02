/**
 * seed.ts — UniMente (MSSQL)
 * 2 000+ registros para pruebas completas del sistema.
 *
 * SECURITY — CWE-547 / CWE-798:
 *   Contraseñas desde variables de entorno. Nunca hardcodeadas.
 *   Hashes generados con bcrypt en runtime.
 */

import * as bcrypt       from 'bcrypt';
import { randomBytes }   from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as mssql        from 'mssql';

const SALT_ROUNDS = 12;

// ─── Catálogos ────────────────────────────────────────────────
const ESPECIALIDADES = [
  'Psicologia Clinica',        'Psicologia Educativa',
  'Psicologia Organizacional', 'Neuropsicologia',
  'Terapia Cognitivo-Conductual', 'Psicologia Infantil',
  'Orientacion Vocacional',    'Salud Mental',
  'Psicoterapia Breve',        'Psicologia del Deporte',
  'Terapia Familiar',          'Intervencion en Crisis',
];

const CARRERAS = [
  'Ingenieria en Sistemas',     'Ingenieria Industrial',
  'Administracion de Empresas', 'Contaduria Publica',
  'Derecho',                    'Medicina',
  'Arquitectura',               'Comunicacion',
  'Psicologia',                 'Enfermeria',
  'Diseno Grafico',             'Quimica Farmaceutica',
  'Ingenieria Civil',           'Marketing',
  'Economia',                   'Educacion',
];

const DIAS  = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

const SLOTS = [
  { inicio: '07:00:00', fin: '08:00:00' },
  { inicio: '08:00:00', fin: '09:00:00' },
  { inicio: '09:00:00', fin: '10:00:00' },
  { inicio: '10:00:00', fin: '11:00:00' },
  { inicio: '11:00:00', fin: '12:00:00' },
  { inicio: '13:00:00', fin: '14:00:00' },
  { inicio: '14:00:00', fin: '15:00:00' },
  { inicio: '15:00:00', fin: '16:00:00' },
  { inicio: '16:00:00', fin: '17:00:00' },
  { inicio: '17:00:00', fin: '18:00:00' },
  { inicio: '18:00:00', fin: '19:00:00' },
];

const NOTAS = [
  'Paciente presenta ansiedad generalizada con puntuacion GAD-7 de 14. Factores estresores academicos identificados y jerarquizados.',
  'Sesion de psicoeducacion sobre ciclos de ansiedad y respuesta de estres. Paciente muestra buena receptividad y motivacion al cambio.',
  'Tecnicas de reestructuracion cognitiva aplicadas. Se identificaron cinco pensamientos automaticos negativos recurrentes.',
  'Protocolo de activacion conductual iniciado. Registro de actividades placenteras y su efecto en el estado de animo asignado.',
  'Paciente reporta reduccion significativa de sintomas. PHQ-9 bajo de 18 a 9 en las ultimas tres semanas.',
  'Exploracion de historia familiar y patrones de apego. Relacion entre experiencias tempranas y conductas actuales abordada.',
  'Tecnica de mindfulness introducida en sesion. Escaner corporal practicado durante 15 minutos con buenos resultados.',
  'Evaluacion de riesgo completada con protocolo SAFE-T. Sin indicadores de ideacion suicida activa en este momento.',
  'Exposicion gradual a situacion fobica trabajada en sesion. Jerarquia de miedo elaborada y primer nivel completado.',
  'Revision de registro de pensamientos de la semana. Paciente identifica correctamente distorsiones cognitivas propias.',
  'Crisis de panico reportada durante examenes. Tecnicas de manejo de panico aprendidas y practicadas en sesion.',
  'Habilidades sociales trabajadas mediante role-playing. Practicadas tres situaciones de interaccion social dificil.',
  'Elaboracion de duelo por perdida familiar. Etapas exploradas. Paciente comienza transicion hacia la aceptacion.',
  'TDAH evaluado con escala Conners-3. Se recomienda complementar con valoracion psiquiatrica para descartar comorbilidades.',
  'Sesion vocacional. Inventario de intereses SDS aplicado. Resultados discutidos y relacionados con opciones universitarias.',
  'Conflicto de pareja explorado desde perspectiva individual. Comunicacion asertiva y escucha activa trabajadas.',
  'Burnout academico identificado segun criterios de Maslach. Plan de equilibrio vida-estudio elaborado conjuntamente.',
  'Terapia de aceptacion y compromiso: valores del paciente clarificados y conectados con metas academicas y personales.',
  'Seguimiento de objetivos del semestre. Cuatro de seis metas alcanzadas. Se celebra el progreso y se revisan pendientes.',
  'Cierre terapeutico. Resumen de avances, habilidades adquiridas y senales de alerta para posible recaida elaborados.',
  'Primera sesion de evaluacion. Historia clinica completa. Hipotesis diagnostica inicial formulada con el paciente.',
  'Trabajo en regulacion emocional. Modelo RULER aplicado. Paciente aprende a nombrar y manejar emociones con mayor precision.',
  'Problemas de concentracion abordados con tecnicas de atencion plena y gestion del tiempo academico.',
  'Autoestima trabajada mediante tecnica de la silla vacia. Dialogo entre el critico interno y el yo compasivo realizado.',
  'Sesion de seguimiento post-crisis. Estabilidad emocional recuperada. Plan de seguridad revisado y actualizado.',
];

const RECOMENDACIONES = [
  'Practicar respiracion diafragmatica 10 minutos cada manana, preferiblemente antes de comenzar actividades del dia.',
  'Llevar diario de pensamientos: registrar situacion, emocion (intensidad 0-10) y pensamiento automatico asociado.',
  'Ejercicio aerobico moderado minimo 30 minutos, tres veces por semana. Caminar, trotar o nadar son buenas opciones.',
  'Limitar uso de redes sociales a 45 minutos al dia durante las proximas dos semanas y registrar cambios en estado animo.',
  'Programar al menos una actividad placentera al dia, aunque sea breve (15-20 minutos). Registrar estado de animo antes y despues.',
  'Ante crisis de ansiedad: tecnica 5-4-3-2-1 (5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles, 1 que saboreas).',
  'Investigar tres opciones de carrera o especializacion y preparar un resumen escrito para la proxima sesion.',
  'Hablar con al menos una persona de confianza sobre como te has sentido esta semana. No aislarse.',
  'Mantener horario de sueno regular: acostarse y levantarse a la misma hora cada dia, incluso fines de semana.',
  'Completar el autorregistro de conductas evitativas y traerlo a la proxima sesion para revisarlo juntos.',
  'Practicar asertividad en al menos una situacion real antes de la proxima cita y registrar el resultado.',
  'Continuar con medicacion indicada por psiquiatria segun indicaciones. Reportar cualquier efecto secundario.',
  'Participar en al menos una actividad extracurricular universitaria esta semana para ampliar red de apoyo social.',
  'Leer el capitulo asignado del material de apoyo y subrayar los conceptos que mas resuenen con tu experiencia.',
  'Hacer una llamada de reconexion con un familiar o amigo con quien hayas perdido contacto recientemente.',
  'Antes de dormirte, escribe tres cosas positivas que ocurrieron durante el dia, por pequenas que sean.',
];

const MOTIVOS: (string | null)[] = [
  'Ansiedad academica',              'Dificultades de concentracion',
  'Orientacion vocacional',          'Manejo de emociones',
  'Problemas de autoestima',         'Estres por examenes',
  'Conflictos familiares',           'Problemas de pareja',
  'Duelo o perdida',                 'Dificultades para dormir',
  'Fobia social',                    'Crisis de panico',
  'Estado de animo bajo',            'Rendimiento academico',
  'Problemas de adaptacion',         null, null,
];

const NOMBRES_M = [
  'Carlos','Miguel','Jose','Luis','Juan','Pedro','Andres','Diego',
  'Santiago','Alejandro','Daniel','Sebastian','Ricardo','Fernando','Antonio',
  'Rafael','Victor','Hector','Omar','Ivan','Sergio','Roberto','Manuel',
];
const NOMBRES_F = [
  'Maria','Ana','Laura','Sofia','Valentina','Camila','Daniela','Fernanda',
  'Isabella','Natalia','Paola','Monica','Gabriela','Andrea','Cristina',
  'Alejandra','Veronica','Patricia','Rosa','Elena','Claudia','Adriana',
];
const APELLIDOS = [
  'Garcia','Martinez','Lopez','Gonzalez','Rodriguez','Hernandez','Perez','Torres',
  'Ramirez','Flores','Rivera','Cruz','Morales','Reyes','Castro','Jimenez',
  'Vargas','Mendoza','Ortiz','Gutierrez','Chavez','Medina','Sanchez','Vega',
  'Rios','Soto','Delgado','Rojas','Herrera','Aguilar','Ramos','Nunez',
];

// ─── Utilidades ───────────────────────────────────────────────
function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndNombre(femenino = false) {
  const nom = rnd(femenino ? NOMBRES_F : NOMBRES_M);
  return `${nom} ${rnd(APELLIDOS)} ${rnd(APELLIDOS)}`;
}

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
  const DIA_MAP: Record<string, number> = { lunes:1, martes:2, miercoles:3, jueves:4, viernes:5 };
  const target = DIA_MAP[dia] ?? 1;
  const hoy    = new Date();
  const diff   = (hoy.getDay() - target + 7) % 7 || 7;
  const d      = new Date(hoy);
  d.setDate(d.getDate() - diff - offsetSemanas * 7);
  return d.toISOString().slice(0, 10);
}

function fechaFutura(dia: string, offsetSemanas: number): string {
  const DIA_MAP: Record<string, number> = { lunes:1, martes:2, miercoles:3, jueves:4, viernes:5 };
  const target = DIA_MAP[dia] ?? 1;
  const hoy    = new Date();
  const diff   = (target - hoy.getDay() + 7) % 7 || 7;
  const d      = new Date(hoy);
  d.setDate(d.getDate() + diff + offsetSemanas * 7);
  return d.toISOString().slice(0, 10);
}

// ─── Seed principal ───────────────────────────────────────────
export async function runSeed(pool: mssql.ConnectionPool, cfg?: ConfigService): Promise<void> {
  console.log('[Seed] Generando hashes de contraseñas...');

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

  // Helper: query parametrizado (A03: no SQL injection)
  const q = (sql: string, ...params: any[]) => {
    const req = pool.request();
    params.forEach((v, i) => req.input(`p${i}`, v));
    const paramSql = params.reduce((s, _, i) => s.replace('?', `@p${i}`), sql);
    return req.query(paramSql);
  };

  // Helper: INSERT y obtener ID generado
  const insertGetId = async (sql: string, ...params: any[]): Promise<number> => {
    const result = await q(sql + '; SELECT SCOPE_IDENTITY() AS id', ...params);
    return Number(result.recordset[0]?.id ?? 0);
  };

  // Limpiar datos en orden inverso de FK
  console.log('[Seed] Limpiando tablas...');
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

  // ── 4 Administradores ─────────────────────────────────────────
  const admins = [
    { nombre: 'Administrador', correo: 'admin@unimente.edu',       hash: HASH_ADMIN },
    { nombre: 'Brenda Admin',  correo: 'brendaAdmin@unimente.com', hash: HASH_BREND },
    { nombre: 'Abril Admin',   correo: 'abrilAdmin@unimente.com',  hash: HASH_ABRIL },
    { nombre: 'Mai Admin',     correo: 'maiAdmin@unimente.com',    hash: HASH_MAI  },
  ];
  for (const a of admins) {
    await q('INSERT INTO dbo.Usuario (nombre,correo,password_hash,id_rol) VALUES (?,?,?,?)',
      a.nombre, a.correo, a.hash, idAdmin);
  }
  console.log('[Seed] Admins: 4');

  // ── 12 Psicólogos ─────────────────────────────────────────────
  const psicologoIds: number[] = [];
  const psRows: [string, string, string][] = [
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
    const uId = await insertGetId(
      'INSERT INTO dbo.Usuario (nombre,correo,password_hash,id_rol) VALUES (?,?,?,?)',
      nombre, correo, HASH_DEF, idPsi
    );
    const pId = await insertGetId(
      'INSERT INTO dbo.Psicologo (id_usuario,especialidad,cedula) VALUES (?,?,?)',
      uId, ESPECIALIDADES[i % ESPECIALIDADES.length], cedula
    );
    psicologoIds.push(pId);
  }
  console.log(`[Seed] Psicologos: ${psicologoIds.length}`);

  // ── Horarios (3–5 por psicólogo, días distintos) ──────────────
  interface Horario { id: number; id_psicologo: number; dia_semana: string; hora_inicio: string; hora_fin: string; }
  const horarios: Horario[] = [];

  for (const id_psicologo of psicologoIds) {
    const num        = rndInt(3, 5);
    const diasUsados = new Set<string>();
    let   tries      = 0;
    while (horarios.filter(h => h.id_psicologo === id_psicologo).length < num && tries++ < 50) {
      const dia = rnd(DIAS);
      if (diasUsados.has(dia)) continue;
      diasUsados.add(dia);
      const slot = rnd(SLOTS);
      const hId  = await insertGetId(
        'INSERT INTO dbo.Horario_Psicologo (id_psicologo,dia_semana,hora_inicio,hora_fin,disponible) VALUES (?,?,?,?,1)',
        id_psicologo, dia, slot.inicio, slot.fin
      );
      horarios.push({ id: hId, id_psicologo, dia_semana: dia, hora_inicio: slot.inicio, hora_fin: slot.fin });
    }
  }
  console.log(`[Seed] Horarios: ${horarios.length}`);

  // ── 100 Estudiantes ───────────────────────────────────────────
  const estudianteIds: number[] = [];
  for (let i = 1; i <= 100; i++) {
    const femenino  = i % 2 === 0;
    const nombre    = rndNombre(femenino);
    const correo    = `estudiante${i}@unimente.edu`;
    const matricula = `2${rndInt(20, 25)}${String(rndInt(1000, 9999))}`;
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
  console.log(`[Seed] Estudiantes: ${estudianteIds.length}`);

  // ── Citas, Sesiones, Historiales ─────────────────────────────
  /**
   * Distribución por estudiante:
   *   Estudiantes 1-20  (casos complejos)  → 20-28 citas
   *   Estudiantes 21-60 (casos regulares)  → 12-18 citas
   *   Estudiantes 61-100 (casos nuevos)    →  6-12 citas
   *
   * De las pasadas: ~60% ASISTIDA, ~20% CANCELADA, ~20% PENDIENTE futura
   */
  const citasUsadas  = new Set<string>();
  const historialMap = new Map<string, number>();

  let totalCitas       = 0;
  let totalSesiones    = 0;
  let totalHistoriales = 0;
  let totalDetalles    = 0;
  let cntPend = 0, cntAsist = 0, cntCanc = 0;

  for (let ei = 0; ei < estudianteIds.length; ei++) {
    const id_estudiante = estudianteIds[ei];

    const numCitas =
      ei < 20  ? rndInt(20, 28) :
      ei < 60  ? rndInt(12, 18) :
                 rndInt(6,  12);

    const nPasadas    = Math.round(numCitas * 0.78);
    const nFuturas    = numCitas - nPasadas;
    const nAsistidas  = Math.round(nPasadas * 0.72);
    const nCanceladas = nPasadas - nAsistidas;

    const sesXPsi = new Map<number, number>();

    // Citas PASADAS — distribuidas en los últimos 2 años
    let generadas = 0;
    let tries     = 0;
    while (generadas < nPasadas && tries++ < 300) {
      const horario = rnd(horarios);
      // Asistidas más antiguas; canceladas más recientes
      const maxOffset = generadas < nAsistidas ? 104 : 52;
      const offset    = rndInt(1, maxOffset);
      const fecha     = fechaPasada(horario.dia_semana, offset);
      const estado    = generadas < nAsistidas ? 'ASISTIDA' : 'CANCELADA';
      const key       = `${horario.id_psicologo}-${fecha}-${horario.hora_inicio}`;
      if (citasUsadas.has(key)) continue;
      citasUsadas.add(key);

      try {
        const cId = await insertGetId(
          'INSERT INTO dbo.Cita (id_estudiante,id_psicologo,fecha,hora_inicio,hora_fin,estado,motivo) VALUES (?,?,?,?,?,?,?)',
          id_estudiante, horario.id_psicologo, fecha,
          horario.hora_inicio, horario.hora_fin, estado, rnd(MOTIVOS)
        );
        totalCitas++;
        generadas++;
        estado === 'ASISTIDA' ? cntAsist++ : cntCanc++;

        if (estado === 'ASISTIDA') {
          const numSesion = (sesXPsi.get(horario.id_psicologo) ?? 0) + 1;
          sesXPsi.set(horario.id_psicologo, numSesion);

          const sId = await insertGetId(
            'INSERT INTO dbo.Sesion (id_cita,numero_sesion,notas,recomendaciones) VALUES (?,?,?,?)',
            cId, numSesion, rnd(NOTAS), rnd(RECOMENDACIONES)
          );
          totalSesiones++;

          const hKey = `${id_estudiante}-${horario.id_psicologo}`;
          let id_historial = historialMap.get(hKey);
          if (!id_historial) {
            const hRes = await pool.request()
              .input('ie', id_estudiante)
              .input('ip', horario.id_psicologo)
              .query(`
                MERGE dbo.Historial_Clinico AS target
                USING (SELECT @ie AS ie, @ip AS ip) AS src
                  ON target.id_estudiante = src.ie AND target.id_psicologo = src.ip
                WHEN NOT MATCHED THEN
                  INSERT (id_estudiante, id_psicologo) VALUES (src.ie, src.ip);
                SELECT id_historial
                FROM   dbo.Historial_Clinico
                WHERE  id_estudiante = @ie AND id_psicologo = @ip;
              `);
            id_historial = Number(hRes.recordset[0]?.id_historial);
            historialMap.set(hKey, id_historial);
            totalHistoriales++;
          }

          await q(
            'IF NOT EXISTS (SELECT 1 FROM dbo.Detalle_Historial WHERE id_sesion=?) INSERT INTO dbo.Detalle_Historial (id_historial,id_sesion) VALUES (?,?)',
            sId, id_historial, sId
          );
          totalDetalles++;
        }
      } catch { /* ignorar duplicados de clave única */ }
    }

    // Citas FUTURAS (PENDIENTE)
    tries = 0;
    let futGen = 0;
    while (futGen < nFuturas && tries++ < 100) {
      const horario = rnd(horarios);
      const offset  = rndInt(1, 10);
      const fecha   = fechaFutura(horario.dia_semana, offset);
      const key     = `${horario.id_psicologo}-${fecha}-${horario.hora_inicio}`;
      if (citasUsadas.has(key)) continue;
      citasUsadas.add(key);

      try {
        await insertGetId(
          'INSERT INTO dbo.Cita (id_estudiante,id_psicologo,fecha,hora_inicio,hora_fin,estado,motivo) VALUES (?,?,?,?,?,?,?)',
          id_estudiante, horario.id_psicologo, fecha,
          horario.hora_inicio, horario.hora_fin, 'PENDIENTE', rnd(MOTIVOS)
        );
        totalCitas++;
        futGen++;
        cntPend++;
      } catch { /* ignorar duplicados */ }
    }

    if ((ei + 1) % 25 === 0) {
      console.log(`[Seed] Procesados ${ei + 1}/100 estudiantes — citas acumuladas: ${totalCitas}`);
    }
  }

  // ── Resumen ───────────────────────────────────────────────────
  const totalRegistros =
    4 +                            // admins
    psicologoIds.length * 2 +      // usuarios + psicologos
    estudianteIds.length * 2 +     // usuarios + estudiantes
    horarios.length +
    totalCitas +
    totalSesiones +
    totalHistoriales +
    totalDetalles;

  console.log(`
╔══════════════════════════════════════════════════════╗
║              SEED COMPLETADO — UniMente              ║
╠══════════════════════════════════════════════════════╣
║  Admins               :  4                          ║
║  Psicólogos           :  ${String(psicologoIds.length).padEnd(5)} (+ 12 usuarios)      ║
║  Horarios             :  ${String(horarios.length).padEnd(5)}                      ║
║  Estudiantes          :  ${String(estudianteIds.length).padEnd(5)} (+ 100 usuarios)    ║
╠══════════════════════════════════════════════════════╣
║  Citas totales        :  ${String(totalCitas).padEnd(5)}                      ║
║    └ ASISTIDA         :  ${String(cntAsist).padEnd(5)} (~${Math.round(cntAsist/totalCitas*100)}%)             ║
║    └ CANCELADA        :  ${String(cntCanc).padEnd(5)} (~${Math.round(cntCanc/totalCitas*100)}%)             ║
║    └ PENDIENTE        :  ${String(cntPend).padEnd(5)} (~${Math.round(cntPend/totalCitas*100)}%)             ║
║  Sesiones clínicas    :  ${String(totalSesiones).padEnd(5)}                      ║
║  Historiales clínicos :  ${String(totalHistoriales).padEnd(5)}                      ║
║  Detalles historial   :  ${String(totalDetalles).padEnd(5)}                      ║
╠══════════════════════════════════════════════════════╣
║  TOTAL registros      :  ~${String(totalRegistros).padEnd(5)}                      ║
╚══════════════════════════════════════════════════════╝

  Credenciales de acceso:
  ┌──────────────────────────────────────────────────┐
  │  admin@unimente.edu            SEED_ADMIN_PASSWORD│
  │  brendaAdmin@unimente.com      SEED_ADMIN_BRENDA_ │
  │  abrilAdmin@unimente.com       SEED_ADMIN_ABRIL_  │
  │  maiAdmin@unimente.com         SEED_ADMIN_MAI_    │
  │  psicologo1..12@unimente.edu   SEED_DEFAULT_PW    │
  │  estudiante1..100@unimente.edu SEED_DEFAULT_PW    │
  └──────────────────────────────────────────────────┘
  `);
}