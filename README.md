# UniMente

Portal de Bienestar Universitario — Sistema integral de gestión de atención psicológica que conecta estudiantes con psicólogos certificados de manera confidencial y segura.

---

## Descripción del sistema

UniMente cubre el ciclo completo de atención psicológica universitaria: agendamiento de citas, registro de sesiones clínicas, mantenimiento de historial del paciente, sistema de respaldos de base de datos y autenticación de dos factores (MFA).

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Apollo Client · React Router · CSS Modules |
| Backend | NestJS · TypeORM · Apollo Server · Passport JWT · @nestjs/schedule |
| Base de datos | MySQL 8.0 |
| Comunicación | GraphQL |
| MFA | speakeasy (TOTP RFC 6238) · qrcode |
| Backups | ExcelJS · mysql2 nativo |

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

### 2. Instalar dependencias del backend

```bash
cd backend
npm install --legacy-peer-deps
npm install speakeasy qrcode exceljs @nestjs/schedule --legacy-peer-deps
npm install @types/speakeasy @types/qrcode --save-dev --legacy-peer-deps
```

### 3. Configurar variables de entorno del backend

Crear `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=unimente

JWT_SECRET=unimente_super_secret_2024
JWT_EXPIRES=8h
```

### 4. Instalar dependencias del frontend

```bash
cd ../frontend
npm install --legacy-peer-deps
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

Salida esperada en consola:
```
Base de datos inicializada correctamente.
BD vacía — ejecutando seed de datos de prueba...
  Seed completado:
    Psicologos: 12  |  Horarios: 42  |  Estudiantes: 80
    Citas: ~450  |  Sesiones: ~240  |  Historiales: ~90
UniMente Backend corriendo en http://localhost:3000/graphql
```

---

## Credenciales de acceso

### Administradores del equipo

| Nombre | Correo | Contraseña |
|---|---|---|
| Administrador (principal) | admin@unimente.edu | Admin1234! |
| Brenda Admin | brendaAdmin@unimente.com | Brenda123! |
| Abril Admin | abrilAdmin@unimente.com | Abril123! |
| Mai Admin | maiAdmin@unimente.com | Mai123! |

Los admins del equipo se agregan ejecutando el SQL en `generar_hashes_admin.js`. Cada admin puede configurar su propio MFA independiente desde `/admin/mfa`.

### Datos de prueba (generados por el seed)

| Rol | Correo | Contraseña |
|---|---|---|
| Psicólogos | psicologo1@unimente.edu … psicologo12@unimente.edu | Password123! |
| Estudiantes | estudiante1@unimente.edu … estudiante80@unimente.edu | Password123! |

---

## Estructura del repositorio

```
uni-mente/
├── backend/
│   ├── Backup/                      # Archivos de respaldo (auto-creada)
│   ├── src/
│   │   ├── app.module.ts            # Init BD + seed automático + ScheduleModule
│   │   ├── database/
│   │   │   └── init.sql             # CREATE IF NOT EXISTS + migración MFA
│   │   ├── seed/
│   │   │   └── seed.ts              # ~1 100 registros con admin real bcrypt
│   │   ├── mfa/                     # TOTP con speakeasy + QR
│   │   ├── backup/                  # SQL/JSON/CSV/Excel + scheduler automático
│   │   ├── auth/
│   │   ├── cita/
│   │   ├── sesion/
│   │   ├── historial-clinico/
│   │   ├── psicologo/
│   │   ├── estudiante/
│   │   └── ...
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Rutas + providers + TourProvider
│   │   ├── tours/                   # Guía interactiva por rol
│   │   ├── components/
│   │   │   └── UI.tsx               # Pagination + usePagination hook
│   │   ├── graphql/
│   │   │   └── operations.ts        # Queries y mutations (MFA + Backup)
│   │   └── pages/
│   │       ├── Login.tsx            # Login + cambio de contraseña con MFA
│   │       ├── admin/
│   │       │   ├── Backup.tsx       # Modal MFA para confirmar respaldos
│   │       │   └── MfaConfig.tsx    # Activar/desactivar TOTP
│   │       ├── estudiante/
│   │       └── psicologo/
│   └── .env
│
├── generar_hashes_admin.js          # Script para generar INSERT de admins
├── BACKEND.md
├── FRONTEND.md
└── README.md
```

---

## Flujos principales del sistema

### Estudiante agenda una cita

```
1. Login → /dashboard (guía automática en primer acceso)
2. /psicologos → buscar por nombre o especialidad
3. Clic en "Agendar cita" → seleccionar horario → elegir fecha
4. Solo se muestran fechas del día de la semana del horario elegido
5. Motivo opcional → Confirmar → Cita PENDIENTE creada
```

### Psicólogo registra una sesión

```
1. Login → /agenda
2. Ver citas PENDIENTE → clic en "Sesión"
3. Llenar notas y recomendaciones → Guardar
4. Backend en transacción única:
   - INSERT Sesion
   - UPDATE Cita SET estado = 'ASISTIDA'
   - CREATE OR UPDATE Historial_Clinico
   - INSERT Detalle_Historial
```

### Administrador crea un respaldo

```
1. Login → /admin/backup
2. Seleccionar tipo (COMPLETO / DIFERENCIAL / INCREMENTAL)
3. Seleccionar formato (SQL / JSON / EXCEL / CSV)
4. Clic en "Crear respaldo" → modal de confirmación
5. Ingresar código MFA de 6 dígitos (si está configurado)
6. Backup creado en backend/Backup/
```

### Administrador configura MFA

```
1. /admin/mfa → Clic en "Activar MFA"
2. Escanear QR con Google Authenticator o Microsoft Authenticator
3. Ingresar código de 6 dígitos para confirmar sincronización
4. MFA activo — respaldos y restauraciones requerirán código
```

### Cambio de contraseña (desde Login)

```
1. Página /login → botón "Cambiar contraseña"
2. Ingresar: correo + contraseña actual + nueva contraseña
3. Ingresar código MFA de 6 dígitos (SIEMPRE obligatorio)
4. Contraseña actualizada
```

---

## Módulos adicionales

### Guía interactiva del sistema

Al iniciar sesión por primera vez, se activa automáticamente una guía visual que recorre todas las funcionalidades del portal según el rol del usuario. Incluye overlay con recorte sobre el elemento destacado, tooltip animado con barra de progreso y botón de saltar. El botón **"Guía del sistema"** en la barra lateral permite relanzarla en cualquier momento.

### Paginación

Todas las vistas con listas largas tienen paginación integrada. El componente `Pagination` muestra el rango de registros, botones de navegación y números de página con puntos suspensivos. Al filtrar o buscar, la lista regresa automáticamente a la página 1.

### Sistema de respaldos

Soporta tres tipos (Completo, Diferencial, Incremental) en cuatro formatos (SQL, JSON, Excel, CSV). Se mantienen solo los 3 respaldos más recientes — los anteriores se eliminan automáticamente. El backup automático puede configurarse con una frecuencia desde 1 hora hasta 30 días, y ejecuta un respaldo de seguridad inmediatamente al ser configurado.

---

## Decisiones técnicas destacadas

### `estado` como VARCHAR en Cita

La columna `Cita.estado` es `VARCHAR(20)` en MySQL, no `ENUM`. TypeORM tiene un bug donde el mapeo de columnas ENUM puede devolver valores vacíos después de un raw SQL update. Combined con `@Field(() => EstadoCita)` en NestJS GraphQL produce `Enum "EstadoCita" cannot represent value: ""`. La solución usa `VARCHAR` en BD, `string` en TypeORM, `@Field()` sin tipo explícito en el output, y SQL directo para escrituras.

### MFA siempre requerido en cambio de contraseña

El modal de cambio de contraseña no tiene opción de omitir el código MFA. Esto previene que alguien con acceso físico al dispositivo o conocimiento de la contraseña actual pueda cambiarla sin autorización del dueño de la cuenta.

### Seed con admin de bcrypt real

El `init.sql` ya no incluye un hash hardcodeado del admin. El seed genera el hash con `bcrypt.hash('Admin1234!', 10)` en runtime, garantizando que el hash siempre coincide con la contraseña real.

---

## Documentación completa

- [BACKEND.md](./BACKEND.md) — Arquitectura, API GraphQL, MFA, sistema de respaldos, bugs resueltos
- [FRONTEND.md](./FRONTEND.md) — Componentes, rutas, tour, paginación, decisiones técnicas

---

## Comandos de referencia rápida

```bash
# Clonar e instalar
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend  && npm install --legacy-peer-deps
cd ../frontend        && npm install --legacy-peer-deps

# Paquetes adicionales del backend
cd ../backend
npm install speakeasy qrcode exceljs @nestjs/schedule --legacy-peer-deps

# Levantar
cd backend  && npm run start:dev   # Terminal 1
cd frontend && npm run dev         # Terminal 2

# Reiniciar datos de prueba
cd backend
npm run seed                                              # macOS / Linux
npx ts-node -r tsconfig-paths/register src\seed\seed.ts  # Windows

# Agregar admins del equipo (genera SQL con hashes reales)
cd backend
node generar_hashes_admin.js
# → copiar los INSERT y ejecutar en MySQL
```