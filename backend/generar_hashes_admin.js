/**
 * Ejecuta este script en tu máquina (donde ya tienes el backend instalado):
 *
 *   cd backend
 *   node generar_hashes_admin.js
 *
 * Copia los INSERT INTO que genere y ejecutalos en MySQL.
 */

const bcrypt = require('bcrypt');

const admins = [
  { nombre: 'Brenda Admin',  correo: 'brendaAdmin@unimente.com', password: 'Brenda123!'  },
  { nombre: 'Abril Admin',   correo: 'abrilAdmin@unimente.com',  password: 'Abril123!'   },
  { nombre: 'Mai Admin',     correo: 'maiAdmin@unimente.com',    password: 'Mai123!'      },
];

async function main() {
  console.log('USE unimente;\n');
  for (const a of admins) {
    const hash = await bcrypt.hash(a.password, 10);
    console.log(`-- ${a.nombre} / contraseña: ${a.password}`);
    console.log(`INSERT IGNORE INTO Usuario (nombre, correo, password_hash, id_rol)`);
    console.log(`  SELECT '${a.nombre}', '${a.correo}', '${hash}', id_rol`);
    console.log(`  FROM Rol WHERE nombre = 'administrador';\n`);
  }
  console.log('-- Verificar inserciones:');
  console.log("SELECT id_usuario, nombre, correo FROM Usuario WHERE correo LIKE '%Admin%';");
}

main().catch(console.error);