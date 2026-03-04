# ⚙️ UniMente — Backend

API GraphQL construida con **NestJS + TypeORM + MySQL** para la plataforma de gestión de citas psicológicas universitarias.

← [Volver al README principal](./README.md) | [Ver documentación del Frontend](./FRONTEND.md)

---

## 📁 Estructura del proyecto

```
backend/
├── src/
│   ├── auth/                    # Login + JWT + Passport
│   ├── common/
│   │   ├── decorators/          # @CurrentUser, @Roles
│   │   ├── guards/              # JwtAuthGuard, RolesGuard
│   │   └── enums/               # RolNombre, EstadoCita
│   ├── rol/                     # Entidad Rol
│   ├── usuario/                 # Entidad Usuario
│   ├── estudiante/              # CRUD estudiantes
│   ├── psicologo/               # CRUD psicólogos
│   ├── horario-psicologo/       # Disponibilidad por día/hora
│   ├── cita/                    # Agenda y estados de cita
│   ├── sesion/                  # Registro de sesiones clínicas
│   ├── historial-clinico/       # Expediente del estudiante
│   ├── detalle-historial/       # Vínculo sesión ↔ historial
│   ├── app.module.ts            # Módulo raíz (GraphQL + TypeORM)
│   └── main.ts                  # Bootstrap + middlewares
├── .env                         # Variables de entorno (no subir a git)
├── .env.example                 # Plantilla de variables
└── seed.sql                     # Datos iniciales (roles + admin)
```

---

## ⚙️ Configuración del entorno

Copia `.env.example` a `.env` y llena tus valores:

**Windows (PowerShell)**
```powershell
Copy-Item .env.example .env
```

**Linux / macOS**
```bash
cp .env.example .env
```

### Variables disponibles en `.env`

```env
# ── Base de datos MySQL ─────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=unimente

# ── Sincronización de tablas ────────────────────────────
# true  → TypeORM crea/actualiza tablas automáticamente al iniciar
# false → Las tablas NO se modifican (usar en producción)
DB_SYNCHRONIZE=true

# ── JWT ─────────────────────────────────────────────────
JWT_SECRET=cambia_este_secreto_en_produccion

# ── App ─────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
```

---

## 🗄️ Base de datos

### Crear la base de datos

**Windows (PowerShell)**
```powershell
mysql -u root -p -e "CREATE DATABASE unimente CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**Linux / macOS**
```bash
mysql -u root -p -e "CREATE DATABASE unimente CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Controlar la sincronización de tablas desde `.env`

| `DB_SYNCHRONIZE` | Comportamiento |
|---|---|
| `true` | TypeORM crea o actualiza las tablas automáticamente al iniciar. Ideal para desarrollo inicial. |
| `false` | No toca la BD al iniciar. Recomendado cuando las tablas ya existen. |

### Primer arranque — tablas nuevas

1. Asegúrate de tener `DB_SYNCHRONIZE=true` en `.env`
2. Inicia el servidor — TypeORM crea todas las tablas automáticamente
3. Ejecuta el seed para insertar roles y el admin inicial:

**Windows (PowerShell)**
```powershell
mysql -u root -p unimente < seed.sql
```

**Linux / macOS**
```bash
mysql -u root -p unimente < seed.sql
```

4. Cambia a `DB_SYNCHRONIZE=false` para evitar recrear tablas en siguientes reinicios

### Arranque normal — tablas ya existentes

Verifica que tienes `DB_SYNCHRONIZE=false` en `.env` e inicia:

```bash
npm run start:dev
```

---

## 🚀 Instalación y ejecución

### Instalar dependencias

```bash
npm install --legacy-peer-deps
```

### Ejecutar en desarrollo (hot reload)

```bash
npm run start:dev
```

### Ejecutar en modo normal

```bash
nest start
```

### Compilar y ejecutar en producción

```bash
npm run build
npm run start:prod
```

---

## 🌐 Explorador GraphQL

Una vez corriendo el servidor, abre en el navegador:

```
http://localhost:3000/graphql
```

Verás el **Apollo Sandbox embebido** con editor de queries, autocompletado, documentación del schema y queries de ejemplo precargados.

---

## 🔐 Autenticación

La API usa **JWT Bearer Token** con expiración de 8 horas.

**Flujo:**
1. Ejecuta la mutation `login`
2. Copia el `access_token` de la respuesta
3. En el Sandbox → pestaña **Headers** → agrega:

```
Authorization: Bearer <tu_token_aqui>
```

### Roles del sistema

| Rol | Permisos |
|---|---|
| `administrador` | Acceso total. Único que puede registrar psicólogos. |
| `psicologo` | Gestiona horarios, agenda, sesiones e historiales. |
| `estudiante` | Agenda citas y ve sus propias citas. |

---

## 📋 Operaciones GraphQL

### Públicas (sin token)

```graphql
# Registrar estudiante
mutation {
  registrarEstudiante(input: {
    nombre: "Ana López"
    correo: "ana@uni.edu"
    password: "Pass1234!"
    matricula: "2021001"
    carrera: "Psicología"
    telefono: "5551234567"
  }) {
    id_estudiante
    usuario { nombre correo }
  }
}

# Login
mutation {
  login(input: {
    correo: "admin@unimente.edu"
    password: "password"
  }) {
    access_token
    rol
    nombre
  }
}
```

### Requieren token Bearer

```graphql
# Registrar psicólogo (solo administrador)
mutation {
  registrarPsicologo(input: {
    nombre: "Dr. Carlos Ruiz"
    correo: "carlos@uni.edu"
    password: "Pass1234!"
    especialidad: "Ansiedad y depresión"
    cedula: "12345678"
    telefono: "5559876543"
  }) {
    id_psicologo
    usuario { nombre }
    especialidad
  }
}

# Ver psicólogos con horarios
query {
  psicologos {
    id_psicologo
    especialidad
    usuario { nombre }
    horarios { dia_semana hora_inicio hora_fin disponible }
  }
}

# Agendar cita (token de estudiante)
mutation {
  agendarCita(input: {
    id_psicologo: 1
    fecha: "2026-04-10"
    hora_inicio: "09:00"
    hora_fin: "10:00"
    motivo: "Estrés académico"
  }) {
    id_cita
    estado
    fecha
  }
}

# Ver citas del estudiante
query {
  citasEstudiante(id_estudiante: 1) {
    id_cita
    fecha
    hora_inicio
    estado
    psicologo { usuario { nombre } especialidad }
  }
}

# Ver agenda del psicólogo
query {
  agendaPsicologo(id_psicologo: 1) {
    id_cita
    fecha
    hora_inicio
    estado
    estudiante { usuario { nombre } carrera }
  }
}

# Registrar sesión clínica (psicólogo)
mutation {
  registrarSesion(input: {
    id_cita: 1
    numero_sesion: 1
    notas: "Paciente presenta síntomas de ansiedad moderada."
    recomendaciones: "Técnicas de respiración diafragmática."
  }) {
    id_sesion
    numero_sesion
    fecha_registro
  }
}

# Ver expediente de estudiante (psicólogo / admin)
query {
  expedienteEstudiante(id_estudiante: 1) {
    id_historial
    fecha_apertura
    detalles {
      sesion { numero_sesion notas recomendaciones fecha_registro }
    }
  }
}
```

---

## 🗃️ Tablas en MySQL

| Tabla | Descripción |
|---|---|
| `Rol` | Roles del sistema: administrador, psicólogo, estudiante |
| `Usuario` | Credenciales y datos base de todos los usuarios |
| `Estudiante` | Perfil extendido: matrícula, carrera, teléfono |
| `Psicologo` | Perfil extendido: especialidad, cédula |
| `Horario_Psicologo` | Disponibilidad semanal por día y rango horario |
| `Cita` | Citas agendadas con constraint UNIQUE por psicólogo+fecha+hora |
| `Sesion` | Notas clínicas registradas al finalizar una cita |
| `Historial_Clinico` | Expediente por par estudiante-psicólogo |
| `Detalle_Historial` | Vínculo N:M entre sesión y expediente |

---

## 🔗 Comunicación con el frontend

El frontend se conecta a esta API en:

```
http://localhost:3000/graphql
```

Asegúrate de que el backend esté corriendo **antes** de iniciar el frontend.

---

## 📦 Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run start` | Ejecuta la API compilada |
| `npm run start:dev` | Modo desarrollo con hot reload |
| `npm run start:prod` | Modo producción |
| `npm run build` | Compila TypeScript a JavaScript |
| `nest start` | Inicia sin watch mode |