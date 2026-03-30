# UniMente — Backend

API GraphQL del Portal de Bienestar Universitario.  
Stack: **NestJS · TypeORM · SQL Server 2022 · Apollo Server · Passport JWT · @nestjs/schedule**.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación sin Docker](#2-instalación-sin-docker)
3. [Instalación con Docker (recomendado)](#3-instalación-con-docker-recomendado)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Base de datos](#5-base-de-datos)
6. [Seed de datos de prueba](#6-seed-de-datos-de-prueba)
7. [Iniciar el servidor](#7-iniciar-el-servidor)
8. [Estructura del proyecto](#8-estructura-del-proyecto)
9. [Módulos y entidades](#9-módulos-y-entidades)
10. [Autenticación y roles](#10-autenticación-y-roles)
11. [MFA — Autenticación de dos factores](#11-mfa--autenticación-de-dos-factores)
12. [Sistema de respaldos](#12-sistema-de-respaldos)
13. [Restauración de emergencia](#13-restauración-de-emergencia)
14. [OWASP Top 10 — Mitigaciones implementadas](#14-owasp-top-10--mitigaciones-implementadas)
15. [API GraphQL — Referencia de operaciones](#15-api-graphql--referencia-de-operaciones)
16. [Diferencias MySQL → MSSQL](#16-diferencias-mysql--mssql)
17. [Decisiones técnicas y bugs resueltos](#17-decisiones-técnicas-y-bugs-resueltos)
18. [Scripts disponibles](#18-scripts-disponibles)

---

## 1. Requisitos

### Sin Docker

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS |
| npm | 9 |
| SQL Server | 2019 o 2022 |
| NestJS CLI (opcional) | `npm i -g @nestjs/cli --legacy-peer-deps` |

**Instalar Node.js**

Windows / macOS: https://nodejs.org (instalador LTS)

Linux (Ubuntu / Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Con Docker (recomendado)

| Herramienta | Versión mínima |
|---|---|
| Docker Engine | 24 |
| Docker Compose | v2 (integrado en Docker Desktop) |

> **Nota:** Docker Compose v2 usa `docker compose` (sin guión). Si tienes v1 instalado (`docker-compose`), actualiza Docker Desktop o instala el plugin.

---

## 2. Instalación sin Docker

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend
npm install --legacy-peer-deps
```

> **¿Por qué `--legacy-peer-deps`?** Algunas dependencias de NestJS tienen conflictos de `peerDependencies` entre versiones menores. Esta flag indica a npm que ignore dichos conflictos en lugar de abortar la instalación.

---

## 3. Instalación con Docker (recomendado)

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend

# 1. Configurar variables de entorno
cp .env.example .env
# Editar .env: cambiar DB_PASSWORD, JWT_SECRET y RESTORE_SECRET

# 2. Primera vez — construye imagen y levanta contenedores
docker compose up --build

# 3. Reinicios posteriores (sin reconstruir)
docker compose up -d
```

### ¿Qué levanta docker compose?

| Servicio | Imagen | Puerto host |
|---|---|---|
| `db` | `mcr.microsoft.com/mssql/server:2022-CU13-ubuntu-22.04` | `1433` |
| `backend` | Imagen local (multi-stage build) | `3000` |

El backend espera el healthcheck de SQL Server antes de arrancar. Una vez saludable, crea la base de datos `unimente`, ejecuta el SQL de inicialización y el seed si la BD está vacía.

### Comandos útiles de Docker

```bash
# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f db

# Reiniciar solo el backend (sin reconstruir)
docker compose restart backend

# Reconstruir imagen después de cambios en código
docker compose up --build backend

# Detener todo y eliminar contenedores (los volúmenes se conservan)
docker compose down

# Detener todo y eliminar también los volúmenes (borra datos de la BD)
docker compose down -v

# Entrar al contenedor del backend
docker exec -it unimente-backend sh

# Conectar a SQL Server desde el contenedor db
docker exec -it unimente-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "TuPassword" -C
```

### Primera ejecución — salida esperada

```
unimente-backend | Base de datos MSSQL inicializada correctamente.
unimente-backend | BD vacia — ejecutando seed de datos de prueba...
unimente-backend |   Seed completado:
unimente-backend |     Admins: 4  |  Psicologos: 12  |  Horarios: ~42
unimente-backend |     Estudiantes: 80  |  Citas: ~450
unimente-backend |     Sesiones: ~240  |  Historiales: ~90
unimente-backend | UniMente Backend corriendo en http://localhost:3000/graphql
```

---

## 4. Variables de entorno

Crear el archivo `.env` en `backend/` (copiar desde `.env.example`):

```env
# ================================================================
#  UniMente Backend — Variables de entorno (MSSQL)
#  NUNCA subas .env a Git — ya está en .gitignore.
# ================================================================

# ─── SQL Server ───────────────────────────────────────────────────
DB_HOST=localhost          # Con Docker: nombre del servicio "db"
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=UniMente_DB_2026!    # >= 8 chars, mayus+minus+num+especial
DB_NAME=unimente
DB_TRUST_CERT=true         # false en producción (certificado TLS real)

# ─── JWT ──────────────────────────────────────────────────────────
# Mínimo 32 caracteres aleatorios — cambia en producción
JWT_SECRET=cambia_este_secreto_por_uno_aleatorio_de_minimo_32_chars
JWT_EXPIRES=8h

# ─── Restauración de emergencia ───────────────────────────────────
# Solo activo cuando Usuario tiene 0 registros
RESTORE_SECRET=UniMente_Restore_2026_SuperSecreta_Cambiar_En_Prod

# ─── Servidor ─────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development       # production desactiva introspection, stacktraces

# ─── CORS (lista blanca de orígenes) ──────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# ─── Contraseñas del Seed (CWE-547 fix) ───────────────────────────
SEED_ADMIN_PASSWORD=Admin1234!
SEED_ADMIN_BRENDA_PASSWORD=Brenda123!
SEED_ADMIN_ABRIL_PASSWORD=Abril123!
SEED_ADMIN_MAI_PASSWORD=Mai123!
SEED_DEFAULT_PASSWORD=Password123!
```

### Diferencias entre `development` y `production`

| Comportamiento | `development` | `production` |
|---|---|---|
| Stacktrace en errores | Incluido en respuesta | Nunca incluido |
| Apollo Introspection | Habilitado | Deshabilitado |
| Apollo Playground | Deshabilitado (ambos) | Deshabilitado |
| TLS (`encrypt`) en MSSQL | `false` (cert auto-firmado OK) | `true` obligatorio |
| `trustServerCertificate` | `true` | `false` |
| Logger NestJS | error+warn+log+debug | Solo error+warn |

---

## 5. Base de datos

### Inicialización automática al arrancar

Al ejecutar `nest start`, el módulo raíz (`app.module.ts`) realiza automáticamente:

1. Conecta a SQL Server usando la base de datos `master`
2. Lee y ejecuta `src/database/init.sql` por batches separados por `GO`:
   - `CREATE DATABASE IF NOT EXISTS unimente`
   - `CREATE TABLE IF OBJECT_ID(...) IS NULL` para cada tabla
   - Migración segura de columnas `mfa_secret` y `mfa_enabled` en `Usuario`
   - Crea `Backup_Log` y `Backup_Config` si no existen
3. Si `Psicologo` tiene 0 registros → ejecuta el seed automáticamente
4. TypeORM conecta a `unimente` y NestJS arranca

**No hay pasos manuales de migración.**

### Inicialización manual (alternativa)

```bash
# Usando sqlcmd
sqlcmd -S localhost -U sa -P TuPassword -i src/database/init.sql -C

# Desde el contenedor Docker
docker exec -i unimente-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P TuPassword -C \
  -i /dev/stdin < src/database/init.sql
```

### Esquema de tablas

```
Rol
└── Usuario (id_rol FK)          ← mfa_secret, mfa_enabled (BIT)
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

### Tipos de datos SQL Server usados

| Concepto | Tipo MSSQL | Equivalente MySQL |
|---|---|---|
| Texto variable corto | `NVARCHAR(n)` | `VARCHAR(n)` |
| Texto largo | `NVARCHAR(MAX)` | `TEXT` |
| Boolean | `BIT` | `TINYINT(1)` |
| Fecha+hora | `DATETIME2` | `DATETIME` |
| Auto-increment | `IDENTITY(1,1)` | `AUTO_INCREMENT` |

### Columna `estado` en Cita

```sql
estado NVARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
```

Se almacena como `NVARCHAR`, no como un tipo `ENUM` (que SQL Server tampoco tiene nativamente). Valores válidos: `PENDIENTE`, `ASISTIDA`, `CANCELADA`.

Ver sección [17. Decisiones técnicas](#17-decisiones-técnicas-y-bugs-resueltos) para la explicación completa del bug de TypeORM.

---

## 6. Seed de datos de prueba

### Ejecución automática

Corre solo la primera vez que se levanta el servidor (tabla `Psicologo` vacía). Reinicios posteriores muestran:

```
BD ya tiene datos (12 psicologos). Seed omitido.
```

### Ejecución manual

Para reiniciar la BD con datos frescos:

```bash
# macOS / Linux
npm run seed

# Windows
npx ts-node -r tsconfig-paths/register src\seed\seed.ts

# Desde Docker (reconstruye el seed en el contenedor corriendo)
docker exec unimente-backend node -e "
  const { runSeed } = require('./dist/seed/seed');
  // ... requiere pool activo — usar npm run seed fuera de Docker
"
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
| **Total** | **~1 200+** |

### Credenciales generadas

| Rol | Correo | Contraseña | Variable de entorno |
|---|---|---|---|
| Administrador principal | admin@unimente.edu | `$SEED_ADMIN_PASSWORD` | `SEED_ADMIN_PASSWORD` |
| Brenda Admin | brendaAdmin@unimente.com | `$SEED_ADMIN_BRENDA_PASSWORD` | `SEED_ADMIN_BRENDA_PASSWORD` |
| Abril Admin | abrilAdmin@unimente.com | `$SEED_ADMIN_ABRIL_PASSWORD` | `SEED_ADMIN_ABRIL_PASSWORD` |
| Mai Admin | maiAdmin@unimente.com | `$SEED_ADMIN_MAI_PASSWORD` | `SEED_ADMIN_MAI_PASSWORD` |
| Psicólogos | psicologo1…12@unimente.edu | `$SEED_DEFAULT_PASSWORD` | `SEED_DEFAULT_PASSWORD` |
| Estudiantes | estudiante1…80@unimente.edu | `$SEED_DEFAULT_PASSWORD` | `SEED_DEFAULT_PASSWORD` |

**CWE-547 / CWE-798 fix:** Las contraseñas nunca están hardcodeadas en el código. Se leen desde variables de entorno y los hashes se generan con `bcrypt.hash()` en runtime con 12 rounds. Si una variable no está configurada en desarrollo, se genera una contraseña aleatoria y se imprime en consola con una advertencia.

---

## 7. Iniciar el servidor

### Sin Docker

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod
```

### Con Docker

```bash
docker compose up -d
```

| URL | Descripción |
|---|---|
| `http://localhost:3000/graphql` (POST) | API GraphQL |
| `http://localhost:3000/graphql` (GET en navegador) | Apollo Sandbox embebido |
| `http://localhost:3000/api/emergency-restore` (POST) | Restauración de emergencia (REST) |

---

## 8. Estructura del proyecto

```
backend/
├── Backup/                        # Archivos de respaldo generados (auto-creada)
│
├── src/
│   ├── main.ts                    # Bootstrap: Helmet, CORS, ValidationPipe, ThrottlerGuard
│   ├── app.module.ts              # Init MSSQL, seed, ScheduleModule, ThrottlerModule
│   │
│   ├── database/
│   │   └── init.sql               # T-SQL: CREATE IF NOT EXISTS + migración MFA
│   │
│   ├── seed/
│   │   └── seed.ts                # CWE-547 fix: contraseñas desde env, MERGE INTO MSSQL
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── enums/
│   │   │   ├── estado-cita.enum.ts
│   │   │   └── rol.enum.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  # A09: sin stacktrace en producción
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       └── roles.guard.ts
│   │
│   ├── auth/                      # JWT login, A07: rate limit en login
│   ├── rol/
│   ├── usuario/                   # Entidad: mfa_secret, mfa_enabled (BIT)
│   ├── estudiante/
│   ├── psicologo/
│   ├── horario-psicologo/
│   ├── cita/                      # A01: IDs verificados contra JWT, A03: SQL parametrizado
│   ├── sesion/                    # Transacción MSSQL
│   ├── historial-clinico/
│   ├── detalle-historial/
│   │
│   ├── mfa/                       # TOTP: window:2, bcrypt 12 rounds
│   │   ├── dto/mfa.dto.ts
│   │   ├── mfa.module.ts
│   │   ├── mfa.resolver.ts
│   │   └── mfa.service.ts
│   │
│   └── backup/
│       ├── backup.module.ts       # Registra EmergencyRestoreController
│       ├── backup.service.ts      # SQL/JSON/CSV/Excel — T-SQL (MERGE, IDENTITY_INSERT)
│       ├── backup.resolver.ts     # GraphQL — solo admin autenticado con MFA
│       ├── emergency-restore.controller.ts  # CWE-23: allowlist + directory confinement
│       ├── dto/backup.dto.ts      # @IsOptional en codigo_mfa
│       └── entities/
│           ├── backup-log.entity.ts
│           └── backup-config.entity.ts
│
├── .dockerignore
├── .env.example
├── Dockerfile                     # Multi-stage: builder + runtime, usuario node
├── docker-compose.yml             # SQL Server 2022 + NestJS, red interna
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## 9. Módulos y entidades

### Roles del sistema

| Rol | Descripción |
|---|---|
| `administrador` | Gestiona psicólogos, backups, MFA |
| `psicologo` | Agenda, sesiones, horarios |
| `estudiante` | Busca psicólogos, agenda y cancela citas |

### Estados de cita

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Cita agendada, aún no ocurrida |
| `ASISTIDA` | Marcada automáticamente al registrar sesión |
| `CANCELADA` | Cancelada por estudiante o psicólogo |

### Campos MFA en Usuario

| Campo | Tipo SQL Server | Descripción |
|---|---|---|
| `mfa_secret` | `NVARCHAR(255) NULL` | Secreto TOTP base32 — nunca expuesto en GraphQL |
| `mfa_enabled` | `BIT NOT NULL DEFAULT 0` | 1 = MFA activo |

### Flujo de sesión clínica (transacción única)

```
registrarSesion()
  ├── INSERT Sesion
  ├── UPDATE Cita SET estado = 'ASISTIDA'   ← SQL parametrizado directo
  ├── MERGE Historial_Clinico               ← UPSERT T-SQL
  └── INSERT Detalle_Historial
Si cualquier paso falla → ROLLBACK completo
```

---

## 10. Autenticación y roles

### Login

```graphql
mutation Login {
  login(input: { correo: "admin@unimente.edu", password: "Admin1234!" }) {
    access_token
    rol
    nombre
    correo
    id_perfil
  }
}
```

### Cabecera JWT

```
Authorization: Bearer <access_token>
```

En Apollo Sandbox: pestaña **Headers** → `Authorization`.

### IDs de perfil resueltos en el backend

`id_estudiante` e `id_psicologo` **nunca** vienen del cliente. Siempre se extraen del JWT en el backend, previniendo que un usuario acceda a datos ajenos (OWASP A01).

### Rate limiting en login

El resolver de login tiene `@Throttle({ default: { limit: 5, ttl: 60_000 } })` → máximo 5 intentos por IP por minuto. El módulo global permite 60 peticiones/minuto para el resto de operaciones (OWASP A07).

### Mensaje de error unificado

El servicio de auth devuelve **exactamente el mismo mensaje** (`Credenciales invalidas.`) tanto si el correo no existe como si la contraseña es incorrecta. Esto evita que un atacante pueda enumerar usuarios válidos (OWASP A07 — User Enumeration).

---

## 11. MFA — Autenticación de dos factores

MFA implementa el estándar **TOTP (RFC 6238)** compatible con Google Authenticator, Microsoft Authenticator y Authy.

### Flujo de activación

```
1. mutation setupMfa
   → genera secreto TOTP + devuelve { qr_code (PNG base64), secret (base32) }

2. Usuario escanea el QR con su app

3. mutation habilitarMfa(input: { codigo: "123456" })
   → verifica primer código y activa MFA

4. A partir de aquí, backup y restauración requieren código válido
```

### Ventana de tolerancia TOTP

```typescript
speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 });
```

`window: 2` → acepta códigos dentro de ±60 segundos. Compensa desfases de reloj entre el servidor y el dispositivo. Antes de verificar, se limpian espacios y caracteres no numéricos.

### MFA obligatorio para respaldos

Si la cuenta tiene MFA activo, todas las operaciones de backup/restauración **siempre** requieren un código TOTP válido. Si la cuenta **no** tiene MFA configurado, el backend rechaza la operación:

> *"Esta operacion requiere un codigo MFA."*

### Cambio de contraseña

El cambio de contraseña siempre requiere el código MFA si está activo. Previene que alguien con acceso físico al dispositivo cambie la contraseña sin autorización del dueño de la cuenta.

### Operaciones MFA disponibles

| Operación | Requiere | Descripción |
|---|---|---|
| `setupMfa` | JWT | Genera secreto TOTP y devuelve QR en base64 |
| `habilitarMfa(codigo)` | JWT | Activa MFA tras verificar el primer código |
| `deshabilitarMfa(codigo)` | JWT + código | Desactiva MFA |
| `verificarMfa(codigo)` | JWT | Verificación puntual sin cambiar estado |
| `cambiarPassword(input)` | JWT | Cambia contraseña (con código si MFA activo) |
| `miEstadoMfa` | JWT | Consulta si MFA está activo en la cuenta actual |

---

## 12. Sistema de respaldos

Solo el rol **administrador** puede ejecutar backups. **MFA obligatorio** en todas las operaciones si la cuenta lo tiene activo.

Los archivos se guardan en `backend/Backup/` (carpeta creada automáticamente al arrancar). Con Docker, esta carpeta está mapeada al volumen `unimente_backups` para persistir entre reinicios de contenedor.

### Tipos de backup

| Tipo | Qué incluye |
|---|---|
| `COMPLETO` | Todos los registros de todas las tablas |
| `DIFERENCIAL` | Solo registros nuevos desde el último backup `COMPLETO` |
| `INCREMENTAL` | Solo registros nuevos desde el último backup de cualquier tipo |

Los backups parciales usan las columnas de timestamp existentes en cada tabla (`created_at`, `fecha_registro`, `fecha_apertura`) para filtrar.

### Formatos de exportación

| Formato | Descripción |
|---|---|
| `SQL` | T-SQL ejecutable. COMPLETO usa `IDENTITY_INSERT ON + INSERT`, parciales usan `MERGE INTO` |
| `JSON` | Objeto con metadata + datos por tabla |
| `CSV` | Secciones separadas por tabla con encabezados |
| `EXCEL` | `.xlsx` con una hoja por tabla, cabecera coloreada |

### T-SQL generado — diferencias clave vs MySQL

```sql
-- Deshabilitar FK (equivalente a SET FOREIGN_KEY_CHECKS=0)
ALTER TABLE [dbo].[Cita] NOCHECK CONSTRAINT ALL;

-- IDENTITY_INSERT para poder insertar IDs explícitos
SET IDENTITY_INSERT [dbo].[Usuario] ON;
INSERT INTO [dbo].[Usuario] ([id_usuario],[nombre],...) VALUES (1,'Admin',...);
SET IDENTITY_INSERT [dbo].[Usuario] OFF;

-- REPLACE INTO en MySQL → MERGE INTO en MSSQL
MERGE [dbo].[Cita] AS target
USING (SELECT @id AS id_cita, @est AS estado, ...) AS src
ON target.[id_cita] = src.id_cita
WHEN MATCHED THEN UPDATE SET target.[estado] = src.estado, ...
WHEN NOT MATCHED THEN INSERT ([id_cita],[estado],...) VALUES (src.id_cita,...);

-- Re-habilitar FK
ALTER TABLE [dbo].[Cita] CHECK CONSTRAINT ALL;
```

### Backup manual

```graphql
mutation {
  crearBackup(input: {
    tipo:       "COMPLETO"
    formato:    "SQL"
    codigo_mfa: "123456"
  }) {
    id_backup
    nombre_archivo
    tamanio_kb
    created_at
  }
}
```

### Backup automático

Al configurar el backup automático se ejecuta un **backup inmediato de seguridad**. Luego `@Cron(EVERY_HOUR)` verifica cada hora si ha transcurrido `frecuencia_horas`.

```graphql
mutation {
  configurarBackupAutomatico(input: {
    tipo:             "COMPLETO"
    formato:          "SQL"
    frecuencia_horas: 24
    codigo_mfa:       "123456"
  }) {
    id  tipo  formato  frecuencia_horas  activo  ultima_ejecucion
  }
}
```

### Listar backups

```graphql
query {
  listarBackups {
    id_backup  tipo  formato  nombre_archivo  tamanio_kb  modo  created_at
  }
}
```

### Restaurar backup

```graphql
mutation {
  restaurarBackup(input: { id_backup: 1, codigo_mfa: "123456" })
}
```

### Límite de 3 backups

`pruneBackups()` elimina el archivo físico **y** el registro en BD de los backups más antiguos cuando se supera el límite de 3. Garantiza coherencia entre sistema de archivos y tabla `Backup_Log`.

---

## 13. Restauración de emergencia

Diseñada para el escenario "huevo y gallina": si la BD fue eliminada no hay usuarios, sin usuarios no hay JWT, sin JWT no hay autorización para restaurar.

### Endpoint

```
POST http://localhost:3000/api/emergency-restore
```

### Headers requeridos

```
Content-Type: application/json
X-Restore-Secret: <valor de RESTORE_SECRET en .env>
```

### Body — por ID de backup

```json
{ "id_backup": 1 }
```

### Body — por nombre de archivo

```json
{ "backup_filename": "backup_COMPLETO_2026-03-14T23-03-08.sql" }
```

### Condiciones de activación (TODAS deben cumplirse)

1. `SELECT COUNT(*) FROM dbo.Usuario` devuelve `0`
2. `X-Restore-Secret` coincide con `RESTORE_SECRET` del `.env` (comparación constante — anti-timing attack)
3. Se proporciona `id_backup` o `backup_filename`

Si la BD tiene aunque sea un usuario, el endpoint devuelve `401 Unauthorized` y registra el intento en el log con la IP del cliente.

### Seguridad implementada (OWASP A01 + CWE-23)

| Capa | Descripción |
|---|---|
| BD vacía | Si hay usuarios, el endpoint está bloqueado permanentemente |
| `timingSafeEqual` | La comparación de la clave no tiene timing attack |
| Allowlist regex | `backup_filename` solo acepta `[a-zA-Z0-9_\-\.]` |
| Directory confinement | `path.resolve()` + `startsWith(BACKUP_DIR + sep)` verifica que la ruta no salga de `Backup/` |
| Logging | Intentos fallidos quedan en log con IP del cliente |

### Desde el frontend

```
http://localhost:5173/emergency-restore
```

Página pública (sin login) con formulario para ingresar la clave secreta e identificar el backup.

---

## 14. OWASP Top 10 — Mitigaciones implementadas

### A01 — Broken Access Control

**Dónde:** `cita.service.ts`, `jwt.strategy.ts`, `emergency-restore.controller.ts`

```typescript
// IDs nunca del cliente — siempre del JWT
if (user.rol === RolNombre.ESTUDIANTE && cita.id_estudiante !== user.id_perfil)
  throw new ForbiddenException('No tienes permiso para modificar esta cita.');
```

El emergency-restore verifica que la BD esté vacía antes de activarse. Una vez restaurada, el endpoint queda bloqueado permanentemente porque ya hay usuarios.

### A02 — Cryptographic Failures

**Dónde:** `auth.service.ts`, `mfa.service.ts`, `app.module.ts`

- bcrypt con **12 rounds** en todos los hashes de contraseñas
- JWT con secreto de **mínimo 32 caracteres** desde variable de entorno
- TLS/encrypt en MSSQL activado en producción (`NODE_ENV=production`)
- TOTP con `window: 2` para ±60s de tolerancia sin debilitar la verificación
- `timingSafeEqual` de Node.js `crypto` para comparar `RESTORE_SECRET`

```typescript
// app.module.ts — TLS obligatorio en producción
options: {
  trustServerCertificate: !isProd,  // false en producción
  encrypt: isProd,                  // true en producción
}
```

### A03 — Injection

**Dónde:** `ValidationPipe`, todos los servicios, `backup.service.ts`

```typescript
// ValidationPipe global en main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // elimina campos no declarados
  transform: true,             // coerce tipos
  stopAtFirstError: true,
}));
```

```typescript
// SQL parametrizado — nunca concatenación de strings
await this.dataSource.query(
  'UPDATE dbo.Cita SET estado = @0 WHERE id_cita = @1',
  [input.estado, id_cita]
);
```

```typescript
// Escape de comillas en generación SQL (backup)
function toSql(val: any): string {
  return `'${String(val).replace(/'/g, "''")}'`;  // escape correcto T-SQL
}
```

### A05 — Security Misconfiguration

**Dónde:** `main.ts`, `app.module.ts`, `docker-compose.yml`

```typescript
// Helmet con Content-Security-Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      connectSrc:  ["'self'"],
    },
  },
}));
```

```typescript
// CORS con whitelist de orígenes
app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error(`Origin "${origin}" not allowed`));
  },
});
```

```typescript
// GraphQL introspection desactivada en producción
introspection: process.env.NODE_ENV !== 'production',
```

```typescript
// synchronize: false SIEMPRE — nunca auto-sync en producción
synchronize: false,
```

En `docker-compose.yml` la red `unimente-internal` es interna de Docker — el contenedor `db` no está accesible desde el exterior salvo por el puerto explícitamente publicado.

### A06 — Vulnerable and Outdated Components

**Dónde:** `Dockerfile`, `docker-compose.yml`

```dockerfile
# Tag fijo — no :latest
FROM node:20.14-alpine AS builder
FROM mcr.microsoft.com/mssql/server:2022-CU13-ubuntu-22.04
```

```bash
# npm ci en lugar de npm install (usa lockfile exacto)
RUN npm ci --legacy-peer-deps
```

Multi-stage build: el stage `runtime` solo contiene dependencias de producción (`--omit=dev`), sin compilador TypeScript ni herramientas de desarrollo.

### A07 — Identification and Authentication Failures

**Dónde:** `auth.resolver.ts`, `app.module.ts`, `mfa.service.ts`

```typescript
// Rate limit estricto en login: 5 intentos / 60s por IP
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Mutation(() => AuthPayload)
async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
```

```typescript
// Rate limit global: 60 peticiones / 60s
ThrottlerModule.forRoot([{ name: 'global', ttl: 60_000, limit: 60 }])
```

```typescript
// Mismo mensaje para correo no encontrado y contraseña incorrecta
if (!usuario || !await bcrypt.compare(password, usuario.password_hash))
  throw new UnauthorizedException('Credenciales invalidas.');
```

### A08 — Software and Data Integrity Failures

**Dónde:** `Dockerfile`

```dockerfile
# Multi-stage: el stage runtime no tiene acceso al código fuente
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/src/database ./src/database

# Usuario no-root: ningún proceso del contenedor tiene privilegios root
USER node
```

`dumb-init` como PID 1 garantiza que SIGTERM llega correctamente al proceso Node.js para un graceful shutdown.

### A09 — Security Logging and Monitoring Failures

**Dónde:** `http-exception.filter.ts`, `emergency-restore.controller.ts`

```typescript
// No stacktrace en producción
catch(exception: unknown, host: ArgumentsHost) {
  const message = this.isProd
    ? 'Internal server error'
    : String(exception);
  // A09: loguear internamente, no exponer al cliente
  this.logger.error(`[${req.method}] ${req.url} → ${status}`);
  return res.status(status).json({ statusCode: status, message });
}
```

```typescript
// Intentos de acceso no autorizado logueados con IP
this.logger.warn(`[EmergencyRestore] Intento con clave incorrecta desde ${clientIp}`);
this.logger.warn(`[EmergencyRestore] Intento de path traversal: "${filename}", IP: ${clientIp}`);
```

```typescript
// GraphQL: sin stacktrace en producción
formatError: (err) => {
  if (process.env.NODE_ENV === 'production')
    return { message: err.message, locations: err.locations, path: err.path };
  return err;
},
```

### CWE-23 — Path Traversal

**Dónde:** `emergency-restore.controller.ts`

```typescript
// Paso 1: Allowlist — solo caracteres seguros
const FILENAME_ALLOWLIST = /^[a-zA-Z0-9_\-\.]+$/;
if (!FILENAME_ALLOWLIST.test(filename)) { /* rechazar */ }

// Paso 2: Directory confinement
const resolvedPath   = resolve(BACKUP_DIR, filename);
const resolvedBackup = resolve(BACKUP_DIR);
if (!resolvedPath.startsWith(resolvedBackup + sep)) {
  // path traversal detectado y bloqueado
}
```

### CWE-547 / CWE-798 — Hardcoded Credentials

**Dónde:** `seed.ts`, `.env.example`

```typescript
// CWE-547: contraseñas desde env, nunca en código fuente
function getPassword(key: string, label: string, cfg?: ConfigService): string {
  const val = cfg ? cfg.get<string>(key) : process.env[key];
  if (val && val.trim().length >= 8) return val.trim();
  if (process.env.NODE_ENV === 'production')
    throw new Error(`[Seed] Variable "${key}" no configurada. Obligatoria en produccion.`);
  // En dev: generar aleatoria y advertir — nunca silencioso
  const generated = randomBytes(12).toString('base64url');
  console.warn(`[Seed] ${key} no encontrada. Generada: ${generated}`);
  return generated;
}
```

---

## 15. API GraphQL — Referencia de operaciones

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
  registrarPsicologo(input: $input) { id_psicologo usuario { nombre } especialidad }
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
}) { id tipo formato frecuencia_horas activo ultima_ejecucion } }
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
    id_historial fecha_apertura
    psicologo { usuario { nombre } especialidad }
    detalles { sesion { numero_sesion notas recomendaciones fecha_registro } }
  }
}
```

### Estudiante

```graphql
query { psicologos {
  id_psicologo especialidad usuario { nombre correo }
  horarios { id_horario dia_semana hora_inicio hora_fin disponible }
} }

mutation { agendarCita(input: $input) { id_cita fecha hora_inicio hora_fin estado } }

query CitasEstudiante($id_estudiante: Int!) {
  citasEstudiante(id_estudiante: $id_estudiante) {
    id_cita fecha hora_inicio hora_fin estado motivo
    psicologo { especialidad usuario { nombre } }
  }
}

mutation { cambiarEstadoCita(id_cita: $id, input: { estado: CANCELADA }) { id_cita estado } }
```

---

## 16. Diferencias MySQL → MSSQL

### Sintaxis SQL

| Concepto | MySQL | SQL Server (T-SQL) |
|---|---|---|
| Identificadores | `` `tabla` `` | `[tabla]` |
| Auto-increment | `AUTO_INCREMENT` | `IDENTITY(1,1)` |
| Insertar con ID explícito | Normal | `SET IDENTITY_INSERT [t] ON/OFF` |
| UPSERT | `REPLACE INTO` | `MERGE INTO ... WHEN MATCHED / WHEN NOT MATCHED` |
| INSERT ignorar duplicados | `INSERT IGNORE` | `IF NOT EXISTS INSERT` |
| Deshabilitar FK | `SET FOREIGN_KEY_CHECKS = 0` | `ALTER TABLE NOCHECK CONSTRAINT ALL` |
| Múltiples statements | Directo | Batches separados por `GO` |
| Fecha+hora | `DATETIME` | `DATETIME2` |
| Texto largo | `TEXT` | `NVARCHAR(MAX)` |
| Boolean | `TINYINT(1)` | `BIT` |
| Cadenas | `VARCHAR` | `NVARCHAR` (Unicode) |

### TypeORM

| Aspecto | MySQL | SQL Server |
|---|---|---|
| Tipo `type` en entidades | `'varchar'`, `'tinyint'` | `'nvarchar'`, `'bit'` |
| `length: 'max'` | No aplica | Para `NVARCHAR(MAX)` |
| Driver | `mysql2` | `mssql` |
| `trustServerCertificate` | No aplica | `true` en dev, `false` en prod |
| `encrypt` | No aplica | `false` en dev, `true` en prod |

### Seed

| Aspecto | MySQL | SQL Server |
|---|---|---|
| Truncate con FK | `SET FK_CHECKS=0; TRUNCATE` | `ALTER TABLE NOCHECK; DELETE; DBCC CHECKIDENT` |
| Insert y obtener ID | `insertId` en `mysql2` | `SELECT SCOPE_IDENTITY()` |
| UPSERT | `INSERT IGNORE` / `REPLACE INTO` | `MERGE INTO ... ` |

### Backup — SQL generado

| Operación | MySQL | SQL Server |
|---|---|---|
| Backup completo | `TRUNCATE + INSERT` | `TRUNCATE + IDENTITY_INSERT ON + INSERT + IDENTITY_INSERT OFF` |
| Backup parcial | `REPLACE INTO` | `MERGE INTO (WHEN MATCHED → UPDATE, WHEN NOT MATCHED → INSERT)` |
| Deshabilitar FK | `SET FOREIGN_KEY_CHECKS = 0` | `ALTER TABLE NOCHECK CONSTRAINT ALL` |
| Re-habilitar FK | `SET FOREIGN_KEY_CHECKS = 1` | `ALTER TABLE CHECK CONSTRAINT ALL` |

### Docker

| Aspecto | MySQL | SQL Server |
|---|---|---|
| Imagen | `mysql:8.0` | `mcr.microsoft.com/mssql/server:2022-CU13-ubuntu-22.04` |
| Tiempo de startup | ~10s | ~45-60s (espera el healthcheck) |
| Variable de contraseña | `MYSQL_ROOT_PASSWORD` | `SA_PASSWORD` |
| Licencia | GPL / Community | EULA de Microsoft (Developer = gratis para dev/test) |
| Cliente CLI | `mysql` | `sqlcmd` |

---

## 17. Decisiones técnicas y bugs resueltos

### Decisión 1 — `estado` como NVARCHAR en lugar de ENUM

**Síntoma:** `Enum "EstadoCita" cannot represent value: ""`

**Causa:** TypeORM con `@Column({ type: 'enum' })` puede devolver el campo vacío en memoria tras un raw SQL update. GraphQL intenta serializar `""` como `EstadoCita` y falla. SQL Server tampoco tiene tipo `ENUM` nativo.

**Solución — tres cambios coordinados:**

```sql
-- BD
estado NVARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
```

```typescript
// TypeORM: nvarchar en lugar de enum
@Column({ type: 'nvarchar', length: 20, default: 'PENDIENTE' })
estado: string;

// GraphQL: @Field() sin tipo explícito → NestJS infiere String
@Field()
estado: string;
```

```typescript
// Service: SQL parametrizado directo para no pasar por el ORM
await this.dataSource.query(
  'UPDATE dbo.Cita SET estado = @0 WHERE id_cita = @1',
  [input.estado, id_cita]
);
```

El enum `EstadoCita` se mantiene solo para validar inputs en `UpdateEstadoCitaInput`.

### Decisión 2 — `process.cwd()` para leer `init.sql`

**Síntoma:** `ENOENT: no such file or directory, open '...dist/database/init.sql'`

**Causa:** `__dirname` en código compilado apunta a `dist/`, donde no existe el `.sql`.

**Solución:**
```typescript
const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
```

`process.cwd()` apunta al directorio desde donde se ejecuta `nest start`.

### Decisión 3 — Admin con contraseña incorrecta en arranque inicial

**Causa:** `init.sql` tenía un hash hardcodeado de la palabra `password`, no de `Admin1234!`.

**Solución:** El seed genera el hash con `bcrypt.hash(pwdAdmin, 12)` en runtime. `init.sql` no incluye ningún `INSERT` de usuarios.

### Decisión 4 — `SCOPE_IDENTITY()` en el seed MSSQL

**Causa:** En MySQL el ID del último insert se obtiene con `insertId` del resultado. En MSSQL se usa `SELECT SCOPE_IDENTITY() AS id` después del INSERT.

**Solución:**
```typescript
const insertGetId = async (sql: string, ...params: any[]): Promise<number> => {
  const result = await q(sql + '; SELECT SCOPE_IDENTITY() AS id', ...params);
  return Number(result.recordset[0]?.id ?? 0);
};
```

### Decisión 5 — TINYINT / BIT no es boolean en TypeScript

**Causa:** MySQL devuelve `mfa_enabled` como `0`/`1`. SQL Server devuelve `BIT` como `true`/`false` dependiendo del contexto de serialización de TypeORM. En algunos casos llega como número `0` o `1`.

**Solución:** Normalizar siempre con `Number()`:
```typescript
if (!Number(usuario.mfa_enabled)) return; // MFA no activo
```

### Decisión 6 — `ValidationPipe` elimina `codigo_mfa` silenciosamente

**Causa:** `whitelist: true` elimina cualquier campo del DTO que no tenga al menos un decorador de `class-validator`. `codigo_mfa` solo tenía `@Field()` (GraphQL), sin `@IsOptional()` ni `@IsString()`.

**Solución:**
```typescript
@Field({ nullable: true })
@IsOptional()
@IsString()
codigo_mfa?: string;
```

### Decisión 7 — Código TOTP rechazado aunque sea correcto

**Causas:**
1. `window: 1` solo acepta ±30s — desfases de reloj del teléfono lo invalidan.
2. Espacios y guiones en el código (copiado de la app) no se limpiaban antes de verificar.

**Solución:**
```typescript
verifyCode(secret: string, codigo: string): boolean {
  const token = codigo.replace(/\s/g, '').replace(/\D/g, '');
  if (token.length !== 6) return false;
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 });
}
```

### Decisión 8 — IDENTITY_INSERT en restauración SQL

**Causa:** Al restaurar un backup COMPLETO en MSSQL, intentar insertar valores explícitos en columnas `IDENTITY` genera el error `Cannot insert explicit value for identity column`.

**Solución:** Envolver cada tabla con `SET IDENTITY_INSERT ON/OFF`:
```sql
SET IDENTITY_INSERT [dbo].[Usuario] ON;
INSERT INTO [dbo].[Usuario] ([id_usuario],[nombre],...) VALUES (1,'Admin',...);
SET IDENTITY_INSERT [dbo].[Usuario] OFF;
```

### Decisión 9 — `timingSafeEqual` en RESTORE_SECRET

**Causa:** Una comparación simple `secret === expected` tiene timing attack: retorna más rápido cuando el primer carácter difiere, permitiendo inferir el secreto byte a byte.

**Solución:**
```typescript
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}
```

### Decisión 10 — SQL Server tarda ~60s en iniciar en Docker

**Causa:** SQL Server necesita inicializar su motor antes de aceptar conexiones. Si NestJS intenta conectar antes de que esté listo, falla.

**Solución:** Healthcheck en `docker-compose.yml` con `start_period: 60s` y `retries: 12`. El backend usa `depends_on: db: condition: service_healthy`, que lo retiene hasta que `sqlcmd -Q "SELECT 1"` responde correctamente.

---

## 18. Scripts disponibles

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
| `npm install --legacy-peer-deps` | Instalar todas las dependencias |
| `npm run start:dev` | Servidor con hot-reload |
| `npm run build` | Compilar TypeScript a `dist/` |
| `npm run start:prod` | Servidor desde `dist/` |
| `npm run seed` | Reiniciar BD con datos de prueba |
| `docker compose up --build` | Primera vez: construir imagen y levantar servicios |
| `docker compose up -d` | Levantar sin reconstruir (reinicios rápidos) |
| `docker compose down` | Detener y eliminar contenedores (datos preservados) |
| `docker compose down -v` | Detener y eliminar contenedores + volúmenes |
| `docker compose logs -f backend` | Seguir logs del backend en tiempo real |