# UniMente — Backend

API GraphQL del Portal de Bienestar Universitario.  
Stack: **NestJS · TypeORM · MySQL 8 · Apollo Server · Passport JWT · @nestjs/schedule**.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación](#2-instalación)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Base de datos](#4-base-de-datos)
5. [Seed de datos de prueba](#5-seed-de-datos-de-prueba)
6. [Iniciar el servidor](#6-iniciar-el-servidor)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Módulos y entidades](#8-módulos-y-entidades)
9. [Autenticación y roles](#9-autenticación-y-roles)
10. [MFA — Autenticación de dos factores](#10-mfa--autenticación-de-dos-factores)
11. [Sistema de respaldos](#11-sistema-de-respaldos)
12. [Restauración de emergencia](#12-restauración-de-emergencia)
13. [API GraphQL — referencia de operaciones](#13-api-graphql--referencia-de-operaciones)
14. [Decisiones técnicas y bugs resueltos](#14-decisiones-técnicas-y-bugs-resueltos)
15. [Scripts disponibles](#15-scripts-disponibles)

---

## 1. Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| MySQL | 8.0 |
| NestJS CLI (opcional) | `npm i -g @nestjs/cli --legacy-peer-deps` |

**Instalar Node.js**

Windows / macOS: https://nodejs.org (instalador LTS)

Linux (Ubuntu / Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 2. Instalación

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend
npm install --legacy-peer-deps
npm install speakeasy qrcode exceljs @nestjs/schedule --legacy-peer-deps
npm install @types/speakeasy @types/qrcode --save-dev --legacy-peer-deps
```

> **Por qué `--legacy-peer-deps`:** Algunas dependencias de NestJS tienen conflictos de `peerDependencies` entre versiones. Esta flag indica a npm que ignore dichos conflictos en lugar de abortar la instalación.

---

## 3. Variables de entorno

Crea el archivo `.env` en `backend/`:

```env
# ================================================================
#  UniMente — Variables de entorno del Backend
#  NUNCA subas .env a Git — está en .gitignore.
# ================================================================

# ─── Base de datos MySQL ─────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=unimente
DB_SYNCHRONIZE=false

# ─── Autenticación JWT ───────────────────────────────────────────
JWT_SECRET=cambia_este_secreto_en_produccion
JWT_EXPIRES=8h

# ─── Restauración de emergencia ──────────────────────────────────
# Solo funciona cuando la tabla Usuario tiene 0 registros.
RESTORE_SECRET=UniMente_Restore_2024_SuperSecreta

# ─── Servidor ────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development
```

**Windows (PowerShell) — alternativa sin .env:**
```powershell
$env:DB_HOST="localhost"; $env:DB_USER="root"; $env:DB_PASSWORD="tu_password"
$env:DB_NAME="unimente"; $env:JWT_SECRET="secreto"; $env:RESTORE_SECRET="clave"
```

**macOS / Linux:**
```bash
export DB_HOST=localhost DB_USER=root DB_PASSWORD=tu_password
export DB_NAME=unimente JWT_SECRET=secreto RESTORE_SECRET=clave
```

---

## 4. Base de datos

### Inicialización automática al arrancar

Al ejecutar `nest start`, el módulo raíz (`app.module.ts`) realiza automáticamente:

1. Conecta a MySQL sin seleccionar BD
2. Lee y ejecuta `src/database/init.sql`:
   - `CREATE DATABASE IF NOT EXISTS unimente`
   - `CREATE TABLE IF NOT EXISTS` para cada tabla
   - Migración segura de columnas `mfa_secret` y `mfa_enabled` en `Usuario`
   - Crea `Backup_Log` y `Backup_Config` si no existen
3. Si `Psicologo` tiene 0 registros → ejecuta el seed automáticamente
4. TypeORM conecta a `unimente` y NestJS arranca

**No hay pasos manuales de migración.**

### Inicialización manual (alternativa)

```bash
# Windows
mysql -u root -p < src\database\init.sql

# macOS / Linux
mysql -u root -p < src/database/init.sql
```

### Por qué `process.cwd()` y no `__dirname`

```typescript
const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
```

`__dirname` apunta a `dist/` cuando el código está compilado y el `.sql` no existe ahí. `process.cwd()` siempre apunta a la raíz del proyecto desde donde se ejecuta `nest start`.

### Esquema de tablas

```
Rol
└── Usuario (id_rol FK)          ← mfa_secret, mfa_enabled
      ├── Estudiante (id_usuario FK)
      │     └── Cita (id_estudiante FK, id_psicologo FK)
      │           └── Sesion (id_cita FK, UNIQUE)
      └── Psicologo (id_usuario FK)
            ├── Horario_Psicologo (id_psicologo FK)
            └── Historial_Clinico (id_estudiante FK, id_psicologo FK)
                  └── Detalle_Historial (id_historial FK, id_sesion FK)

Backup_Log     ← registro de cada backup realizado
Backup_Config  ← parámetros del backup automático
```

### Columna `estado` en Cita

```sql
estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
```

`VARCHAR` en lugar de `ENUM` de MySQL. Ver sección [14](#14-decisiones-técnicas-y-bugs-resueltos).

---

## 5. Seed de datos de prueba

### Ejecución automática

Corre solo la primera vez (tabla `Psicologo` vacía). Reinicios posteriores muestran:
```
BD ya tiene datos (12 psicólogos). Seed omitido.
```

### Ejecución manual

```bash
# Windows
npx ts-node -r tsconfig-paths/register src\seed\seed.ts

# macOS / Linux
npm run seed
```

### Registros generados

| Tabla | Registros |
|---|---|
| Administradores | 4 |
| Psicólogos | 12 |
| Horarios de psicólogo | ~42 |
| Estudiantes | 80 |
| Citas (PENDIENTE / ASISTIDA / CANCELADA) | ~450 |
| Sesiones clínicas | ~240 |
| Historiales clínicos | ~90 |
| Detalles de historial | ~240 |
| **Total** | **~1 100+** |

### Credenciales del seed

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador principal | admin@unimente.edu | Admin1234! |
| Administrador | brendaAdmin@unimente.com | Brenda123! |
| Administrador | abrilAdmin@unimente.com | Abril123! |
| Administrador | maiAdmin@unimente.com | Mai123! |
| Psicólogos | psicologo1@unimente.edu … psicologo12@unimente.edu | Password123! |
| Estudiantes | estudiante1@unimente.edu … estudiante80@unimente.edu | Password123! |

Los 4 admins se crean con `bcrypt.hash()` en tiempo de ejecución — los hashes siempre coinciden con sus contraseñas.

---

## 6. Iniciar el servidor

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod
```

| URL | Descripción |
|---|---|
| `http://localhost:3000/graphql` (POST) | API GraphQL |
| `http://localhost:3000/graphql` (GET en navegador) | Apollo Sandbox embebido |
| `http://localhost:3000/api/emergency-restore` (POST) | Restauración de emergencia |

---

## 7. Estructura del proyecto

```
backend/
├── Backup/                        # Archivos de respaldo (creada automáticamente)
│
├── src/
│   ├── app.module.ts              # Init BD + seed + ScheduleModule
│   ├── main.ts                    # Bootstrap + Apollo Sandbox
│   │
│   ├── database/
│   │   └── init.sql               # CREATE IF NOT EXISTS + migración MFA + Backup tables
│   │
│   ├── seed/
│   │   └── seed.ts                # ~1 100 registros + 4 admins con bcrypt real
│   │
│   ├── mfa/
│   │   ├── mfa.module.ts
│   │   ├── mfa.service.ts         # TOTP speakeasy, window=2, coerción TINYINT
│   │   ├── mfa.resolver.ts
│   │   └── dto/mfa.dto.ts
│   │
│   ├── backup/
│   │   ├── backup.module.ts       # Registra EmergencyRestoreController
│   │   ├── backup.service.ts      # SQL/JSON/CSV/Excel + scheduler + métodos emergencia
│   │   ├── backup.resolver.ts     # Mutations GraphQL (solo admin autenticado)
│   │   ├── emergency-restore.controller.ts  # REST endpoint sin JWT
│   │   ├── dto/backup.dto.ts      # @IsOptional + @IsString en codigo_mfa
│   │   └── entities/
│   │       ├── backup-log.entity.ts
│   │       └── backup-config.entity.ts
│   │
│   ├── auth/
│   ├── common/
│   │   ├── decorators/            # @CurrentUser, @Roles
│   │   ├── enums/                 # estado-cita.enum.ts, rol.enum.ts
│   │   └── guards/                # JwtAuthGuard, RolesGuard
│   │
│   ├── rol/
│   ├── usuario/                   # mfa_secret, mfa_enabled en entidad
│   ├── estudiante/
│   ├── psicologo/
│   ├── horario-psicologo/
│   ├── cita/
│   ├── sesion/
│   ├── historial-clinico/
│   └── detalle-historial/
│
├── .env
└── package.json
```

---

## 8. Módulos y entidades

### Roles del sistema

| Rol | Descripción |
|---|---|
| `administrador` | Gestiona psicólogos, backups y seguridad |
| `psicologo` | Agenda, sesiones, horarios |
| `estudiante` | Busca psicólogos, agenda y cancela citas |

### Estados de cita

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Cita agendada, aún no ocurrida |
| `ASISTIDA` | Marcada automáticamente al registrar sesión |
| `CANCELADA` | Cancelada por estudiante o psicólogo |

### Campos MFA en Usuario

| Campo | Tipo MySQL | Descripción |
|---|---|---|
| `mfa_secret` | VARCHAR(255) NULL | Secreto TOTP base32 — nunca expuesto en GraphQL |
| `mfa_enabled` | TINYINT(1) DEFAULT 0 | 1 = MFA activo |

### Flujo de sesión clínica (transacción única)

```
registrarSesion()
  ├── INSERT Sesion
  ├── UPDATE Cita SET estado = 'ASISTIDA'   ← SQL directo
  ├── FIND OR CREATE Historial_Clinico
  └── INSERT Detalle_Historial
Si cualquier paso falla → ROLLBACK
```

---

## 9. Autenticación y roles

### Login

```graphql
mutation {
  login(input: { correo: "admin@unimente.edu", password: "Admin1234!" }) {
    access_token  rol  nombre  correo  id_perfil
  }
}
```

### Cabecera JWT

```
Authorization: Bearer <access_token>
```

### IDs de perfil resueltos en el backend

`id_estudiante` e `id_psicologo` nunca vienen del cliente — siempre se obtienen del JWT.

---

## 10. MFA — Autenticación de dos factores

Implementado con el estándar **TOTP (RFC 6238)** compatible con Google Authenticator, Microsoft Authenticator y Authy.

### Flujo de activación

```
1. mutation setupMfa
   → genera secreto TOTP + devuelve { qr_code (PNG base64), secret (base32) }

2. Usuario escanea el QR con su app

3. mutation habilitarMfa(input: { codigo: "123456" })
   → verifica primer código y activa MFA

4. A partir de aquí, backup/restauración requieren código válido
```

### MFA obligatorio para respaldos

Si la cuenta tiene MFA activo, las operaciones de backup y restauración **siempre** requieren un código TOTP válido. Si la cuenta no tiene MFA configurado, estas operaciones son rechazadas con el mensaje:

> *"Debes configurar MFA antes de realizar respaldos o restauraciones."*

### Cambio de contraseña

El cambio de contraseña desde la pantalla de login **siempre requiere** el código MFA de 6 dígitos, sin excepción. Esto previene que alguien con acceso físico al dispositivo cambie la contraseña de otra persona.

### Operaciones MFA disponibles

| Operación | Requiere | Descripción |
|---|---|---|
| `setupMfa` | JWT | Genera secreto TOTP y QR |
| `habilitarMfa(codigo)` | JWT | Activa MFA |
| `deshabilitarMfa(codigo)` | JWT + código | Desactiva MFA |
| `verificarMfa(codigo)` | JWT | Verificación puntual |
| `cambiarPassword(input)` | JWT + MFA obligatorio | Cambia contraseña |
| `miEstadoMfa` | JWT | Consulta estado de MFA |

### Ventana de tolerancia TOTP

`window: 2` en speakeasy → acepta códigos dentro de ±60 segundos. Compensa desfases de reloj entre el servidor y el dispositivo del usuario.

---

## 11. Sistema de respaldos

Solo el rol **administrador** puede ejecutar backups. **MFA es obligatorio** — sin MFA configurado en la cuenta, la operación es rechazada.

Los archivos se guardan en `backend/Backup/` (creada automáticamente al arrancar).

### Formato de nombre de los archivos

Los backups se guardan con fecha y hora en formato legible espanol:



Formato: `backup_{TIPO}_{DD-MM-YYYY}_{HH-MMam/pm}.{ext}`

### Tipos de backup

| Tipo | Qué incluye |
|---|---|
| `COMPLETO` | Todos los registros de todas las tablas |
| `DIFERENCIAL` | Solo registros nuevos desde el último backup `COMPLETO` |
| `INCREMENTAL` | Solo registros nuevos desde el último backup de cualquier tipo |

### Formatos

| Formato | Descripción |
|---|---|
| `SQL` | Script ejecutable: `TRUNCATE+INSERT` (completo) o `REPLACE INTO` (parciales) |
| `JSON` | Objeto con metadata + datos por tabla |
| `CSV` | Secciones separadas por tabla con encabezados |
| `EXCEL` | `.xlsx` con una hoja por tabla, cabecera coloreada |

### Backup manual (GraphQL)

```graphql
mutation {
  crearBackup(input: { tipo: "COMPLETO", formato: "SQL", codigo_mfa: "123456" }) {
    id_backup  nombre_archivo  tamanio_kb  created_at
  }
}
```

### Backup automático

Al configurar el backup automático se ejecuta un **backup inmediato de seguridad**. Luego `@Cron(EVERY_HOUR)` verifica cada hora si ha transcurrido `frecuencia_horas`.

```graphql
mutation {
  configurarBackupAutomatico(input: {
    tipo: "COMPLETO", formato: "SQL", frecuencia_horas: 24, codigo_mfa: "123456"
  }) { id tipo formato frecuencia_horas activo ultima_ejecucion }
}
```

### Límite de 3 backups

`pruneBackups()` elimina el archivo físico **y** el registro en BD de los backups más antiguos cuando se supera el límite de 3.

### Fix crítico: `@IsOptional()` en `codigo_mfa`

El `ValidationPipe` de NestJS con `whitelist: true` elimina campos sin decoradores de `class-validator`. `codigo_mfa` necesita `@IsOptional() @IsString()` para que el pipe no lo borre antes de llegar al servicio.

---

## 12. Restauración de emergencia

Diseñada para el escenario donde la BD fue eliminada o corrompida y no hay usuarios para hacer login.

### Endpoint

```
POST http://localhost:3000/api/emergency-restore
```

### Headers requeridos

```
Content-Type: application/json
X-Restore-Secret: <valor de RESTORE_SECRET en .env>
```

### Body

```json
{ "id_backup": 1 }
```

o por nombre de archivo:

```json
{ "backup_filename": "backup_COMPLETO_2026-03-14T23-03-08.sql" }
```

### Condiciones de activación (TODAS deben cumplirse)

1. `SELECT COUNT(*) FROM Usuario` devuelve `0`
2. `X-Restore-Secret` coincide exactamente con `RESTORE_SECRET` en `.env`
3. Se proporciona `id_backup` o `backup_filename`

Si la BD tiene aunque sea un usuario, el endpoint devuelve `401 Unauthorized`.

### Desde el frontend

```
http://localhost:5173/emergency-restore
```

Página pública (sin login) con **dashboard de backups disponibles**. Muestra los 3 respaldos más recientes de `backend/Backup/` con nombre, tipo, formato, tamaño y fecha. El administrador selecciona el backup con un clic y escribe la clave secreta — sin necesidad de buscar archivos manualmente. Al completar la restauración, **redirige automáticamente a `/login`** tras 2.5 segundos.

Endpoint público adicional `GET /api/emergency-backups` — sin JWT, lee el filesystem y combina con `Backup_Log` si la BD tiene datos. Devuelve hasta 3 backups ordenados por fecha descendente.

### Seguridad del endpoint

| Capa | Descripción |
|---|---|
| BD vacía | Si hay usuarios, el endpoint está bloqueado permanentemente |
| RESTORE_SECRET | Clave del servidor — no viaja en el código fuente |
| Sin exponer en menús | La URL no aparece en ningún enlace de la app |

---

## 13. API GraphQL — referencia de operaciones

### Públicas (sin token)

```graphql
mutation RegistrarEstudiante($input: CreateEstudianteInput!) {
  registrarEstudiante(input: $input) { id_estudiante usuario { nombre } }
}
mutation Login($correo: String!, $password: String!) {
  login(input: { correo: $correo, password: $password }) {
    access_token  rol  nombre  correo  id_perfil
  }
}
```

### MFA (cualquier usuario autenticado)

```graphql
query  { miEstadoMfa { mfa_enabled } }
mutation { setupMfa { qr_code secret } }
mutation { habilitarMfa(input:    { codigo: "123456" }) }
mutation { deshabilitarMfa(input: { codigo: "123456" }) }
mutation { verificarMfa(input:    { codigo: "123456" }) }
mutation {
  cambiarPassword(input: {
    password_actual: "Admin1234!"
    password_nuevo:  "NuevoPass456!"
    codigo_mfa:      "123456"
  })
}
```

### Administrador — psicólogos

```graphql
query { psicologos {
  id_psicologo especialidad cedula telefono
  usuario { nombre correo }
  horarios { dia_semana hora_inicio hora_fin disponible }
} }
mutation RegistrarPsicologo($input: CreatePsicologoInput!) {
  registrarPsicologo(input: $input) { id_psicologo usuario { nombre } }
}
mutation ActualizarPsicologo($id: Int!, $input: UpdatePsicologoInput!) {
  actualizarPsicologo(id: $id, input: $input) { id_psicologo especialidad }
}
```

### Administrador — backups

```graphql
query  { listarBackups { id_backup tipo formato nombre_archivo tamanio_kb modo created_at } }
query  { configBackupAutomatico { tipo formato frecuencia_horas activo ultima_ejecucion } }
mutation { crearBackup(input: { tipo:"COMPLETO", formato:"SQL", codigo_mfa:"123456" }) {
  id_backup nombre_archivo tamanio_kb created_at }
}
mutation { restaurarBackup(input: { id_backup: 1, codigo_mfa: "123456" }) }
mutation { configurarBackupAutomatico(input: {
  tipo:"COMPLETO", formato:"SQL", frecuencia_horas: 24, codigo_mfa:"123456"
}) { id tipo formato frecuencia_horas activo } }
```

### Psicólogo

```graphql
query AgendaPsicologo($id_psicologo: Int!) {
  agendaPsicologo(id_psicologo: $id_psicologo) {
    id_cita fecha hora_inicio hora_fin estado motivo
    estudiante { usuario { nombre } matricula carrera }
    sesion { id_sesion }
  }
}
mutation { crearHorario(input: $input) { id_horario dia_semana hora_inicio hora_fin } }
mutation { eliminarHorario(id: $id) }
mutation { cambiarEstadoCita(id_cita: $id, input: $input) { id_cita estado } }
mutation { registrarSesion(input: $input) { id_sesion numero_sesion notas } }
query ExpedienteEstudiante($id_estudiante: Int!) {
  expedienteEstudiante(id_estudiante: $id_estudiante) {
    id_historial detalles { sesion { notas recomendaciones } }
  }
}
```

### Estudiante

```graphql
query { psicologos {
  id_psicologo especialidad usuario { nombre correo }
  horarios { id_horario dia_semana hora_inicio hora_fin disponible }
} }
mutation { agendarCita(input: $input) { id_cita fecha hora_inicio estado } }
query CitasEstudiante($id_estudiante: Int!) {
  citasEstudiante(id_estudiante: $id_estudiante) {
    id_cita fecha hora_inicio hora_fin estado motivo
    psicologo { especialidad usuario { nombre } }
  }
}
mutation { cambiarEstadoCita(id_cita: $id, input: { estado: CANCELADA }) { id_cita estado } }
```

---

## 14. Decisiones técnicas y bugs resueltos

### Bug 1 — `estado` como VARCHAR en lugar de ENUM

**Síntoma:** `Enum "EstadoCita" cannot represent value: ""`

**Causa:** TypeORM con `@Column({ type: 'enum' })` puede devolver el campo vacío en memoria tras un raw SQL update. `@Field(() => EstadoCita)` falla al serializar `""`.

**Solución:**
```sql
estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
```
```typescript
@Column({ type: 'varchar', length: 20 })
estado: string;
@Field()  // String implícito — no EstadoCita
estado: string;
```
Todas las escrituras de estado usan `dataSource.query('UPDATE Cita SET estado = ?', [valor, id])`.

### Bug 2 — `ENOENT: init.sql not found` al compilar

**Causa:** `__dirname` apunta a `dist/` en producción.  
**Solución:** `join(process.cwd(), 'src', 'database', 'init.sql')`.

### Bug 3 — Admin con contraseña incorrecta en arranque inicial

**Causa:** `init.sql` tenía un hash hardcodeado de la palabra `password`, no de `Admin1234!`.  
**Solución:** El seed genera el hash con `bcrypt.hash('Admin1234!', 10)` en runtime. Los 4 admins del equipo (admin, brenda, abril, mai) se crean todos en el seed.

### Bug 4 — `Column 'id_rol' cannot be null` en el seed

**Causa:** Desestructuración frágil `[[{ id_rol }]]` de resultados de `mysql2`.  
**Solución:** Helper `getId()` que accede al valor por posición:
```typescript
async function getId(conn, sql, params): Promise<number> {
  const [rows] = await conn.query(sql, params);
  return Number(Object.values((rows as any[])[0])[0]);
}
```

### Bug 5 — TINYINT no es boolean en TypeScript

**Causa:** MySQL devuelve `mfa_enabled` como `0`/`1` (número). En algunos contextos de serialización de TypeORM puede llegar como string `"1"` o `true`.

**Solución:** Normalizar siempre con `Number()`:
```typescript
const mfaActivo = Number(usuario.mfa_enabled) === 1 && !!usuario.mfa_secret;
```
Aplicado en todas las verificaciones de `mfa_enabled` en `mfa.service.ts`.

### Bug 6 — `ValidationPipe` elimina `codigo_mfa` silenciosamente

**Causa:** `whitelist: true` en `main.ts` elimina cualquier campo del DTO que no tenga al menos un decorador de `class-validator`. `codigo_mfa` solo tenía `@Field()` (decorador GraphQL), sin `@IsOptional()` ni `@IsString()`.

**Solución:**
```typescript
@Field({ nullable: true })
@IsOptional()
@IsString()
codigo_mfa?: string;
```

### Bug 7 — Código TOTP rechazado aunque sea correcto

**Causas:**
1. `window: 1` solo acepta ±30s — si el reloj del teléfono tiene más desfase, el código válido queda fuera del rango.
2. La verificación no limpiaba espacios ni caracteres no numéricos antes de verificar.

**Solución:**
```typescript
verifyCode(secret: string, codigo: string): boolean {
  const token = codigo.replace(/\s/g, '').replace(/\D/g, '');
  if (token.length !== 6) return false;
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 });
}
```

### Bug 8 — Error de MFA persistía en modal aunque el usuario corrigiera el código

**Causa:** `error` de `useMutation` de Apollo no se limpia al cambiar el estado local del formulario — solo se borra cuando la mutation se vuelve a ejecutar.

**Solución:** Estado local `backupError` que se limpia explícitamente al abrir el modal, al cambiar cualquier dígito del código, y al cerrar o cancelar. El `onError` del mutation lo asigna en lugar de depender de `errCreate`.

### Diseño del endpoint de restauración de emergencia

Resuelve el problema "huevo y gallina": si la BD fue eliminada no hay usuarios, sin usuarios no hay JWT, sin JWT no hay autorización. La solución:

- Endpoint REST público `/api/emergency-restore` (no GraphQL)
- Solo se activa cuando `COUNT(*) FROM Usuario = 0`
- Protegido por `RESTORE_SECRET` del `.env` del servidor (header `X-Restore-Secret`)
- Una vez restaurada la BD, el endpoint queda bloqueado permanentemente porque hay usuarios

---

## 15. Scripts disponibles

```json
{
  "scripts": {
    "start":       "node dist/main",
    "start:dev":   "nest start --watch",
    "start:prod":  "node dist/main",
    "build":       "nest build",
    "seed":        "ts-node -r tsconfig-paths/register src/seed/seed.ts"
  }
}
```

| Comando | Descripción |
|---|---|
| `npm install --legacy-peer-deps` | Instalar dependencias base |
| `npm install speakeasy qrcode exceljs @nestjs/schedule --legacy-peer-deps` | Paquetes MFA y Backup |
| `npm install @types/speakeasy @types/qrcode --save-dev --legacy-peer-deps` | Tipos de desarrollo |
| `npm run start:dev` | Servidor con hot-reload |
| `npm run build` | Compilar a `dist/` |
| `npm run start:prod` | Servidor desde `dist/` |
| `npm run seed` | Reiniciar BD con datos de prueba |