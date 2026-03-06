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
10. [API GraphQL — referencia de operaciones](#10-api-graphql--referencia-de-operaciones)  
11. [Decisiones técnicas y bugs resueltos](#11-decisiones-técnicas-y-bugs-resueltos)  
12. [Scripts disponibles](#12-scripts-disponibles)  

---

## 1. Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| MySQL | 8.0 |
| NestJS CLI (opcional) | `npm i -g @nestjs/cli` |

**Instalar Node.js**

Windows / macOS: https://nodejs.org (descargar instalador LTS)

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
npm install
```

---

## 3. Variables de entorno

Crea el archivo `.env` en la carpeta `backend/`:

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

Si prefieres no crear el archivo `.env`, puedes exportar las variables directamente:

**Windows (PowerShell):**
```powershell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="tu_password"
$env:DB_NAME="unimente"
$env:JWT_SECRET="unimente_super_secret_2024"
```

**macOS / Linux:**
```bash
export DB_HOST=localhost DB_USER=root DB_PASSWORD=tu_password
export DB_NAME=unimente JWT_SECRET=unimente_super_secret_2024
```

---

## 4. Base de datos

### Inicialización automática al arrancar

Al ejecutar `nest start`, el módulo raíz realiza estos pasos antes de que NestJS cargue cualquier módulo:

1. Abre una conexión temporal a MySQL **sin especificar base de datos**
2. Lee y ejecuta `src/database/init.sql` que contiene:
   - `CREATE DATABASE IF NOT EXISTS unimente`
   - `CREATE TABLE IF NOT EXISTS` para cada tabla
   - `INSERT IGNORE INTO Rol` con los tres roles del sistema
   - `INSERT IGNORE INTO Usuario` con el administrador por defecto
3. Verifica si la tabla `Psicologo` está vacía — si lo está, ejecuta el seed automáticamente
4. Cierra la conexión temporal y TypeORM conecta normalmente a `unimente`

**No es necesario correr ningún script SQL manualmente.**

### Inicialización manual (alternativa)

Si prefieres crear las tablas tú mismo:

```bash
# Windows
mysql -u root -p < src\database\init.sql

# macOS / Linux
mysql -u root -p < src/database/init.sql
```

### Por qué se usa `process.cwd()` y no `__dirname`

```typescript
const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
```

Cuando NestJS compila el proyecto, `__dirname` apunta a `dist/` y el archivo `.sql` no existe ahí. `process.cwd()` apunta al directorio desde donde se ejecuta el comando (`backend/`), donde sí existe `src/database/init.sql`.

### Esquema de tablas

```
Rol
└── Usuario (id_rol FK)
      ├── Estudiante (id_usuario FK)
      │     └── Cita (id_estudiante FK, id_psicologo FK)
      │           └── Sesion (id_cita FK, UNIQUE)
      └── Psicologo (id_usuario FK)
            ├── Horario_Psicologo (id_psicologo FK)
            └── Historial_Clinico (id_estudiante FK, id_psicologo FK, UNIQUE)
                  └── Detalle_Historial (id_historial FK, id_sesion FK)
```

### Nota crítica: columna `estado` en Cita

```sql
estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
```

Se almacena como `VARCHAR`, **no** como `ENUM` nativo de MySQL. Valores válidos: `PENDIENTE`, `ASISTIDA`, `CANCELADA` (mayúsculas).

Razón explicada en la sección [11. Decisiones técnicas](#11-decisiones-técnicas-y-bugs-resueltos).

---

## 5. Seed de datos de prueba

### Ejecución automática

El seed corre solo la primera vez que se levanta el servidor (cuando la tabla `Psicologo` está vacía). Los reinicios posteriores muestran:

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
| Citas (mezcla PENDIENTE / ASISTIDA / CANCELADA) | ~450 |
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

El seed usa `TRUNCATE TABLE` para limpiar antes de insertar, por lo que es idempotente.

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
├── src/
│   ├── app.module.ts              # Módulo raíz — init BD + seed automático
│   ├── main.ts                    # Bootstrap NestJS + Apollo Sandbox embebido
│   │
│   ├── database/
│   │   └── init.sql               # Script idempotente: CREATE IF NOT EXISTS
│   │
│   ├── seed/
│   │   └── seed.ts                # Genera ~1 100 registros, exporta runSeed()
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.resolver.ts
│   │   ├── auth.service.ts
│   │   ├── dto/login.input.ts
│   │   └── strategies/jwt.strategy.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── enums/
│   │   │   ├── estado-cita.enum.ts   # PENDIENTE | ASISTIDA | CANCELADA
│   │   │   └── rol.enum.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       └── roles.guard.ts
│   │
│   ├── rol/
│   ├── usuario/
│   ├── estudiante/
│   ├── psicologo/
│   ├── horario-psicologo/
│   ├── cita/
│   ├── sesion/
│   ├── historial-clinico/
│   └── detalle-historial/
│
├── .env                           # Variables de entorno (crear manualmente)
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 8. Módulos y entidades

### Roles del sistema

| Rol | Descripción |
|---|---|
| `administrador` | Registra psicólogos, gestiona el sistema |
| `psicologo` | Gestiona horarios, agenda y sesiones clínicas |
| `estudiante` | Busca psicólogos, agenda y cancela citas |

### Estados de cita

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Cita agendada, aún no ocurrida |
| `ASISTIDA` | Se marca automáticamente al registrar una sesión |
| `CANCELADA` | Cancelada por estudiante o psicólogo |

### Flujo de registro de sesión clínica

Todo ocurre dentro de una **única transacción**:

```
Psicólogo llama registrarSesion()
  │
  ├── INSERT Sesion (notas, recomendaciones)
  ├── UPDATE Cita SET estado = 'ASISTIDA'   ← SQL directo, no TypeORM save()
  ├── FIND OR CREATE Historial_Clinico (estudiante + psicólogo)
  └── INSERT Detalle_Historial (vincula sesión al historial)

Si cualquier paso falla → ROLLBACK completo
```

---

## 9. Autenticación y roles

### Obtener token (Login)

```graphql
mutation Login {
  login(input: {
    correo: "psicologo1@unimente.edu"
    password: "Password123!"
  }) {
    access_token
    rol
    nombre
    correo
    id_perfil
  }
}
```

`id_perfil` devuelve:
- `id_estudiante` si `rol = estudiante`
- `id_psicologo` si `rol = psicologo`
- `null` si `rol = administrador`

### Enviar el token

En cada petición GraphQL protegida, incluir el header:

```
Authorization: Bearer <access_token>
```

En Apollo Sandbox: ir a la pestaña **Headers** y agregar la clave `Authorization`.

### Protección de resolvers

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolNombre.PSICOLOGO)
@Mutation(() => Cita)
async cambiarEstadoCita(...) {}
```

### IDs nunca vienen del cliente

Los campos `id_estudiante` e `id_psicologo` **siempre** se resuelven en el backend a partir del JWT. El cliente nunca los envía. Esto previene que un usuario modifique datos ajenos.

---

## 10. API GraphQL — referencia de operaciones

### Públicas (sin token)

```graphql
# Registrar estudiante
mutation RegistrarEstudiante($input: CreateEstudianteInput!) {
  registrarEstudiante(input: $input) {
    id_estudiante
    usuario { nombre correo }
  }
}

# Login
mutation Login($correo: String!, $password: String!) {
  login(input: { correo: $correo, password: $password }) {
    access_token  rol  nombre  correo  id_perfil
  }
}
```

### Administrador

```graphql
# Registrar psicólogo
mutation RegistrarPsicologo($input: CreatePsicologoInput!) {
  registrarPsicologo(input: $input) {
    id_psicologo especialidad
    usuario { nombre correo }
  }
}

# Editar psicólogo (solo campos con valor se envían)
mutation ActualizarPsicologo($id: Int!, $input: UpdatePsicologoInput!) {
  actualizarPsicologo(id: $id, input: $input) {
    id_psicologo especialidad cedula telefono
  }
}

# Listar todos
query GetPsicologos {
  psicologos {
    id_psicologo especialidad cedula telefono
    usuario { nombre correo }
    horarios { dia_semana hora_inicio hora_fin disponible }
  }
}
```

### Psicólogo

```graphql
# Ver agenda
query AgendaPsicologo($id_psicologo: Int!) {
  agendaPsicologo(id_psicologo: $id_psicologo) {
    id_cita fecha hora_inicio hora_fin estado motivo
    estudiante { usuario { nombre } matricula carrera }
    sesion { id_sesion }
  }
}

# Agregar horario
mutation CrearHorario($input: CreateHorarioInput!) {
  crearHorario(input: $input) {
    id_horario dia_semana hora_inicio hora_fin
  }
}

# Eliminar horario
mutation EliminarHorario($id: Int!) {
  eliminarHorario(id: $id)
}

# Cambiar estado de cita
mutation CambiarEstadoCita($id_cita: Int!, $input: UpdateEstadoCitaInput!) {
  cambiarEstadoCita(id_cita: $id_cita, input: $input) {
    id_cita estado
  }
}

# Registrar sesión clínica
mutation RegistrarSesion($input: CreateSesionInput!) {
  registrarSesion(input: $input) {
    id_sesion numero_sesion notas recomendaciones
  }
}

# Ver expediente de un estudiante
query ExpedienteEstudiante($id_estudiante: Int!) {
  expedienteEstudiante(id_estudiante: $id_estudiante) {
    id_historial fecha_apertura
    psicologo { usuario { nombre } especialidad }
    detalles {
      sesion { numero_sesion notas recomendaciones fecha_registro }
    }
  }
}
```

### Estudiante

```graphql
# Buscar psicólogos
query GetPsicologos {
  psicologos {
    id_psicologo especialidad
    usuario { nombre correo }
    horarios { id_horario dia_semana hora_inicio hora_fin disponible }
  }
}

# Agendar cita
mutation AgendarCita($input: CreateCitaInput!) {
  agendarCita(input: $input) {
    id_cita fecha hora_inicio hora_fin estado
    psicologo { usuario { nombre } especialidad }
  }
}

# Ver mis citas
query CitasEstudiante($id_estudiante: Int!) {
  citasEstudiante(id_estudiante: $id_estudiante) {
    id_cita fecha hora_inicio hora_fin estado motivo
    psicologo { especialidad usuario { nombre } }
  }
}

# Cancelar cita
mutation CambiarEstadoCita($id_cita: Int!, $input: UpdateEstadoCitaInput!) {
  cambiarEstadoCita(id_cita: $id_cita, input: $input) {
    id_cita estado
  }
}
```

---

## 11. Decisiones técnicas y bugs resueltos

### Bug 1 — `estado` como VARCHAR en lugar de ENUM

**Síntoma:** `Enum "EstadoCita" cannot represent value: ""`

**Causa:** TypeORM con `@Column({ type: 'enum', enum: EstadoCita })` intercepta el valor durante `save()`. Cuando el update se hace con SQL directo y TypeORM recarga la entidad desde su identity map (sin consultar la BD), el campo puede aparecer vacío. GraphQL intenta serializar `""` como `EstadoCita` y falla.

**Solución — tres cambios coordinados:**

```sql
-- BD: VARCHAR en lugar de ENUM
estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
```

```typescript
// Entidad: varchar en TypeORM
@Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
estado: string;

// @Field() sin tipo explícito → GraphQL lo infiere como String
// NO usar @Field(() => EstadoCita) en el output
@Field()
estado: string;
```

```typescript
// Service: SQL directo para todas las escrituras de estado
await this.dataSource.query(
  'UPDATE Cita SET estado = ? WHERE id_cita = ?',
  [input.estado, id],
);
```

El enum `EstadoCita` sigue existiendo para validar los inputs:
```typescript
// DTO: el enum valida lo que el cliente manda
@Field(() => EstadoCita)
@IsEnum(EstadoCita)
estado: EstadoCita;
```

### Bug 2 — `ENOENT: init.sql not found` al compilar

**Síntoma:** `Error: ENOENT: no such file or directory, open '...dist/database/init.sql'`

**Causa:** `__dirname` en código compilado apunta a `dist/`, pero `init.sql` está en `src/`.

**Solución:**
```typescript
// process.cwd() siempre es la raíz del proyecto
const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
```

### Bug 3 — `Column 'id_rol' cannot be null` en el seed

**Síntoma:** El seed fallaba al insertar usuarios porque `id_rol` llegaba como `NULL`.

**Causa:** La desestructuración `const [[{ id_rol_psi }]] = await conn.query(...)` falla si `mysql2` serializa el resultado de forma diferente según la versión del driver.

**Solución — helper `getId()` que no asume el nombre de la clave:**
```typescript
async function getId(conn, sql, params): Promise<number> {
  const [rows] = await conn.query(sql, params);
  const row = (rows as any[])[0];
  return Number(Object.values(row)[0]); // accede por posición, no por nombre
}
```

### Bug 4 — Limpieza del seed con `DELETE` fallaba

**Síntoma:** `Unknown column 'id_' in 'where clause'`

**Causa:** Se intentaba construir el nombre de columna dinámicamente a partir del nombre de la tabla, lo que producía nombres inválidos como `id_historial_clinico` → `id_`.

**Solución:** Usar `TRUNCATE TABLE` en orden inverso de FK con `FOREIGN_KEY_CHECKS = 0`:
```typescript
await conn.query('SET FOREIGN_KEY_CHECKS = 0');
for (const t of ['Detalle_Historial','Historial_Clinico','Sesion','Cita',...])
  await conn.query(`TRUNCATE TABLE ${t}`);
await conn.query('SET FOREIGN_KEY_CHECKS = 1');
```

---

## 12. Scripts disponibles

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
| `npm install` | Instalar dependencias (primera vez) |
| `npm run start:dev` | Servidor en modo desarrollo (hot-reload) |
| `npm run build` | Compilar TypeScript a `dist/` |
| `npm run start:prod` | Servidor en modo producción desde `dist/` |
| `npm run seed` | Reiniciar base de datos con datos de prueba |