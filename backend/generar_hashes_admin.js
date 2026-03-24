/**
 * generar_hashes_admin.js
 *
 * Utilidad de línea de comandos para generar hashes bcrypt de contraseñas
 * de administradores. Se ejecuta manualmente cuando se necesita cambiar
 * las contraseñas del seed.
 *
 * SECURITY — OWASP A02/CWE-798 Use of Hardcoded Passwords:
 *   La versión original contenía contraseñas en texto plano hardcodeadas.
 *   Snyk (CWE-798, score 584) detectó este patrón como riesgo crítico porque:
 *   - Cualquiera con acceso al repositorio conoce las contraseñas
 *   - Las contraseñas quedan en el historial de Git permanentemente
 *   - Si el repo es público, las credenciales quedan expuestas globalmente
 *
 *   Mitigación aplicada:
 *   1. Las contraseñas se pasan como argumentos de línea de comandos
 *      o se leen de variables de entorno — nunca hardcodeadas en el código
 *   2. Se genera un hash bcrypt por cada contraseña recibida
 *   3. El resultado se imprime en consola para copiarlo al .env
 *
 * Uso:
 *   # Generar hash de una contraseña interactivamente
 *   node generar_hashes_admin.js
 *
 *   # O pasar la contraseña como argumento (útil en scripts CI/CD)
 *   node generar_hashes_admin.js MiContrasenaSegura123!
 *
 *   # O leer desde variable de entorno
 *   ADMIN_PWD=MiContrasena123! node generar_hashes_admin.js
 *
 * OWASP: A02:2021 Cryptographic Failures / A07:2021 Identification & Authentication
 */

const bcrypt   = require('bcrypt');
const readline = require('readline');
const crypto   = require('crypto');

const SALT_ROUNDS = 10;

/**
 * Valida que la contraseña cumpla requisitos mínimos de seguridad.
 * OWASP ASVS v4.0 — 2.1.1: Minimum 12 characters recommended
 */
function validatePassword(pwd) {
  const errors = [];
  if (pwd.length < 8)             errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(pwd))        errors.push('Al menos una mayúscula');
  if (!/[a-z]/.test(pwd))        errors.push('Al menos una minúscula');
  if (!/[0-9]/.test(pwd))        errors.push('Al menos un número');
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('Al menos un carácter especial');
  return errors;
}

async function generarHash(password) {
  const errors = validatePassword(password);
  if (errors.length > 0) {
    console.error('\n[Error] La contraseña no cumple los requisitos de seguridad:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return hash;
}

async function main() {
  // ── Opción 1: contraseña en argumento de CLI ─────────────────────
  const cliArg = process.argv[2];
  if (cliArg) {
    const hash = await generarHash(cliArg);
    console.log('\nHash generado:');
    console.log(`  ${hash}`);
    console.log('\nCopia este valor en tu .env o en seed.ts');
    return;
  }

  // ── Opción 2: contraseña en variable de entorno ───────────────────
  const envPwd = process.env.ADMIN_PWD;
  if (envPwd) {
    const hash = await generarHash(envPwd);
    console.log('\nHash generado desde ADMIN_PWD:');
    console.log(`  ${hash}`);
    return;
  }

  // ── Opción 3: sugerir una contraseña aleatoria segura ─────────────
  console.log('\n=== Generador de hashes para administradores de UniMente ===\n');
  console.log('Sugerencia de contraseña segura generada aleatoriamente:');

  // Generar contraseña aleatoria que cumpla los requisitos
  const random = crypto.randomBytes(16).toString('base64url');
  const suggestion = `Um${random.slice(0, 10)}!9`;
  console.log(`  ${suggestion}\n`);
  console.log('Puedes usarla o ingresar la tuya propia.\n');

  // ── Opción 4: lectura interactiva (oculta la entrada) ────────────
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  // Ocultar la entrada en la terminal
  const question = (prompt) => new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdout.write(prompt);
      process.stdin.setRawMode(true);
      let input = '';
      process.stdin.on('data', (char) => {
        const c = char.toString();
        if (c === '\n' || c === '\r') {
          process.stdin.setRawMode(false);
          process.stdout.write('\n');
          resolve(input);
        } else if (c === '\u0003') {
          process.exit();
        } else if (c === '\u007f') {
          input = input.slice(0, -1);
        } else {
          input += c;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(prompt, resolve);
    }
  });

  const admins = [
    { key: 'SEED_ADMIN_PASSWORD',        label: 'Admin principal (admin@unimente.edu)' },
    { key: 'SEED_ADMIN_BRENDA_PASSWORD', label: 'Brenda Admin' },
    { key: 'SEED_ADMIN_ABRIL_PASSWORD',  label: 'Abril Admin' },
    { key: 'SEED_ADMIN_MAI_PASSWORD',    label: 'Mai Admin' },
    { key: 'SEED_DEFAULT_PASSWORD',      label: 'Psicólogos y estudiantes de prueba' },
  ];

  console.log('Ingresa las contraseñas para cada admin (mín. 8 chars, 1 mayús, 1 núm, 1 especial):\n');

  const results = [];
  for (const admin of admins) {
    const pwd  = await question(`  ${admin.label}: `);
    const hash = await generarHash(pwd);
    results.push({ key: admin.key, hash });
  }

  rl.close();

  // ── Mostrar resultado para copiar al .env ────────────────────────
  console.log('\n=== Copia estas líneas en tu archivo .env ===\n');
  results.forEach(r => console.log(`${r.key}=`));
  console.log('\nNOTA: No guardes los hashes en .env — guarda las contraseñas originales.');
  console.log('El seed las hashea en tiempo de ejecución con bcrypt.\n');
}

main().catch(err => {
  console.error('[Error]', err.message);
  process.exit(1);
});