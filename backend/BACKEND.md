# 🧠 UniMente — Backend

API GraphQL construida con **NestJS + TypeORM + MySQL** para la plataforma de gestión de citas psicológicas universitarias.

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

### Crear/actualizar tablas automáticamente

TypeORM puede crear todas las tablas por ti al iniciar el servidor. Contrólalo desde el `.env`:

| `DB_SYNCHRONIZE` | Comportamiento |
|---|---|
| `true` | Crea o actualiza las tablas al iniciar. Ideal para desarrollo inicial. |
| `false` | No toca la BD al iniciar. Recomendado cuando las tablas ya están creadas. |

Para que este valor sea leído desde `.env`, el `app.module.ts` debe usar:

```typescript
synchronize: config.get('DB_SYNCHRONIZE') !== 'false',
```

### Primer arranque (tablas nuevas)

1. Crea la base de datos en MySQL:
```sql
CREATE DATABASE unimente CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. En `.env` pon `DB_SYNCHRONIZE=true`

3. Inicia el servidor — TypeORM crea todas las tablas automáticamente

4. Ejecuta el seed para insertar los roles y el admin inicial:
```bash
mysql -u root -p unimente < seed.sql
```

5. Una vez creadas las tablas, cambia a `DB_SYNCHRONIZE=false` para no recrearlas en cada reinicio

### Arranque normal (tablas ya existentes)

Asegúrate de tener `DB_SYNCHRONIZE=false` en `.env` y simplemente inicia:

```bash
npm run start:dev
```

---

## 🚀 Instalación y ejecución

### Instalar dependencias

```bash
cd backend
npm install --legacy-peer-deps
```

### Dependencias clave del proyecto

```bash
npm install @nestjs/graphql @nestjs/apollo @apollo/server@4.11.0 graphql \
  @nestjs/typeorm typeorm mysql2 \
  @nestjs/jwt @nestjs/passport passport passport-jwt \
  @nestjs/config bcrypt class-validator class-transformer \
  @types/bcrypt @types/passport-jwt --legacy-peer-deps
```

### Ejecutar en desarrollo (con hot reload)

```bash
npm run start:dev
```

### Ejecutar en modo normal

```bash
nest start
```

### Compilar para producción

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

Verás el **Apollo Sandbox embebido** con:
- Editor de queries con autocompletado
- Documentación del schema generada automáticamente
- Pestaña **Headers** para agregar el token JWT
- Queries de ejemplo precargados

---

## 🔐 Autenticación

La API usa **JWT Bearer Token**. El flujo es:

1. Hacer login con la mutation `login`
2. Copiar el `access_token` de la respuesta
3. En el Sandbox, ir a la pestaña **Headers** y agregar:

```
Authorization: Bearer <tu_token_aqui>
```

### Roles del sistema

| Rol | Permisos |
|---|---|
| `administrador` | Acceso total. Registra psicólogos. |
| `psicologo` | Gestiona horarios, agenda, sesiones e historiales. |
| `estudiante` | Agenda citas y ve sus propias citas. |

---

## 📋 Operaciones GraphQL principales

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
  }) {
    id_estudiante
    usuario { nombre correo }
  }
}

# Login
mutation {
  login(input: {
    correo: "ana@uni.edu"
    password: "Pass1234!"
  }) {
    access_token
    rol
    nombre
  }
}
```

### Requieren token (Bearer)

```graphql
# Registrar psicólogo (solo admin)
mutation {
  registrarPsicologo(input: {
    nombre: "Dr. Carlos Ruiz"
    correo: "carlos@uni.edu"
    password: "Pass1234!"
    especialidad: "Ansiedad y depresión"
    cedula: "12345678"
  }) {
    id_psicologo
    usuario { nombre }
  }
}

# Ver psicólogos disponibles
query {
  psicologos {
    id_psicologo
    especialidad
    usuario { nombre }
    horarios { dia_semana hora_inicio hora_fin }
  }
}

# Agendar cita (token de estudiante)
mutation {
  agendarCita(input: {
    id_psicologo: 1
    fecha: "2026-03-10"
    hora_inicio: "09:00"
    hora_fin: "10:00"
    motivo: "Estrés académico"
  }) {
    id_cita
    estado
    fecha
  }
}

# Ver expediente de estudiante (solo psicólogo/admin)
query {
  expedienteEstudiante(id_estudiante: 1) {
    id_historial
    fecha_apertura
    detalles {
      sesion {
        numero_sesion
        notas
        recomendaciones
        fecha_registro
      }
    }
  }
}
```

---

## 🗃️ Tablas en MySQL

| Tabla | Descripción |
|---|---|
| `Rol` | Roles del sistema (administrador, psicólogo, estudiante) |
| `Usuario` | Credenciales y datos base de todos los usuarios |
| `Estudiante` | Perfil extendido del estudiante |
| `Psicologo` | Perfil extendido del psicólogo |
| `Horario_Psicologo` | Disponibilidad por día y hora |
| `Cita` | Citas agendadas con estado (pendiente/asistida/cancelada) |
| `Sesion` | Notas clínicas registradas al finalizar una cita |
| `Historial_Clinico` | Expediente por par estudiante-psicólogo |
| `Detalle_Historial` | Vínculo entre sesión y expediente |

---

## 🔗 Comunicación con el frontend

El frontend React se conecta a esta API mediante **Apollo Client** apuntando a:

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