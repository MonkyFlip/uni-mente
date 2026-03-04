-- =============================================================================
-- UniMente — Seed inicial de base de datos
-- Ejecutar UNA vez después del primer `npm run start:dev`
-- La BD y las tablas se crean automáticamente con synchronize:true (desarrollo)
-- =============================================================================

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS unimente CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unimente;

-- Insertar los tres roles del sistema
INSERT IGNORE INTO `Rol` (nombre) VALUES
  ('administrador'),
  ('psicologo'),
  ('estudiante');

-- Crear usuario administrador por defecto
-- Contraseña: Admin1234! (bcrypt hash)
INSERT IGNORE INTO `Usuario` (nombre, correo, password_hash, id_rol)
SELECT
  'Administrador UniMente',
  'admin@unimente.edu',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
  id_rol
FROM `Rol`
WHERE nombre = 'administrador'
LIMIT 1;

-- Nota: cambia el hash con una contraseña segura en producción.
-- Genera uno con: node -e "const b=require('bcrypt');b.hash('TuPassword',10).then(console.log)"
