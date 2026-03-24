/**
 * seed.ts — Población inicial de la base de datos UniMente
 *
 * SECURITY — OWASP A05/CWE-547 & CWE-798 Hardcoded Secrets / Passwords:
 *   Snyk detectó contraseñas en texto plano y strings hardcodeados en bcrypt.hash().
 *   Aunque bcrypt hashea los valores (no se almacenan en texto plano), tener las
 *   contraseñas literales en el código fuente permite que cualquiera con acceso
 *   al repositorio las conozca.
 *
 *   Mitigación aplicada:
 *   1. Las contraseñas de los admins de seed se leen desde variables de entorno.
 *   2. Si la variable no existe, se genera una contraseña aleatoria segura y se
 *      imprime en consola UNA SOLA VEZ al arrancar — el desarrollador debe copiarla.
 *   3. Las contraseñas de datos de prueba (psicólogos/estudiantes) usan una
 *      variable de entorno SEED_DEFAULT_PASSWORD con fallback solo en desarrollo.
 *
 *   Variables requeridas en .env (o generadas automáticamente en dev):
 *     SEED_ADMIN_PASSWORD=         contraseña del admin principal
 *     SEED_ADMIN_BRENDA_PASSWORD=  contraseña de brenda admin
 *     SEED_ADMIN_ABRIL_PASSWORD=   contraseña de abril admin
 *     SEED_ADMIN_MAI_PASSWORD=     contraseña de mai admin
 *     SEED_DEFAULT_PASSWORD=       contraseña de psicólogos y estudiantes de prueba
 *     NODE_ENV=                    'production' desactiva el seed automático
 *
 * OWASP: A02:2021 Cryptographic Failures / A05:2021 Security Misconfiguration
 */

import * as bcrypt       from 'bcrypt';
import { DataSource }    from 'typeorm';
import { randomBytes }   from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Obtiene una contraseña desde variables de entorno.
 * Si no existe y estamos en desarrollo, genera una aleatoria segura.
 * En producción lanza un error para evitar seeds accidentales.
 *
 * @param envKey  Nombre de la variable de entorno
 * @param label   Etiqueta para el log (no incluye el valor)
 */
function getPassword(envKey: string, label: string): string {
  const value = process.env[envKey];

  if (value && value.trim().length >= 8) {
    return value.trim();
  }

  // En producción nunca generamos contraseñas automáticas
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[Seed] Variable de entorno "${envKey}" no configurada. ` +
      `El seed no se ejecuta en producción sin credenciales explícitas.`
    );
  }

  // Solo en desarrollo: generar contraseña aleatoria y notificar
  const generated = randomBytes(16).toString('base64url');
  console.warn(
    `\n[Seed] ⚠  Variable "${envKey}" no encontrada en .env.\n` +
    `  Contraseña generada para "${label}": ${generated}\n` +
    `  Cópiala en tu .env para mantenerla entre reinicios.\n`
  );
  return generated;
}

export async function runSeed(dataSource: DataSource): Promise<void> {
  // ── Guard: no ejecutar seed en producción si ya hay datos ────────
  if (process.env.NODE_ENV === 'production') {
    const [[{ total }]] = await dataSource.query<any>(
      'SELECT COUNT(*) AS total FROM Usuario'
    );
    if (Number(total) > 0) {
      console.log('[Seed] Entorno de producción con datos existentes — seed omitido.');
      return;
    }
  }

  // ── Obtener contraseñas desde variables de entorno ───────────────
  // SECURITY: nunca hardcodear contraseñas — leer siempre desde .env
  const pwdAdmin  = getPassword('SEED_ADMIN_PASSWORD',        'admin principal');
  const pwdBrend  = getPassword('SEED_ADMIN_BRENDA_PASSWORD', 'brenda admin');
  const pwdAbril  = getPassword('SEED_ADMIN_ABRIL_PASSWORD',  'abril admin');
  const pwdMai    = getPassword('SEED_ADMIN_MAI_PASSWORD',    'mai admin');

  // Contraseña por defecto para datos de prueba (psicólogos/estudiantes)
  // Solo se usa en entornos de desarrollo
  const pwdDefault = getPassword('SEED_DEFAULT_PASSWORD', 'usuarios de prueba');

  // ── Generar hashes con bcrypt ────────────────────────────────────
  // SECURITY: bcrypt con SALT_ROUNDS=10 — conforme a OWASP A02
  const [
    HASH_ADMIN,
    HASH_BRENDA,
    HASH_ABRIL,
    HASH_MAI,
    HASH_DEFAULT,
  ] = await Promise.all([
    bcrypt.hash(pwdAdmin,  SALT_ROUNDS),
    bcrypt.hash(pwdBrend,  SALT_ROUNDS),
    bcrypt.hash(pwdAbril,  SALT_ROUNDS),
    bcrypt.hash(pwdMai,    SALT_ROUNDS),
    bcrypt.hash(pwdDefault, SALT_ROUNDS),
  ]);

  // ── Verificar si el seed ya fue ejecutado ────────────────────────
  const [[{ count }]] = await dataSource.query<any>(
    'SELECT COUNT(*) AS count FROM Rol'
  );
  if (Number(count) > 0) {
    console.log('[Seed] BD ya tiene datos — seed omitido.');
    return;
  }

  console.log('[Seed] Insertando datos iniciales...');

  // ── Roles ────────────────────────────────────────────────────────
  await dataSource.query(`
    INSERT INTO Rol (nombre) VALUES
      ('administrador'), ('psicologo'), ('estudiante')
  `);

  const getId = async (tabla: string, campo: string, valor: string) => {
    const [[row]] = await dataSource.query<any>(
      `SELECT id_${tabla} FROM ${tabla === 'rol' ? 'Rol' : tabla} WHERE ${campo} = ?`,
      [valor]
    );
    return row?.[`id_${tabla}`];
  };

  const idAdmin = await getId('rol', 'nombre', 'administrador');
  const idPsi   = await getId('rol', 'nombre', 'psicologo');
  const idEst   = await getId('rol', 'nombre', 'estudiante');

  // ── Administradores ──────────────────────────────────────────────
  // SECURITY: contraseñas leídas de variables de entorno, no hardcodeadas
  await dataSource.query(`
    INSERT INTO Usuario (nombre, correo, password_hash, id_rol) VALUES
      ('Administrador', 'admin@unimente.edu',       ?, ?),
      ('Brenda Admin',  'brendaAdmin@unimente.com', ?, ?),
      ('Abril Admin',   'abrilAdmin@unimente.com',  ?, ?),
      ('Mai Admin',     'maiAdmin@unimente.com',    ?, ?)
  `, [
    HASH_ADMIN,  idAdmin,
    HASH_BRENDA, idAdmin,
    HASH_ABRIL,  idAdmin,
    HASH_MAI,    idAdmin,
  ]);

  // ── Psicólogos (12) ──────────────────────────────────────────────
  const psicologos = [
    { nombre: 'Mario Ramos Pérez',        correo: 'psicologo1@unimente.edu',  esp: 'Psicología Clínica',         ced: 'PSI000001', tel: '5545563892' },
    { nombre: 'Valentina Moreno García',  correo: 'psicologo2@unimente.edu',  esp: 'Psicología Educativa',       ced: 'PSI000002', tel: '5557356452' },
    { nombre: 'Carlos Mendoza Ríos',      correo: 'psicologo3@unimente.edu',  esp: 'Terapia Cognitivo-Conductual', ced: 'PSI000003', tel: '5532198765' },
    { nombre: 'Laura Jiménez Torres',     correo: 'psicologo4@unimente.edu',  esp: 'Psicoanálisis',              ced: 'PSI000004', tel: '5549873214' },
    { nombre: 'Roberto Flores Castillo',  correo: 'psicologo5@unimente.edu',  esp: 'Neuropsicología',            ced: 'PSI000005', tel: '5578451230' },
    { nombre: 'Ana Gutiérrez Soto',       correo: 'psicologo6@unimente.edu',  esp: 'Psicología Forense',         ced: 'PSI000006', tel: '5591234567' },
    { nombre: 'Fernando Ruiz Vargas',     correo: 'psicologo7@unimente.edu',  esp: 'Terapia Familiar',           ced: 'PSI000007', tel: '5562340987' },
    { nombre: 'Mónica Mendoza Flores',    correo: 'psicologo8@unimente.edu',  esp: 'Psicología Organizacional',  ced: 'PSI000008', tel: '5543219876' },
    { nombre: 'Eduardo Sánchez Peña',     correo: 'psicologo9@unimente.edu',  esp: 'Psicología Social',          ced: 'PSI000009', tel: '5534567890' },
    { nombre: 'Patricia Medina Reyes',    correo: 'psicologo10@unimente.edu', esp: 'Psicología Infantil',        ced: 'PSI000010', tel: '5523456789' },
    { nombre: 'Jorge Gómez Morales',      correo: 'psicologo11@unimente.edu', esp: 'Psicología Deportiva',       ced: 'PSI000011', tel: '5567890123' },
    { nombre: 'Sofía Castro Herrera',     correo: 'psicologo12@unimente.edu', esp: 'Psicología de la Salud',     ced: 'PSI000012', tel: '5556789012' },
  ];

  for (const p of psicologos) {
    await dataSource.query(
      `INSERT INTO Usuario (nombre, correo, password_hash, id_rol) VALUES (?, ?, ?, ?)`,
      [p.nombre, p.correo, HASH_DEFAULT, idPsi]
    );
    const [[{ id_usuario }]] = await dataSource.query<any>(
      `SELECT id_usuario FROM Usuario WHERE correo = ?`, [p.correo]
    );
    await dataSource.query(
      `INSERT INTO Psicologo (id_usuario, especialidad, cedula, telefono) VALUES (?, ?, ?, ?)`,
      [id_usuario, p.esp, p.ced, p.tel]
    );
  }

  // ── Estudiantes (muestra — 10 para dev) ──────────────────────────
  const carreras = [
    'Ingeniería en Sistemas', 'Arquitectura', 'Medicina',
    'Derecho', 'Administración', 'Psicología', 'Nutrición',
    'Ingeniería Civil', 'Comunicación', 'Contabilidad',
  ];

  for (let i = 1; i <= 10; i++) {
    const correo = `estudiante${i}@unimente.edu`;
    await dataSource.query(
      `INSERT INTO Usuario (nombre, correo, password_hash, id_rol) VALUES (?, ?, ?, ?)`,
      [`Estudiante ${i}`, correo, HASH_DEFAULT, idEst]
    );
    const [[{ id_usuario }]] = await dataSource.query<any>(
      `SELECT id_usuario FROM Usuario WHERE correo = ?`, [correo]
    );
    await dataSource.query(
      `INSERT INTO Estudiante (id_usuario, matricula, carrera) VALUES (?, ?, ?)`,
      [id_usuario, `A${String(i).padStart(7, '0')}`, carreras[(i - 1) % carreras.length]]
    );
  }

  console.log('[Seed] Datos iniciales insertados correctamente.');
}