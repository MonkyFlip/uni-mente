# UniMente — Backend

API GraphQL del Portal de Bienestar Universitario.
Stack: **NestJS v11 · TypeORM · SQL Server 2022 · Apollo GraphQL v4 · Passport JWT · @nestjs/schedule**

---

## Índice

1. [Inicio rápido con Docker](#1-inicio-rápido-con-docker)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Base de datos — inicialización automática](#3-base-de-datos--inicialización-automática)
4. [Seed de datos de prueba](#4-seed-de-datos-de-prueba)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Módulos y entidades](#6-módulos-y-entidades)
7. [Autenticación y roles](#7-autenticación-y-roles)
8. [MFA — Autenticación de dos factores](#8-mfa--autenticación-de-dos-factores)
9. [Sistema de respaldos](#9-sistema-de-respaldos)
10. [Restauración de emergencia](#10-restauración-de-emergencia)
11. [API GraphQL — Referencia completa](#11-api-graphql--referencia-completa)
12. [Despliegue en AWS EC2](#12-despliegue-en-aws-ec2)
13. [Aplicar nuevos cambios](#13-aplicar-nuevos-cambios)
14. [Scripts disponibles](#14-scripts-disponibles)

---

## 1. Inicio rápido con Docker

```bash
# Clonar rama aws
git clone -b aws https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend

# Configurar entorno
cp .env.example .env
# Editar .env con tus valores

# Construir e iniciar (primera vez)
docker compose up --build -d

# Ver logs
docker compose logs -f
```

El sistema está listo cuando aparece:
```
UniMente Backend corriendo en http://localhost:3000/graphql
```

SQL Server tarda ~60 s en iniciar. El backend espera automáticamente el healthcheck.

**Reinicios posteriores** (sin cambios de código):
```bash
docker compose up -d
```

---

## 2. Variables de entorno

Copia `.env.example` a `.env` y ajusta:

| Variable | Descripción | Requisito |
|---|---|---|
| `DB_PASSWORD` | Contraseña SQL Server | min 8 chars, mayus+minus+num+simbolo |
| `DB_PORT` | Puerto SQL Server | `1433` |
| `DB_NAME` | Nombre de la BD | `unimente` |
| `DB_TRUST_CERT` | Confiar en cert autofirmado | `true` en dev/EC2 |
| `JWT_SECRET` | Clave para firmar tokens | mínimo 32 chars aleatorios |
| `JWT_EXPIRES` | Duración del token | `8h` recomendado |
| `RESTORE_SECRET` | Clave de restauración de emergencia | cadena segura |
| `PORT` | Puerto del servidor NestJS | `3000` |
| `NODE_ENV` | Entorno | `production` en EC2 |
| `ALLOWED_ORIGINS` | CORS whitelist | URLs separadas por coma |
| `SEED_ADMIN_PASSWORD` | Admin principal | min 8 chars |
| `SEED_ADMIN_BRENDA_PASSWORD` | Admin Brenda | min 8 chars |
| `SEED_ADMIN_ABRIL_PASSWORD` | Admin Abril | min 8 chars |
| `SEED_ADMIN_MAI_PASSWORD` | Admin Mai | min 8 chars |
| `SEED_DEFAULT_PASSWORD` | Psicólogos y estudiantes | min 8 chars |

Generar JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 3. Base de datos — inicialización automática

Al arrancar por primera vez, `app.module.ts` ejecuta `initDatabase()`:

1. Conecta a SQL Server en la BD `master`
2. Ejecuta `src/database/init.sql` — crea la BD `unimente` y todas las tablas con `IF NOT EXISTS`
3. Aplica migraciones seguras de columnas MFA si no existen
4. Si la tabla `Psicologo` está vacía → ejecuta el seed automáticamente
5. TypeORM conecta a `unimente` con `synchronize: false`
6. NestJS arranca

**No es necesario ejecutar ningún SQL manualmente.**

La conexión a SQL Server usa `DB_TRUST_CERT` del `.env` para controlar `trustServerCertificate`. En entornos con certificado autofirmado (dev, EC2 con nginx autofirmado) debe ser `true`.

### Esquema de tablas

```
Rol
└── Usuario (id_rol FK, activo BIT)    ← soft delete, mfa_secret, mfa_enabled
      ├── Estudiante (id_usuario FK)
      │     └── Cita (id_estudiante FK, id_psicologo FK)
      │           └── Sesion (id_cita FK, UNIQUE)
      └── Psicologo (id_usuario FK)
            ├── Horario_Psicologo (id_psicologo FK)
            └── Historial_Clinico (id_estudiante FK, id_psicologo FK)
                  └── Detalle_Historial (id_historial FK, id_sesion FK)

Backup_Log     ← registro de cada backup (tipo, formato, tamaño, modo)
Backup_Config  ← configuración del scheduler automático
```

---

## 4. Seed de datos de prueba

### Volumen generado (~2 350 registros)

| Tabla | Registros |
|---|---|
| Roles | 3 (administrador, psicologo, estudiante) |
| Admins | 4 |
| Psicólogos | 12 (+ 12 usuarios) |
| Horarios | ~48 |
| Estudiantes | 100 (+ 100 usuarios) |
| Citas | ~1 400 (58% ASISTIDA · 15% CANCELADA · 27% PENDIENTE) |
| Sesiones clínicas | ~700 |
| Historiales clínicos | ~280 |
| Detalles de historial | ~700 |

### Credenciales

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@unimente.edu | `SEED_ADMIN_PASSWORD` del .env |
| Admin Brenda | brendaAdmin@unimente.com | `SEED_ADMIN_BRENDA_PASSWORD` |
| Admin Abril | abrilAdmin@unimente.com | `SEED_ADMIN_ABRIL_PASSWORD` |
| Admin Mai | maiAdmin@unimente.com | `SEED_ADMIN_MAI_PASSWORD` |
| Psicólogos | psicologo1..12@unimente.edu | `SEED_DEFAULT_PASSWORD` |
| Estudiantes | estudiante1..100@unimente.edu | `SEED_DEFAULT_PASSWORD` |

> Todas las contraseñas del seed deben tener mínimo 8 caracteres. El validador lo exige en `NODE_ENV=production`.

---

## 5. Estructura del proyecto

```
backend/
├── src/
│   ├── app.module.ts              # Módulo raíz — init BD, seed, TypeORM, GraphQL
│   ├── main.ts                    # Bootstrap — helmet, CORS, throttler, ValidationPipe
│   │
│   ├── database/
│   │   └── init.sql               # CREATE IF NOT EXISTS — todas las tablas
│   │
│   ├── seed/
│   │   └── seed.ts                # ~2 350 registros de prueba
│   │
│   ├── auth/                      # Login JWT + estrategia Passport
│   ├── common/
│   │   ├── decorators/            # @CurrentUser, @Roles
│   │   ├── enums/                 # EstadoCita, RolNombre
│   │   ├── filters/               # HttpExceptionFilter
│   │   └── guards/                # JwtAuthGuard, RolesGuard, ThrottlerGuard
│   │
│   ├── mfa/                       # TOTP (speakeasy + qrcode)
│   │
│   ├── backup/
│   │   ├── backup.service.ts      # Lógica de backups SQL/JSON/CSV/Excel
│   │   ├── backup.resolver.ts     # Mutations y queries GraphQL de backups
│   │   ├── backup.module.ts       # Registro de controllers y providers
│   │   ├── backup-download.controller.ts   # GET /api/backup-download/:filename
│   │   ├── emergency-restore.controller.ts # GET /api/emergency-backups
│   │   │                                   # POST /api/emergency-restore
│   │   └── entities/
│   │       ├── backup-log.entity.ts
│   │       └── backup-config.entity.ts
│   │
│   ├── usuario/
│   ├── estudiante/
│   ├── psicologo/
│   ├── horario-psicologo/
│   ├── cita/                      # misCitas + miAgenda (JWT-resolved, sin ID)
│   ├── sesion/
│   ├── historial-clinico/
│   └── detalle-historial/
│
├── nginx/
│   ├── nginx.conf                 # Reverse proxy SSL + CORS handler
│   ├── gen-cert.sh                # Genera certificado autofirmado (1 vez)
│   └── certs/                     # server.crt + server.key (no en Git)
│
├── Dockerfile                     # Multi-stage build: builder → runtime (node:20.14-alpine)
├── docker-compose.yml             # db + backend + nginx con healthchecks
├── .env.example                   # Plantilla de variables
├── tsconfig.json
├── AWS.md                         # Guía de despliegue en EC2
└── BACKEND.md                     # Este archivo
```

---

## 6. Módulos y entidades

### Roles del sistema

| Rol | Descripción |
|---|---|
| `administrador` | Gestiona psicólogos/estudiantes, ejecuta backups, descarga backups |
| `psicologo` | Gestiona horarios, agenda, registra sesiones clínicas |
| `estudiante` | Busca psicólogos, agenda citas, ve sus citas |

### Estados de cita

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Agendada, aún no ocurrida |
| `ASISTIDA` | Registrada al crear una sesión clínica |
| `CANCELADA` | Cancelada por el estudiante o psicólogo |

### Soft delete

La columna `activo BIT` en `Usuario` deshabilita cuentas sin borrar el historial clínico. Los resolvers de administrador exponen `toggleActivoPsicologo` y `toggleActivoEstudiante`.

---

## 7. Autenticación y roles

### Login

```graphql
mutation Login($correo: String!, $password: String!) {
  login(input: { correo: $correo, password: $password }) {
    access_token
    rol
    nombre
    correo
    id_perfil      # id_estudiante o id_psicologo según rol; null para admin
  }
}
```

### Cabecera de autenticación

```
Authorization: Bearer <access_token>
```

### Queries JWT-resolved

Estas queries resuelven automáticamente el perfil desde el JWT — no requieren pasar ID:

```graphql
query { misCitas  { id_cita fecha estado psicologo  { usuario { nombre } } } }
query { miAgenda  { id_cita fecha estado estudiante { usuario { nombre } } } }
```

---

## 8. MFA — Autenticación de dos factores

Implementa **TOTP (RFC 6238)**, compatible con Google Authenticator, Microsoft Authenticator y Authy.

### Flujo

```
1. mutation setupMfa
   → devuelve qr_code (PNG base64) y secret (base32)
   → el usuario escanea el QR en su app autenticadora

2. mutation habilitarMfa(input: { codigo: "123456" })
   → MFA queda ACTIVO en la cuenta

3. Operaciones que requieren MFA activo:
   → crearBackup, restaurarBackup, configurarBackupAutomatico, cambiarPassword
```

### Operaciones

| Operación | Requiere |
|---|---|
| `setupMfa` | JWT |
| `habilitarMfa(codigo)` | JWT |
| `deshabilitarMfa(codigo)` | JWT + código válido |
| `miEstadoMfa` | JWT |
| `cambiarPassword(input)` | JWT (+ `codigo_mfa` si MFA activo) |

---

## 9. Sistema de respaldos

Solo el rol **administrador** puede crear y restaurar backups. Todas las operaciones requieren `codigo_mfa` si el usuario tiene MFA activo.

Los archivos se guardan en `backend/Backup/` (volumen Docker persistente).

### Tipos

| Tipo | Contenido |
|---|---|
| `COMPLETO` | Todos los registros de todas las tablas |
| `DIFERENCIAL` | Solo registros nuevos desde el último COMPLETO |
| `INCREMENTAL` | Solo registros nuevos desde el último backup |

### Formatos

| Formato | Descripción |
|---|---|
| `SQL` | Script con `TRUNCATE + INSERT` (COMPLETO) o `INSERT` (otros) |
| `JSON` | Objeto con metadata + datos por tabla |
| `CSV` | Secciones por tabla con encabezados |
| `EXCEL` | `.xlsx` con una hoja por tabla (ExcelJS) |

### Regla de 3 backups

Cada nuevo backup elimina automáticamente el archivo físico y el registro de BD del más antiguo si se supera el límite de 3.

### Descarga de backups

Los administradores pueden descargar archivos de backup desde la interfaz web.

**Endpoint:** `GET /api/backup-download/:filename`

- Requiere JWT de administrador
- Protegido contra path traversal (CWE-23): allowlist de caracteres + `resolve()` + `startsWith()`
- Devuelve el archivo como stream (`application/octet-stream`)

### Backup automático

Configurable desde la UI. Se ejecuta un backup inicial inmediatamente al configurar.

```graphql
mutation {
  configurarBackupAutomatico(input: {
    tipo: "COMPLETO"
    formato: "SQL"
    frecuencia_horas: 24
    codigo_mfa: "123456"
  }) { tipo formato frecuencia_horas ultima_ejecucion }
}
```

---

## 10. Restauración de emergencia

Accesible **sin JWT**, solo cuando `dbo.Usuario` está vacía (0 registros):

| Endpoint | Descripción |
|---|---|
| `GET /api/emergency-backups` | Lista archivos `.sql/.json/.csv/.xlsx` en `Backup/` |
| `POST /api/emergency-restore` | Restaura un backup por nombre de archivo |

Requiere cabecera: `X-Restore-Secret: <valor de RESTORE_SECRET en .env>`

Acceso desde el frontend en `/emergency-restore`.

**Seguridad implementada:**
- `timingSafeEqual` para comparar el secret (anti timing attack)
- Allowlist de caracteres en nombre de archivo
- `resolve() + startsWith()` para directory confinement (CWE-23)
- Logs con IP del cliente en todos los intentos

---

## 11. API GraphQL — Referencia completa

### Públicas (sin token)

```graphql
mutation { login(input: { correo: "", password: "" }) {
  access_token rol nombre correo id_perfil
}}

mutation { registrarEstudiante(input: $input) {
  id_estudiante usuario { nombre correo }
}}
```

### Estudiante

```graphql
# Buscar psicólogos disponibles con horarios
query { psicologos {
  id_psicologo especialidad cedula usuario { nombre }
  horarios { dia_semana hora_inicio hora_fin }
}}

# Mis citas (JWT-resolved, sin pasar ID)
query { misCitas {
  id_cita fecha hora_inicio estado motivo
  psicologo { usuario { nombre } }
}}

# Agendar
mutation { agendarCita(input: {
  id_psicologo: 1  fecha: "2026-05-10"
  hora_inicio: "10:00"  motivo: "Ansiedad"
}) { id_cita fecha estado }}

# Cancelar
mutation { cambiarEstadoCita(id_cita: 1, input: { estado: "CANCELADA" }) {
  id_cita estado
}}
```

### Psicólogo

```graphql
# Mi agenda (JWT-resolved)
query { miAgenda {
  id_cita fecha hora_inicio estado
  estudiante { usuario { nombre } matricula carrera }
}}

# Horarios
mutation { crearHorario(input: {
  dia_semana: "lunes"  hora_inicio: "09:00"  hora_fin: "10:00"
}) { id_horario dia_semana hora_inicio hora_fin }}
mutation { eliminarHorario(id: 1) }

# Marcar cita como asistida / cancelar
mutation { cambiarEstadoCita(id_cita: 1, input: { estado: "ASISTIDA" }) {
  id_cita estado
}}

# Registrar sesión clínica (marca cita como ASISTIDA automáticamente)
mutation { registrarSesion(input: {
  id_cita: 1  numero_sesion: 1
  notas: "El paciente muestra mejoría."
}) { id_sesion numero_sesion notas }}

# Expediente de paciente
query { expedienteEstudiante(id_estudiante: 1) {
  id_historial
  detalles { sesion { notas numero_sesion } }
}}

# Mis pacientes
query { misPacientes {
  id_estudiante usuario { nombre correo }
  citas { id_cita fecha estado }
}}
```

### Administrador

```graphql
# Listados con toggle activo/inactivo
query { psicologosAdmin {
  id_psicologo cedula especialidad usuario { nombre correo activo }
}}
query { estudiantesAdmin {
  id_estudiante matricula carrera usuario { nombre correo activo }
}}
mutation { toggleActivoPsicologo(id: 1)  { id_psicologo usuario { activo } } }
mutation { toggleActivoEstudiante(id: 1) { id_estudiante usuario { activo } } }

# Registrar psicólogo
mutation { registrarPsicologo(input: {
  nombre: ""  correo: ""  password: ""
  cedula: ""  especialidad: ""  telefono: ""
}) { id_psicologo usuario { nombre } }}

# Backups
query { listarBackups {
  id_backup tipo formato modo nombre_archivo tamanio_kb created_at
}}
mutation { crearBackup(input: {
  tipo: "COMPLETO"  formato: "SQL"  codigo_mfa: "123456"
}) { id_backup nombre_archivo tamanio_kb }}
mutation { restaurarBackup(input: {
  id_backup: 1  codigo_mfa: "123456"
}) }
query { configBackupAutomatico {
  tipo formato frecuencia_horas ultima_ejecucion
}}
mutation { configurarBackupAutomatico(input: {
  tipo: "COMPLETO"  formato: "SQL"
  frecuencia_horas: 24  codigo_mfa: "123456"
}) { tipo formato frecuencia_horas }}
```

### Endpoints REST

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/backup-download/:filename` | JWT admin | Descarga archivo de backup |
| `GET` | `/api/emergency-backups` | Ninguna | Lista backups (BD vacía) |
| `POST` | `/api/emergency-restore` | `X-Restore-Secret` | Restaura en emergencia |

---

## 12. Despliegue en AWS EC2

Ver **[AWS.md](./AWS.md)** para la guía completa.

### Resumen de la arquitectura en producción

```
Amplify (frontend HTTPS)
        │
        │  POST https://<IP>/graphql
        ▼
EC2 c7i-flex.large
  nginx:443 (SSL termination + CORS handler)
        │
  NestJS:3000 (interno)
        │
  SQL Server:1433 (interno, volumen EBS)
```

### CORS en producción

El CORS lo maneja **nginx**, no NestJS, para evitar que Apollo Server v4 y NestJS dupliquen el header `Access-Control-Allow-Origin`. nginx usa `proxy_hide_header` para quitar los headers del backend y los pone una sola vez con el origen correcto.

### SSL

Certificado autofirmado generado con `nginx/gen-cert.sh`. Los usuarios deben aceptarlo una vez en el navegador visitando `https://<IP>/graphql`.

---

## 13. Aplicar nuevos cambios

### En local → subir al repo

```bash
git add .
git commit -m "descripción del cambio"
git push origin aws
```

Amplify detecta el push y redespliega el frontend automáticamente en ~2 min.

### En la EC2 → bajar del repo

```bash
ssh -i unimente-key.pem ec2-user@<IP_PUBLICA>
cd ~/unimente-backend
git stash                   # guardar cambios locales si los hay
git pull origin aws
git stash drop              # descartar stash (los cambios vinieron del repo)
cd backend
```

**Según qué cambió:**

```bash
# Solo frontend o configuración (no código backend):
docker compose up -d

# Código backend (src/, package.json, Dockerfile):
docker compose up --build -d backend

# nginx.conf:
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload

# docker-compose.yml:
docker compose down && docker compose up -d
```

> Los datos de SQL Server **no se borran** al rebuildar. El volumen `unimente_sqlserver_data` persiste siempre.

---

## 14. Scripts disponibles

```bash
# Desarrollo local (sin Docker)
npm run start:dev    # hot-reload
npm run build        # compilar TypeScript

# Docker — operación diaria
docker compose up --build -d   # primera vez o tras cambios de código
docker compose up -d           # reinicios sin cambios
docker compose down            # detener (sin borrar datos)
docker compose logs -f         # logs en tiempo real
docker compose logs -f backend # solo backend
docker compose ps              # estado de contenedores

# Seed manual (borra y recrea todos los datos de prueba)
docker exec -it unimente-backend \
  node dist/seed/seed.js
```