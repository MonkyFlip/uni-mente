# UniMente — Backend

API GraphQL del Portal de Bienestar Universitario.  
Stack: **NestJS · TypeORM · MySQL 8 · Apollo Server · Passport JWT**.

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
12. [API GraphQL — referencia de operaciones](#12-api-graphql--referencia-de-operaciones)
13. [Decisiones técnicas y bugs resueltos](#13-decisiones-técnicas-y-bugs-resueltos)
14. [Scripts disponibles](#14-scripts-disponibles)

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

### Clonar el repositorio

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend
```

### Instalar dependencias base

```bash
npm install --legacy-peer-deps
```

### Instalar paquetes de MFA y Backup

```bash
npm install speakeasy qrcode exceljs @nestjs/schedule --legacy-peer-deps
```

### Instalar tipos de desarrollo

```bash
npm install @types/speakeasy @types/qrcode --save-dev --legacy-peer-deps
```

> **Por qué `--legacy-peer-deps`:** Algunas dependencias de NestJS tienen conflictos de `peerDependencies` entre versiones menores. Esta flag le indica a npm que ignore dichos conflictos y construya el árbol de dependencias más compatible disponible, en lugar de abortar la instalación con un error.

---

## 3. Variables de entorno

Crea el archivo `.env` en `backend/`:

```env
# Conexión a MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=unimente

# Seguridad JWT — cambia este valor en producción
JWT_SECRET=unimente_super_secret_2024
JWT_EXPIRES=8h
```

**Windows (PowerShell) — alternativa sin .env:**
```powershell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="tu_password"
$env:DB_NAME="unimente"
$env:JWT_SECRET="unimente_super_secret_2024"
```

**macOS / Linux — alternativa sin .env:**
```bash
export DB_HOST=localhost DB_USER=root DB_PASSWORD=tu_password
export DB_NAME=unimente JWT_SECRET=unimente_super_secret_2024
```

---

## 4. Base de datos

### Inicialización automática al arrancar

Al ejecutar `nest start`, el módulo raíz realiza estos pasos antes de que NestJS cargue cualquier módulo:

1. Conecta a MySQL sin seleccionar base de datos
2. Ejecuta `src/database/init.sql`:
   - `CREATE DATABASE IF NOT EXISTS unimente`
   - `CREATE TABLE IF NOT EXISTS` para cada tabla
   - Migración segura: agrega las columnas `mfa_secret` y `mfa_enabled` a `Usuario` si no existen (sin destruir datos)
   - Crea `Backup_Log` y `Backup_Config` si no existen
3. Verifica si `Psicologo` está vacía — si lo está, corre el seed automáticamente
4. TypeORM conecta a `unimente` y NestJS arranca normalmente

**No es necesario correr ningún script SQL manualmente.**

### Inicialización manual (alternativa)

```bash
# Windows
mysql -u root -p < src\database\init.sql

# macOS / Linux
mysql -u root -p < src/database/init.sql
```

### Esquema de tablas

```
Rol
└── Usuario (id_rol FK)          ← incluye mfa_secret, mfa_enabled
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

Se almacena como `VARCHAR`, no como `ENUM` de MySQL. Ver sección [13](#13-decisiones-técnicas-y-bugs-resueltos) para la explicación completa.

---

## 5. Seed de datos de prueba

### Ejecución automática

El seed corre solo la primera vez que se levanta el servidor (tabla `Psicologo` vacía). Los arranques posteriores muestran:

```
BD ya tiene datos (12 psicólogos). Seed omitido.
```

### Ejecución manual

Para reiniciar la BD con datos frescos:

```bash
# Windows
npx ts-node -r tsconfig-paths/register src\seed\seed.ts

# macOS / Linux
npm run seed
```

### Registros generados

| Tabla | Registros |
|---|---|
| Psicólogos | 12 |
| Horarios de psicólogo | ~42 |
| Estudiantes | 80 |
| Citas (PENDIENTE / ASISTIDA / CANCELADA) | ~450 |
| Sesiones clínicas | ~240 |
| Historiales clínicos | ~90 |
| Detalles de historial | ~240 |
| **Total** | **~1 100** |

### Credenciales del seed

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@unimente.edu | Admin1234! |
| Psicólogos | psicologo1@unimente.edu … psicologo12@unimente.edu | Password123! |
| Estudiantes | estudiante1@unimente.edu … estudiante80@unimente.edu | Password123! |

El seed hace `TRUNCATE TABLE Usuario` y recrea al admin con `bcrypt.hash('Admin1234!', 10)` en tiempo de ejecución, garantizando que el hash siempre coincide con la contraseña real.

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

---

## 7. Estructura del proyecto

```
backend/
├── Backup/                        # Archivos de respaldo (creada automáticamente)
│
├── src/
│   ├── app.module.ts              # Módulo raíz — init BD, seed, ScheduleModule
│   ├── main.ts                    # Bootstrap + Apollo Sandbox embebido
│   │
│   ├── database/
│   │   └── init.sql               # CREATE IF NOT EXISTS + migración MFA + tablas Backup
│   │
│   ├── seed/
│   │   └── seed.ts                # ~1 100 registros, admin con bcrypt correcto
│   │
│   ├── mfa/
│   │   ├── mfa.module.ts
│   │   ├── mfa.service.ts         # TOTP con speakeasy, QR con qrcode
│   │   ├── mfa.resolver.ts
│   │   └── dto/mfa.dto.ts
│   │
│   ├── backup/
│   │   ├── backup.module.ts
│   │   ├── backup.service.ts      # SQL/JSON/CSV/Excel + scheduler automático
│   │   ├── backup.resolver.ts
│   │   ├── dto/backup.dto.ts
│   │   └── entities/
│   │       ├── backup-log.entity.ts
│   │       └── backup-config.entity.ts
│   │
│   ├── auth/
│   ├── common/
│   │   ├── decorators/            # @CurrentUser, @Roles
│   │   ├── enums/
│   │   │   ├── estado-cita.enum.ts
│   │   │   └── rol.enum.ts
│   │   └── guards/                # JwtAuthGuard, RolesGuard
│   │
│   ├── rol/
│   ├── usuario/                   # Entidad con mfa_secret, mfa_enabled
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
| `administrador` | Gestiona psicólogos, configura y ejecuta backups |
| `psicologo` | Gestiona horarios, agenda y sesiones clínicas |
| `estudiante` | Busca psicólogos, agenda y cancela citas |

### Estados de cita

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Cita agendada, aún no ocurrida |
| `ASISTIDA` | Marcada automáticamente al registrar una sesión |
| `CANCELADA` | Cancelada por estudiante o psicólogo |

### Campos MFA en Usuario

| Campo | Tipo MySQL | Descripción |
|---|---|---|
| `mfa_secret` | VARCHAR(255) NULL | Secreto TOTP en base32 — nunca expuesto en GraphQL |
| `mfa_enabled` | TINYINT(1) DEFAULT 0 | 1 = MFA activo, 0 = desactivado |

### Flujo de sesión clínica (transacción única)

```
registrarSesion()
  ├── INSERT Sesion
  ├── UPDATE Cita SET estado = 'ASISTIDA'   ← SQL directo
  ├── FIND OR CREATE Historial_Clinico
  └── INSERT Detalle_Historial
Si cualquier paso falla → ROLLBACK completo
```

---

## 9. Autenticación y roles

### Login

```graphql
mutation Login {
  login(input: {
    correo: "admin@unimente.edu"
    password: "Admin1234!"
  }) {
    access_token
    rol
    nombre
    correo
    id_perfil
  }
}
```

### Cabecera de autenticación

Incluir en cada petición GraphQL protegida:

```
Authorization: Bearer <access_token>
```

En Apollo Sandbox: pestaña **Headers** → `Authorization`.

---

## 10. MFA — Autenticación de dos factores

MFA implementa el estándar **TOTP (RFC 6238)** compatible con:

- Google Authenticator
- Microsoft Authenticator
- Authy
- Cualquier aplicación TOTP

### Flujo de activación

```
1. mutation setupMfa
   → devuelve qr_code (imagen PNG en base64) y secret (base32)
   → el usuario escanea el QR con su app de autenticación

2. mutation habilitarMfa(input: { codigo: "123456" })
   → verifica que el código de la app es correcto
   → MFA queda ACTIVO en la cuenta

3. A partir de aquí, crearBackup, restaurarBackup y
   configurarBackupAutomatico requieren el campo codigo_mfa
```

### Flujo de cambio de contraseña con MFA

```graphql
mutation {
  cambiarPassword(input: {
    password_actual: "Admin1234!"
    password_nuevo:  "NuevoPass456!"
    codigo_mfa:      "123456"
  })
}
```

`codigo_mfa` solo es obligatorio si la cuenta tiene MFA activo.

### Operaciones MFA disponibles

| Mutación / Query | Requiere | Descripción |
|---|---|---|
| `setupMfa` | JWT | Genera secreto TOTP y devuelve QR en base64 |
| `habilitarMfa(codigo)` | JWT | Activa MFA tras verificar el primer código |
| `deshabilitarMfa(codigo)` | JWT + código válido | Desactiva MFA |
| `verificarMfa(codigo)` | JWT | Verifica un código puntual sin cambiar estado |
| `cambiarPassword(input)` | JWT | Cambia contraseña con validación MFA opcional |
| `miEstadoMfa` | JWT | Consulta si MFA está activo en la cuenta actual |

### Ventana de tolerancia TOTP

El verificador acepta un margen de ±30 segundos (`window: 1`) para compensar pequeñas diferencias de reloj entre el servidor y el dispositivo del usuario.

---

## 11. Sistema de respaldos

Solo el rol **administrador** puede ejecutar backups. Todas las operaciones verifican MFA si la cuenta lo tiene activo.

Los archivos se guardan en `backend/Backup/` (se crea automáticamente al arrancar).

### Tipos de backup

| Tipo | Qué incluye |
|---|---|
| `COMPLETO` | Todos los registros de todas las tablas |
| `DIFERENCIAL` | Solo registros nuevos desde el último backup `COMPLETO` |
| `INCREMENTAL` | Solo registros nuevos desde el último backup de cualquier tipo |

Los backups parciales usan las columnas de timestamp de cada tabla (`created_at`, `fecha_registro`, `fecha_apertura`) para filtrar solo los registros más recientes.

### Formatos de exportación

| Formato | Descripción del archivo generado |
|---|---|
| `SQL` | Script ejecutable: `TRUNCATE+INSERT` (completo) o `REPLACE INTO` (parciales) |
| `JSON` | Objeto con metadata + datos estructurados por tabla |
| `CSV` | Secciones separadas por tabla, una fila de encabezados por sección |
| `EXCEL` | `.xlsx` con una hoja por tabla, cabecera coloreada en verde |

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

### Configurar backup automático

Al confirmar la configuración, se ejecuta **un backup inmediato de seguridad** y luego el scheduler revisa cada hora si ha transcurrido el tiempo configurado.

```graphql
mutation {
  configurarBackupAutomatico(input: {
    tipo:             "COMPLETO"
    formato:          "SQL"
    frecuencia_horas: 24
    codigo_mfa:       "123456"
  }) {
    id
    tipo
    formato
    frecuencia_horas
    activo
    ultima_ejecucion
  }
}
```

### Dashboard de backups

```graphql
# Listar todos los backups disponibles (máximo 3)
query {
  listarBackups {
    id_backup  tipo  formato  nombre_archivo  tamanio_kb  modo  created_at
  }
}

# Ver configuración del automático
query {
  configBackupAutomatico {
    tipo  formato  frecuencia_horas  activo  ultima_ejecucion
  }
}
```

### Restaurar backup

```graphql
mutation {
  restaurarBackup(input: {
    id_backup:  1
    codigo_mfa: "123456"
  })
}
```

La restauración de un backup `COMPLETO` hace `TRUNCATE` de todas las tablas antes de insertar. Los backups `DIFERENCIAL` e `INCREMENTAL` usan `REPLACE INTO` para actualizar o insertar sin afectar los registros no incluidos.

### Límite de 3 backups

Cada vez que se genera un backup, `pruneBackups()` elimina simultáneamente el archivo físico y el registro en BD de los backups más antiguos que excedan el límite de 3.

---

## 12. API GraphQL — referencia de operaciones

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

mutation { crearBackup(input: {
  tipo: "COMPLETO", formato: "SQL", codigo_mfa: "123456"
}) { id_backup nombre_archivo tamanio_kb created_at } }

mutation { restaurarBackup(input: { id_backup: 1, codigo_mfa: "123456" }) }

mutation { configurarBackupAutomatico(input: {
  tipo: "COMPLETO", formato: "SQL", frecuencia_horas: 24, codigo_mfa: "123456"
}) { id tipo formato frecuencia_horas activo ultima_ejecucion } }
```

### Psicólogo

```graphql
query AgendaPsicologo($id_psicologo: Int!) {
  agendaPsicologo(id_psicologo: $id_psicologo) {
    id_cita  fecha  hora_inicio  hora_fin  estado  motivo
    estudiante { usuario { nombre } matricula carrera }
    sesion { id_sesion }
  }
}

mutation { crearHorario(input: $input) { id_horario dia_semana hora_inicio hora_fin } }
mutation { eliminarHorario(id: $id) }
mutation { cambiarEstadoCita(id_cita: $id, input: $input) { id_cita estado } }
mutation { registrarSesion(input: $input) { id_sesion numero_sesion notas recomendaciones } }

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
    id_cita  fecha  hora_inicio  hora_fin  estado  motivo
    psicologo { especialidad usuario { nombre } }
  }
}

mutation { cambiarEstadoCita(id_cita: $id, input: { estado: CANCELADA }) { id_cita estado } }
```

---

## 13. Decisiones técnicas y bugs resueltos

### Bug 1 — `estado` como VARCHAR en lugar de ENUM

**Síntoma:** `Enum "EstadoCita" cannot represent value: ""`

**Causa:** TypeORM con `@Column({ type: 'enum' })` puede devolver el campo vacío en memoria tras un SQL directo. GraphQL intenta serializar `""` como `EstadoCita` y falla.

**Solución — tres cambios coordinados:**

```sql
-- BD
estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
```
```typescript
// TypeORM: varchar en lugar de enum
@Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
estado: string;

// GraphQL: @Field() sin tipo explícito → NestJS infiere String
@Field()
estado: string;
```
```typescript
// Service: SQL directo para no pasar por el ORM
await this.dataSource.query('UPDATE Cita SET estado = ? WHERE id_cita = ?', [valor, id]);
```

El enum `EstadoCita` se mantiene solo para validar inputs en `UpdateEstadoCitaInput`.

### Bug 2 — `ENOENT: init.sql not found` al compilar

**Síntoma:** `Error: ENOENT: no such file or directory, open '...dist/database/init.sql'`

**Causa:** `__dirname` en código compilado apunta a `dist/`, pero `init.sql` está en `src/`.

**Solución:**
```typescript
const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
```
`process.cwd()` siempre apunta al directorio desde donde se ejecuta `nest start`.

### Bug 3 — Admin con contraseña incorrecta

**Síntoma:** `Credenciales inválidas` con `admin@unimente.edu` / `Admin1234!`.

**Causa:** `init.sql` tenía un hash hardcodeado que corresponde a la palabra `password`, no a `Admin1234!`.

**Solución:** El admin se crea en `seed.ts` con `bcrypt.hash('Admin1234!', 10)` en tiempo de ejecución. `init.sql` ya no incluye ningún `INSERT` de usuarios.

### Bug 4 — `Column 'id_rol' cannot be null` en el seed

**Causa:** Desestructuración frágil `[[{ id_rol }]]` de resultados de `mysql2`.

**Solución:** Helper `getId()` sin asumir el nombre de clave:
```typescript
async function getId(conn, sql, params): Promise<number> {
  const [rows] = await conn.query(sql, params);
  return Number(Object.values((rows as any[])[0])[0]);
}
```

### Bug 5 — Campos opcionales enviados como `""` desde el frontend

**Causa:** Estados de formulario inicializados en `""` se enviaban directamente a la mutation.

**Solución:** Funciones `strip()` y `clean()` en el frontend que convierten `""` a `undefined` antes de cada mutation, haciendo que el backend reciba `null` y guarde `NULL` en MySQL.

### Diseño MFA

El secreto TOTP se guarda en `Usuario.mfa_secret` y nunca se expone en GraphQL. `mfa_enabled` controla si las operaciones sensibles lo requieren. El verificador usa ventana `window: 1` (±30 s) para tolerar diferencias de reloj. El setup es de dos pasos: primero `setupMfa` (guarda secreto sin activar), luego `habilitarMfa(codigo)` (activa solo si el código es válido).

### Diseño del sistema de backups

**Pruning de 3 backups:** `pruneBackups()` elimina el archivo físico y el registro en BD simultáneamente para mantener coherencia entre el sistema de archivos y la tabla `Backup_Log`.

**Scheduler sin cron variable:** `@Cron(EVERY_HOUR)` revisa cada hora si `Date.now() - ultima_ejecucion >= frecuencia_horas * 3_600_000`. No usa cron expressions variables para mantener compatibilidad con todos los sistemas operativos.

**Backup inmediato al configurar:** Al llamar `configurarBackupAutomatico`, se ejecuta un backup antes de responder, garantizando que siempre hay al menos un respaldo disponible al activar el sistema automático.

**Restauración con FK desactivadas:** `SET FOREIGN_KEY_CHECKS = 0` durante toda la restauración evita errores al truncar o reemplazar tablas en un orden no secuencial respecto a las claves foráneas.

---

## 14. Scripts disponibles

Verificar / agregar en `backend/package.json`:

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
| `npm run start:dev` | Servidor en modo desarrollo con hot-reload |
| `npm run build` | Compilar TypeScript a `dist/` |
| `npm run start:prod` | Servidor en modo producción desde `dist/` |
| `npm run seed` | Reiniciar base de datos con datos de prueba |