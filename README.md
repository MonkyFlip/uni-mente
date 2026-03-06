# UniMente

Portal de Bienestar Universitario — Sistema de gestión de atención psicológica que conecta estudiantes con psicólogos certificados de manera confidencial y segura.

---

## Descripción del sistema

UniMente permite a los estudiantes universitarios acceder a servicios de salud mental de forma sencilla. El sistema cubre el ciclo completo: desde el agendamiento de una cita hasta el registro de sesiones clínicas y el mantenimiento del historial del paciente.

**Roles del sistema:**
- **Estudiante** — Busca psicólogos disponibles, agenda citas y consulta su historial
- **Psicólogo** — Gestiona su disponibilidad semanal, registra sesiones y mantiene expedientes
- **Administrador** — Registra y gestiona el equipo de psicólogos

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Apollo Client · React Router |
| Backend | NestJS · TypeORM · Apollo Server · Passport JWT |
| Base de datos | MySQL 8.0 |
| Comunicación | GraphQL |

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| MySQL | 8.0 |

**Instalar Node.js**

Windows / macOS: https://nodejs.org (instalador LTS)

Linux (Ubuntu / Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente
```

### 2. Configurar el backend

```bash
cd backend
npm install
```

Crear el archivo `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=unimente

JWT_SECRET=unimente_super_secret_2024
JWT_EXPIRES=8h
```

### 3. Configurar el frontend

```bash
cd ../frontend
npm install
```

Crear el archivo `frontend/.env` (opcional, ya apunta a `localhost:3000` por defecto):

```env
VITE_API_URL=http://localhost:3000/graphql
```

---

## Iniciar el proyecto

Abre **dos terminales** simultáneas:

**Terminal 1 — Backend:**
```bash
cd uni-mente/backend
npm run start:dev
```

**Terminal 2 — Frontend:**
```bash
cd uni-mente/frontend
npm run dev
```

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| API GraphQL | http://localhost:3000/graphql |
| Apollo Sandbox | http://localhost:3000/graphql (abrir en navegador) |

### Primera ejecución

Al levantar el backend por primera vez:

1. Crea automáticamente la base de datos `unimente` si no existe
2. Crea todas las tablas con `CREATE TABLE IF NOT EXISTS`
3. Detecta que la BD está vacía y ejecuta el seed automáticamente
4. Genera ~1 100 registros de prueba bien relacionados

En consola verás:

```
Base de datos inicializada correctamente.
BD vacía — ejecutando seed de datos de prueba...
  Iniciando seed de datos de prueba...
  Seed completado:
    Psicologos: 12  |  Horarios: 42  |  Estudiantes: 80
    Citas: 451  |  Sesiones: 238  |  Historiales: 89
  Acceso: psicologo1@unimente.edu / estudiante1@unimente.edu  →  Password123!
UniMente Backend corriendo en http://localhost:3000/graphql
```

---

## Credenciales de acceso

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@unimente.edu | Admin1234! |
| Psicólogo | psicologo1@unimente.edu … psicologo12@unimente.edu | Password123! |
| Estudiante | estudiante1@unimente.edu … estudiante80@unimente.edu | Password123! |

---

## Estructura del repositorio

```
uni-mente/
├── backend/
│   ├── src/
│   │   ├── app.module.ts        # Init BD automático + seed al arrancar
│   │   ├── database/
│   │   │   └── init.sql         # CREATE TABLE IF NOT EXISTS (idempotente)
│   │   ├── seed/
│   │   │   └── seed.ts          # ~1 100 registros de prueba
│   │   ├── auth/                # JWT login
│   │   ├── common/              # Guards, decorators, enums
│   │   ├── cita/                # Entidad, resolver, service
│   │   ├── sesion/
│   │   ├── historial-clinico/
│   │   ├── psicologo/
│   │   ├── estudiante/
│   │   └── ...
│   ├── .env                     # Variables de entorno (crear manualmente)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Rutas + providers
│   │   ├── apollo/client.ts     # Apollo con auth link y error link
│   │   ├── auth/                # AuthContext, ProtectedRoute
│   │   ├── components/          # UI, Layout, Sidebar, DatePicker, TimePicker
│   │   ├── graphql/
│   │   │   └── operations.ts    # Todas las queries y mutations
│   │   └── pages/
│   │       ├── admin/           # Gestión de psicólogos
│   │       ├── estudiante/      # Buscar psicólogos, mis citas
│   │       └── psicologo/       # Agenda, horarios
│   ├── .env                     # (opcional)
│   └── package.json
│
├── BACKEND.md                   # Documentación completa del backend
├── FRONTEND.md                  # Documentación completa del frontend
└── README.md                    # Este archivo
```

---

## Flujos principales del sistema

### Estudiante agenda una cita

```
1. Login → /dashboard
2. Ir a /psicologos
3. Seleccionar psicólogo → "Agendar cita"
4. Elegir horario disponible
5. Seleccionar fecha (solo días del horario elegido)
6. Escribir motivo (opcional)
7. Confirmar → Cita creada con estado PENDIENTE
```

### Psicólogo registra una sesión

```
1. Login → /agenda
2. Ver citas del día con estado PENDIENTE
3. Clic en "Registrar sesión"
4. Ingresar notas clínicas y recomendaciones
5. Confirmar → (transacción única):
   - Sesión guardada
   - Cita marcada como ASISTIDA
   - Historial clínico creado o actualizado
   - Detalle vinculado al historial
```

### Administrador registra un psicólogo

```
1. Login → /admin/psicologos
2. Clic en "Registrar psicólogo"
3. Ingresar nombre, correo, contraseña (obligatorios)
4. Especialidad, cédula, teléfono (opcionales)
5. Confirmar → Psicólogo listo para definir horarios
```

---

## Decisiones técnicas destacadas

### `estado` como VARCHAR en lugar de ENUM

La columna `Cita.estado` se almacena como `VARCHAR(20)` en MySQL en lugar de `ENUM`. TypeORM tiene un bug documentado donde el mapeo de columnas `ENUM` puede devolver el valor vacío en memoria después de un `save()`. Combinado con `@Field(() => EstadoCita)` en NestJS GraphQL, esto produce el error `Enum "EstadoCita" cannot represent value: ""`.

La solución usa tres cambios coordinados: `VARCHAR` en la BD, `string` en TypeORM, y `@Field()` (String) en el output de GraphQL. El enum `EstadoCita` se mantiene únicamente para validar los inputs.

### Raw SQL para escrituras de estado

Cualquier actualización del campo `estado` usa SQL directo:
```typescript
await this.dataSource.query('UPDATE Cita SET estado = ? WHERE id_cita = ?', [valor, id]);
```
Esto garantiza que el valor llega a MySQL sin ninguna transformación del ORM.

### Campos opcionales nunca se envían como `""`

Los formularios del frontend usan funciones `strip()` y `clean()` que convierten las cadenas vacías a `undefined` antes de enviar las mutations. De esta forma el backend recibe `null` para guardar `NULL` en MySQL, en lugar de guardar `""`.

### IDs de perfil resueltos en el backend

Los IDs `id_estudiante` e `id_psicologo` nunca vienen del cliente. Siempre se extraen del JWT en el backend, lo que garantiza que un usuario no puede manipular datos de otro.

### Inicialización automática de BD y seed

Al ejecutar `nest start`, el backend crea la BD, las tablas y los datos de prueba automáticamente. No hay pasos manuales de migración.

---

## Documentación completa

- [BACKEND.md](./BACKEND.md) — Arquitectura, API GraphQL, decisiones técnicas del backend
- [FRONTEND.md](./FRONTEND.md) — Componentes, rutas, Apollo Client, bugs resueltos del frontend

---

## Comandos de referencia rápida

```bash
# Clonar
git clone https://github.com/MonkyFlip/uni-mente.git

# Instalar dependencias (backend y frontend)
cd uni-mente/backend  && npm install
cd ../frontend        && npm install

# Levantar todo
cd ../backend  && npm run start:dev   # Terminal 1
cd ../frontend && npm run dev         # Terminal 2

# Reiniciar datos de prueba (backend)
cd backend
npm run seed           # macOS / Linux
npx ts-node -r tsconfig-paths/register src\seed\seed.ts  # Windows
```