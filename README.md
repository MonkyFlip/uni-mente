# UniMente

Portal de Bienestar Universitario — Sistema integral de gestión de atención psicológica que conecta estudiantes con psicólogos certificados de manera confidencial y segura.

---

## Descripción del sistema

UniMente cubre el ciclo completo de atención psicológica universitaria: agendamiento de citas, registro de sesiones clínicas, mantenimiento de historial del paciente, autenticación de dos factores (MFA) y sistema de respaldos de base de datos con protocolo de restauración de emergencia.

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

Windows / macOS: https://nodejs.org

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

### 2. Backend

```bash
cd backend
npm install --legacy-peer-deps
npm install speakeasy qrcode exceljs @nestjs/schedule --legacy-peer-deps
npm install @types/speakeasy @types/qrcode --save-dev --legacy-peer-deps
```

Crear `backend/.env`:

```env
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
RESTORE_SECRET=UniMente_Restore_2024_SuperSecreta

# ─── Servidor ────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development
```

### 3. Frontend

```bash
cd ../frontend
npm install --legacy-peer-deps
```

---

## Iniciar el proyecto

Abre **dos terminales**:

```bash
# Terminal 1 — Backend
cd uni-mente/backend
npm run start:dev

# Terminal 2 — Frontend
cd uni-mente/frontend
npm run dev
```

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| API GraphQL | http://localhost:3000/graphql |
| Apollo Sandbox | http://localhost:3000/graphql (en navegador) |
| Restauración emergencia | http://localhost:5173/emergency-restore |

### Primera ejecución

Al levantar el backend por primera vez:

1. Crea la BD `unimente` si no existe
2. Crea todas las tablas con `CREATE TABLE IF NOT EXISTS`
3. Ejecuta el seed automáticamente (BD vacía)
4. Genera ~1 100 registros de prueba + 4 administradores

```
Base de datos inicializada correctamente.
BD vacía — ejecutando seed de datos de prueba...
  Seed completado:
    Psicologos: 12  |  Horarios: ~42  |  Estudiantes: 80
    Citas: ~450  |  Sesiones: ~240  |  Historiales: ~90
UniMente Backend corriendo en http://localhost:3000/graphql
```

---

## Credenciales de acceso

### Administradores del equipo

| Nombre | Correo | Contraseña |
|---|---|---|
| Administrador principal | admin@unimente.edu | Admin1234! |
| Brenda Admin | brendaAdmin@unimente.com | Brenda123! |
| Abril Admin | abrilAdmin@unimente.com | Abril123! |
| Mai Admin | maiAdmin@unimente.com | Mai123! |

Cada admin puede configurar su propio MFA independiente desde `/admin/mfa`.

### Datos de prueba del seed

| Rol | Correo | Contraseña |
|---|---|---|
| Psicólogos | psicologo1@unimente.edu … psicologo12@unimente.edu | Password123! |
| Estudiantes | estudiante1@unimente.edu … estudiante80@unimente.edu | Password123! |

---

## Estructura del repositorio

```
uni-mente/
├── backend/
│   ├── Backup/                        # Archivos de respaldo (auto-creada)
│   ├── src/
│   │   ├── app.module.ts              # Init BD + seed + ScheduleModule
│   │   ├── database/init.sql          # CREATE IF NOT EXISTS + migración MFA
│   │   ├── seed/seed.ts               # ~1 100 registros + 4 admins bcrypt
│   │   ├── mfa/                       # TOTP window=2, coerción TINYINT
│   │   └── backup/
│   │       ├── backup.service.ts      # Tipos, formatos, scheduler, emergencia
│   │       ├── backup.resolver.ts     # GraphQL — solo admin autenticado
│   │       ├── emergency-restore.controller.ts  # REST — sin JWT, BD vacía
│   │       └── dto/backup.dto.ts      # @IsOptional + @IsString en codigo_mfa
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Rutas + TourProvider + ruta emergencia
│   │   ├── tours/                     # Guía interactiva por rol
│   │   ├── components/UI.tsx          # Pagination + usePagination
│   │   ├── graphql/operations.ts      # Auth + MFA + Backup + Citas
│   │   └── pages/
│   │       ├── Login.tsx              # Modal cambio pwd con MFA obligatorio
│   │       ├── admin/
│   │       │   ├── Backup.tsx         # Modal MFA antes de crear backup
│   │       │   ├── MfaConfig.tsx      # Activar/desactivar TOTP
│   │       │   └── EmergencyRestore.tsx  # Panel sin login para BD vacía
│   │       ├── estudiante/
│   │       └── psicologo/
│   └── .env (opcional)
│
├── generar_hashes_admin.js            # Script para INSERT de admins extras
├── BACKEND.md
├── FRONTEND.md
└── README.md
```

---

## Flujos principales del sistema

### Estudiante agenda una cita

```
1. Login → /dashboard (guía automática en primer acceso)
2. /psicologos → buscar por nombre o especialidad (paginado)
3. Clic "Agendar cita" → seleccionar horario
4. Elegir fecha (solo días de semana del horario elegido)
5. Motivo opcional → Confirmar → Cita PENDIENTE
```

### Psicólogo registra una sesión

```
1. Login → /agenda
2. Ver citas PENDIENTE → clic "Sesión"
3. Llenar notas y recomendaciones
4. Transacción única en el backend:
   INSERT Sesion
   UPDATE Cita SET estado = 'ASISTIDA'
   FIND OR CREATE Historial_Clinico
   INSERT Detalle_Historial
```

### Administrador crea un respaldo

```
1. /admin/backup → seleccionar tipo y formato
2. Clic "Crear respaldo" → abre modal de confirmación
3. Ingresar código MFA de 6 dígitos (obligatorio)
4. Confirmar → archivo guardado en backend/Backup/
```

### Configurar MFA

```
1. /admin/mfa → Clic "Activar MFA"
2. Escanear QR con Google/Microsoft Authenticator
3. Ingresar primer código de 6 dígitos para confirmar
4. MFA activo — respaldos y restauraciones requerirán código
```

### Cambiar contraseña

```
1. /login → botón "Cambiar contraseña"
2. Correo + contraseña actual + nueva contraseña
3. Código MFA de 6 dígitos (siempre obligatorio)
4. Contraseña actualizada
```

### Restauración de emergencia (BD vacía)

```
1. http://localhost:5173/emergency-restore
2. Ingresar RESTORE_SECRET del .env del servidor
3. ID del backup o nombre del archivo (en backend/Backup/)
4. Backend verifica: BD vacía + clave correcta → restaura
5. /login con credenciales normales
```

---

## Módulos adicionales

### Guía interactiva del sistema

Se activa automáticamente en el primer login de cada usuario. El botón **"Guía del sistema"** en la barra lateral la relanza en cualquier momento. 7 pasos por rol, con overlay SVG y tooltip animado. Estado guardado en `localStorage` por rol.

### Paginación universal

Todas las listas tienen paginación. El componente `Pagination` muestra el rango de registros, navegación por páginas y ellipsis automático. Al filtrar o buscar, la lista vuelve automáticamente a la página 1.

### Sistema de respaldos

Tipos: Completo, Diferencial, Incremental. Formatos: SQL, JSON, Excel, CSV. Máximo 3 backups — los más antiguos se eliminan automáticamente. El backup automático ejecuta un respaldo inmediato al configurarse. MFA obligatorio para todas las operaciones.

### Protocolo de restauración de emergencia

Endpoint REST `POST /api/emergency-restore` protegido por `RESTORE_SECRET` del `.env`. Solo activo cuando la BD tiene 0 usuarios. Permite restaurar sin JWT cuando la BD fue eliminada o corrompida.

---

## Decisiones técnicas destacadas

### `estado` como VARCHAR en Cita

`Cita.estado` es `VARCHAR(20)`, no `ENUM`. TypeORM con columnas ENUM puede devolver valores vacíos después de raw SQL updates, causando `Enum "EstadoCita" cannot represent value: ""` en GraphQL. Solución: VARCHAR + `@Field()` sin tipo explícito + SQL directo para escrituras.

### MFA siempre requerido en cambio de contraseña

Sin excepción ni toggle. Previene que alguien con acceso físico al dispositivo cambie la contraseña de otra persona aunque conozca la contraseña actual.

### MFA obligatorio para backups

Si la cuenta no tiene MFA configurado, el backend rechaza la operación de backup con mensaje que indica ir a `/admin/mfa`. No hay alternativa de `000000` ni bypass.

### Doble capa de error en modales MFA

Los modales de backup usan estado local `backupError` en lugar del `error` del hook de Apollo, para poder limpiarlo instantáneamente cuando el usuario modifica el código sin necesidad de volver a ejecutar la mutation.

### Seed con todos los admins

El seed crea los 4 administradores del equipo con hashes bcrypt generados en runtime. No hay hashes hardcodeados en el código.

---

## Documentación completa

- [BACKEND.md](./BACKEND.md) — Arquitectura, API GraphQL, MFA, respaldos, emergencia, bugs
- [FRONTEND.md](./FRONTEND.md) — Componentes, rutas, tour, paginación, módulos, bugs

---

## Comandos de referencia rápida

```bash
# Clonar e instalar
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/backend  && npm install --legacy-peer-deps
npm install speakeasy qrcode exceljs @nestjs/schedule --legacy-peer-deps
cd ../frontend        && npm install --legacy-peer-deps

# Levantar
cd ../backend  && npm run start:dev   # Terminal 1
cd ../frontend && npm run dev         # Terminal 2

# Reiniciar datos de prueba
cd backend
npm run seed                                               # macOS / Linux
npx ts-node -r tsconfig-paths/register src\seed\seed.ts   # Windows

# Agregar admins del equipo (si no usas el seed)
node generar_hashes_admin.js
# Copiar los INSERT generados y ejecutar en MySQL
```