# UniMente — Backend

API GraphQL del Portal de Bienestar Universitario.  
Stack: **NestJS v11 · TypeORM · SQL Server 2022 · Apollo GraphQL v4 · Passport JWT · @nestjs/schedule**

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Inicio rápido con Docker](#2-inicio-rápido-con-docker)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Base de datos](#4-base-de-datos)
5. [Seed de datos de prueba](#5-seed-de-datos-de-prueba)
6. [Estructura del proyecto](#6-estructura-del-proyecto)
7. [Módulos y entidades](#7-módulos-y-entidades)
8. [Autenticación y roles](#8-autenticación-y-roles)
9. [MFA — Autenticación de dos factores](#9-mfa--autenticación-de-dos-factores)
10. [Sistema de respaldos](#10-sistema-de-respaldos)
11. [Restauración de emergencia](#11-restauración-de-emergencia)
12. [API GraphQL — Referencia de operaciones](#12-api-graphql--referencia-de-operaciones)
13. [Despliegue en AWS EC2](#13-despliegue-en-aws-ec2)
14. [Scripts disponibles](#14-scripts-disponibles)

---

## 1. Requisitos

### Con Docker (recomendado)
| Herramienta | Versión mínima |
|---|---|
| Docker | 24+ |
| Docker Compose v2 | 2.24+ |

### Sin Docker (desarrollo local)
| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS |
| npm | 10 |
| SQL Server | 2022 |

---

## 2. Inicio rápido con Docker

```bash
# 1. Clonar rama aws
git clone -b aws https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend

# 2. Configurar entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Construir e iniciar (primera vez)
docker compose up --build -d

# 4. Ver logs
docker compose logs -f

# Reinicios posteriores (sin reconstruir)
docker compose up -d
```

El sistema estará listo cuando veas:
```
UniMente Backend corriendo en http://localhost:3000/graphql
```

SQL Server tarda ~60 segundos en inicializar la primera vez. El backend espera automáticamente gracias al healthcheck.

---

## 3. Variables de entorno

Crea `.env` a partir de `.env.example`:

```env
# Base de datos
DB_PASSWORD=UniMente_DB_2026!     # min 8 chars, mayus+minus+numero+simbolo
DB_PORT=1433
DB_NAME=unimente
DB_TRUST_CERT=true                # false en produccion con certificado real

# JWT
JWT_SECRET=<64+ chars aleatorios>
JWT_EXPIRES=8h

# Emergencia
RESTORE_SECRET=<clave segura>

# Servidor
PORT=3000
NODE_ENV=production

# CORS — lista blanca de origenes permitidos
ALLOWED_ORIGINS=https://aws.d1mrcwf1ifucba.amplifyapp.com,http://localhost:5173

# Contraseñas del seed (CWE-547)
SEED_ADMIN_PASSWORD=Admin1234!
SEED_DEFAULT_PASSWORD=Password123!
```

Generar JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Base de datos

### Inicialización automática

Al arrancar por primera vez, el backend:

1. Conecta a SQL Server en `master`
2. Ejecuta `src/database/init.sql` — crea la BD `unimente` y todas las tablas
3. Si `Psicologo` está vacía → corre el seed automáticamente
4. TypeORM conecta a `unimente` y NestJS arranca

**No es necesario ejecutar ningún SQL manualmente.**

### Esquema de tablas

```
Rol
└── Usuario (id_rol FK)           ← mfa_secret, mfa_enabled, activo
      ├── Estudiante (id_usuario FK)
      │     └── Cita (id_estudiante FK, id_psicologo FK)
      │           └── Sesion (id_cita FK, UNIQUE)
      └── Psicologo (id_usuario FK)
            ├── Horario_Psicologo (id_psicologo FK)
            └── Historial_Clinico (id_estudiante FK, id_psicologo FK)
                  └── Detalle_Historial (id_historial FK, id_sesion FK)

Backup_Log     ← registro de cada backup realizado
Backup_Config  ← configuración del backup automático
```

---

## 5. Seed de datos de prueba

### Registros generados (~2 000+)

| Tabla | Registros |
|---|---|
| Admins | 4 |
| Psicólogos | 12 (+ 12 usuarios) |
| Horarios | ~48 |
| Estudiantes | 100 (+ 100 usuarios) |
| Citas | ~1 400 (58% ASISTIDA, 15% CANCELADA, 27% PENDIENTE) |
| Sesiones clínicas | ~700 |
| Historiales clínicos | ~280 |
| Detalles historial | ~700 |
| **Total** | **~2 350** |

### Credenciales

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@unimente.edu | `SEED_ADMIN_PASSWORD` del .env |
| Psicólogos | psicologo1..12@unimente.edu | `SEED_DEFAULT_PASSWORD` del .env |
| Estudiantes | estudiante1..100@unimente.edu | `SEED_DEFAULT_PASSWORD` del .env |

### Re-ejecutar seed (borra y recrea todo)

```bash
# Dentro del contenedor
docker compose exec backend npx ts-node -r tsconfig-paths/register src/seed/seed.ts

# O desde la terminal de la EC2
docker exec -it unimente-backend npx ts-node -r tsconfig-paths/register src/seed/seed.ts
```

---

## 6. Estructura del proyecto

```
backend/
├── src/
│   ├── app.module.ts              # Módulo raíz — init BD, seed, ScheduleModule
│   ├── main.ts                    # Bootstrap + helmet + CORS + throttler
│   │
│   ├── database/
│   │   └── init.sql               # CREATE IF NOT EXISTS + migración MFA + Backup
│   │
│   ├── seed/
│   │   └── seed.ts                # ~2 350 registros de prueba
│   │
│   ├── auth/                      # JWT login
│   ├── common/
│   │   ├── decorators/            # @CurrentUser, @Roles
│   │   ├── enums/                 # EstadoCita, RolNombre
│   │   └── guards/                # JwtAuthGuard, RolesGuard, ThrottlerGuard
│   │
│   ├── mfa/                       # TOTP con speakeasy + qrcode
│   ├── backup/                    # Respaldos SQL/JSON/CSV/Excel + scheduler
│   │   └── emergency-restore.controller.ts
│   │
│   ├── usuario/
│   ├── estudiante/
│   ├── psicologo/
│   ├── horario-psicologo/
│   ├── cita/                      # misCitas + miAgenda (JWT-resolved)
│   ├── sesion/
│   ├── historial-clinico/
│   └── detalle-historial/
│
├── Dockerfile                     # Multi-stage build (builder + runtime)
├── docker-compose.yml             # SQL Server + NestJS con healthcheck
├── .env.example                   # Plantilla de variables de entorno
├── AWS.md                         # Guía de despliegue en EC2
└── BACKEND.md                     # Este archivo
```

---

## 7. Módulos y entidades

### Roles

| Rol | Descripción |
|---|---|
| `administrador` | Gestiona psicólogos, ejecuta backups |
| `psicologo` | Gestiona horarios, agenda y sesiones clínicas |
| `estudiante` | Busca psicólogos y agenda citas |

### Estados de cita

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Cita agendada, aún no ocurrida |
| `ASISTIDA` | Marcada al registrar una sesión clínica |
| `CANCELADA` | Cancelada por estudiante o psicólogo |

### Soft delete

La columna `activo BIT` en `Usuario` permite deshabilitar cuentas sin borrar historial clínico.

---

## 8. Autenticación y roles

### Login

```graphql
mutation Login($correo: String!, $password: String!) {
  login(input: { correo: $correo, password: $password }) {
    access_token
    rol
    nombre
    correo
    id_perfil
  }
}
```

El campo `id_perfil` devuelve `id_estudiante` o `id_psicologo` según el rol. Para `administrador` devuelve `null`.

### Cabecera de autenticación

```
Authorization: Bearer <access_token>
```

### Queries JWT-resolved (sin parámetro de ID)

```graphql
query { misCitas { id_cita fecha estado psicologo { usuario { nombre } } } }
query { miAgenda { id_cita fecha estado estudiante { usuario { nombre } } } }
```

---

## 9. MFA — Autenticación de dos factores

Implementa **TOTP (RFC 6238)**, compatible con Google Authenticator, Microsoft Authenticator y Authy.

### Flujo de activación

```
1. mutation setupMfa
   → devuelve qr_code (PNG base64) y secret (base32)
   → el usuario escanea el QR

2. mutation habilitarMfa(input: { codigo: "123456" })
   → MFA queda ACTIVO

3. A partir de aquí, crearBackup y restaurarBackup requieren codigo_mfa
```

### Operaciones disponibles

| Operación | Requiere |
|---|---|
| `setupMfa` | JWT |
| `habilitarMfa(codigo)` | JWT |
| `deshabilitarMfa(codigo)` | JWT + código válido |
| `miEstadoMfa` | JWT |
| `cambiarPassword(input)` | JWT (+ codigo_mfa si MFA activo) |

---

## 10. Sistema de respaldos

Solo el rol **administrador** puede ejecutar backups. Todas las operaciones requieren `codigo_mfa` si está activo.

Los archivos se guardan en `backend/Backup/` (volumen Docker persistente).

### Tipos de backup

| Tipo | Contenido |
|---|---|
| `COMPLETO` | Todos los registros de todas las tablas |
| `DIFERENCIAL` | Solo registros nuevos desde el último COMPLETO |
| `INCREMENTAL` | Solo registros nuevos desde el último backup |

### Formatos

| Formato | Descripción |
|---|---|
| `SQL` | Script ejecutable (`TRUNCATE+INSERT` o `REPLACE INTO`) |
| `JSON` | Objeto con metadata + datos por tabla |
| `CSV` | Secciones por tabla con encabezados |
| `EXCEL` | `.xlsx` con una hoja por tabla |

### Límite: 3 backups máximo

Cada nuevo backup elimina automáticamente el archivo físico y registro en BD del más antiguo que exceda el límite.

---

## 11. Restauración de emergencia

Endpoint REST accesible **solo cuando la tabla Usuario está vacía** (BD sin datos):

```
GET  /api/emergency-backups   → lista archivos disponibles en Backup/
POST /api/emergency-restore   → restaura un backup específico
```

Requiere la cabecera `X-Restore-Secret` con el valor de `RESTORE_SECRET` del `.env`.

Acceso desde el frontend en `/emergency-restore`.

---

## 12. API GraphQL — Referencia de operaciones

### Públicas (sin token)

```graphql
mutation { login(input: { correo: "", password: "" }) { access_token rol nombre correo id_perfil } }
mutation { registrarEstudiante(input: $input) { id_estudiante usuario { nombre } } }
```

### Estudiante

```graphql
query  { psicologos { id_psicologo especialidad usuario { nombre } horarios { dia_semana hora_inicio hora_fin } } }
query  { misCitas { id_cita fecha hora_inicio estado motivo psicologo { usuario { nombre } } } }
mutation { agendarCita(input: $input) { id_cita fecha estado } }
mutation { cambiarEstadoCita(id_cita: $id, input: { estado: "CANCELADA" }) { id_cita estado } }
```

### Psicólogo

```graphql
query  { miAgenda { id_cita fecha hora_inicio estado estudiante { usuario { nombre } matricula } } }
mutation { crearHorario(input: $input) { id_horario dia_semana hora_inicio hora_fin } }
mutation { eliminarHorario(id: $id) }
mutation { cambiarEstadoCita(id_cita: $id, input: $input) { id_cita estado } }
mutation { registrarSesion(input: $input) { id_sesion numero_sesion notas } }
query  { expedienteEstudiante(id_estudiante: $id) { id_historial detalles { sesion { notas } } } }
```

### Administrador

```graphql
query  { psicologosAdmin { id_psicologo usuario { nombre correo activo } especialidad cedula } }
query  { estudiantesAdmin { id_estudiante usuario { nombre correo activo } matricula carrera } }
mutation { toggleActivoPsicologo(id: $id) { id_psicologo usuario { activo } } }
mutation { toggleActivoEstudiante(id: $id) { id_estudiante usuario { activo } } }
mutation { registrarPsicologo(input: $input) { id_psicologo usuario { nombre } } }
query  { listarBackups { id_backup tipo formato nombre_archivo tamanio_kb created_at } }
mutation { crearBackup(input: { tipo: "COMPLETO", formato: "SQL", codigo_mfa: "" }) { id_backup } }
mutation { restaurarBackup(input: { id_backup: 1, codigo_mfa: "" }) }
```

---

## 13. Despliegue en AWS EC2

Ver **AWS.md** para la guía completa de configuración, auto-inicio y operación.

### Resumen de la arquitectura

```
Amplify (frontend) ──── HTTP/3000 ────► EC2 18.190.217.141
                                          ├── Docker: unimente-backend (NestJS)
                                          │     └── Red interna ──► unimente-sqlserver
                                          └── Docker: unimente-sqlserver
                                                └── Volumen: unimente_sqlserver_data
```

El servicio `systemd` **unimente.service** garantiza que Docker Compose arranque automáticamente al encender la EC2.

---

## 14. Scripts disponibles

```bash
# Desarrollo local
npm run start:dev    # hot-reload
npm run build        # compilar a dist/

# Docker
docker compose up --build -d   # primera vez
docker compose up -d           # reinicios posteriores
docker compose down            # detener (sin borrar datos)
docker compose logs -f         # ver logs en tiempo real

# Seed manual (borra y recrea todos los datos)
docker exec -it unimente-backend \
  npx ts-node -r tsconfig-paths/register src/seed/seed.ts
```