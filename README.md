# UniMente

Portal de Bienestar Universitario — Sistema integral de gestion de atencion psicologica que conecta estudiantes con psicologos certificados de manera confidencial y segura.

---

## Documentacion

<div align="center">

[![Backend](https://img.shields.io/badge/Backend-NestJS%20%2B%20GraphQL-teal?style=for-the-badge&logo=nestjs)](./backend/BACKEND.md)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=for-the-badge&logo=react)](./frontend/FRONTEND.md)
[![Mobile](https://img.shields.io/badge/Mobile-Expo%20SDK%2054-purple?style=for-the-badge&logo=expo)](./mobile/MOBILE.md)

</div>

| Documento | Contenido |
|---|---|
| [BACKEND.md](./backend/BACKEND.md) | API GraphQL, endpoints REST, modelos de datos, seed, backups, MFA |
| [FRONTEND.md](./frontend/FRONTEND.md) | Componentes web, rutas, tour interactivo, temas, build Amplify |
| [MOBILE.md](./mobile/MOBILE.md) | Instalacion, generacion de APK, pantallas, paginacion, tiempo real |

---

## Descripcion

UniMente cubre el ciclo completo de atencion psicologica universitaria: agendamiento de citas con calendario personalizado, registro de sesiones clinicas, historial del paciente, autenticacion de dos factores (MFA/TOTP), sistema de respaldos de base de datos y protocolo de restauracion de emergencia.

---

## Stack tecnologico

| Capa | Tecnologia |
|---|---|
| Frontend web | React 18 + TypeScript + Vite + Apollo Client + React Router + CSS Modules |
| Backend | NestJS + TypeORM + Apollo Server + Passport JWT + @nestjs/schedule |
| Base de datos | MySQL 8.0 |
| Comunicacion | GraphQL |
| MFA | speakeasy (TOTP RFC 6238) + qrcode |
| Backups | ExcelJS + mysql2 nativo |
| App movil | React Native 0.81 + Expo SDK 54 + Expo Router + Apollo Client |

---

## Estructura del repositorio

```
uni-mente/
├── backend/          # API NestJS + GraphQL
├── frontend/         # App web React + Vite
├── mobile/           # App movil React Native + Expo
├── BACKEND.md        # Documentacion del backend
├── FRONTEND.md       # Documentacion del frontend web
├── MOBILE.md         # Documentacion de la app movil
└── README.md         # Este archivo
```

---

## Requisitos previos

| Herramienta | Version minima |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| MySQL | 8.0 |
| Git | cualquier version reciente |

---

## Instalacion rapida

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

Crea el archivo `.env` en `backend/`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=unimente
DB_SYNCHRONIZE=false
JWT_SECRET=cambia_este_secreto_en_produccion
JWT_EXPIRES=8h
RESTORE_SECRET=UniMente_Restore_2024_SuperSecreta
PORT=3000
NODE_ENV=development
```

Iniciar:

```bash
npm run start:dev
```

El backend inicializa la base de datos y ejecuta el seed automaticamente al arrancar.

### 3. Frontend web

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Abre http://localhost:5173

### 4. App movil

```bash
cd mobile
npm install --legacy-peer-deps
npm start
```

Escanea el QR con Expo Go (SDK 54) en tu telefono.

> Para generar el APK consulta [MOBILE.md](./mobile/MOBILE.md#5-generar-apk)

---

## Credenciales de prueba

| Rol | Correo | Contrasena |
|---|---|---|
| Administrador | admin@unimente.edu | Admin1234! |
| Administrador | brendaAdmin@unimente.com | Brenda123! |
| Administrador | abrilAdmin@unimente.com | Abril123! |
| Administrador | maiAdmin@unimente.com | Mai123! |
| Psicologo | psicologo1@unimente.edu | Password123! |
| Psicologo | psicologo2@unimente.edu | Password123! |
| Estudiante | estudiante1@unimente.edu | Password123! |
| Estudiante | estudiante2@unimente.edu | Password123! |

Los psicologos van del 1 al 12 y los estudiantes del 1 al 80.

---

## Funcionalidades principales

### Roles

| Rol | Acceso |
|---|---|
| Administrador | CRUD psicologos, backups, MFA, estadisticas del sistema |
| Psicologo | Agenda, horarios, registro de sesiones clinicas |
| Estudiante | Buscar psicologos, agendar citas, ver historial de citas |

### Agendamiento de citas

El estudiante selecciona un psicologo y un horario disponible. El calendario personalizado solo muestra los dias validos del horario elegido — es imposible seleccionar una fecha incorrecta.

### Autenticacion de dos factores (MFA)

TOTP compatible con Google Authenticator y Microsoft Authenticator. Obligatorio para crear backups, restaurar backups y cambiar contrasena.

### Sistema de respaldos

- Tipos: COMPLETO, DIFERENCIAL, INCREMENTAL
- Formatos: SQL, JSON, EXCEL, CSV
- Scheduler automatico configurable
- Maximo 3 respaldos (los mas antiguos se eliminan automaticamente)
- Nombre de archivo con fecha legible: `backup_COMPLETO_14-03-2026_08-42pm.sql`
- Restauracion normal (con MFA) y de emergencia (sin usuarios en BD)

> Para mas detalles ver [BACKEND.md](./backend/BACKEND.md#modulo-de-backups)

---

## Arquitectura

```
Cliente Web / App Movil
        |
        | GraphQL (POST /graphql)
        |
    NestJS API
    ├── Auth          JWT + Passport
    ├── Usuario       Perfiles y roles
    ├── Psicologo     Datos del profesional
    ├── Estudiante    Datos del alumno
    ├── Cita          Agendamiento
    ├── Horario       Disponibilidad
    ├── Sesion        Registro clinico
    ├── Historial     Expediente del paciente
    ├── Mfa           TOTP (speakeasy)
    └── Backup        Respaldos + scheduler
        |
     MySQL 8.0
```

Endpoints REST adicionales:

| Endpoint | Descripcion |
|---|---|
| `GET  /api/emergency-backups` | Lista backups disponibles (sin JWT) |
| `POST /api/emergency-restore` | Restaura BD sin JWT (requiere RESTORE_SECRET) |
| `GET  /api/backup-download/*` | Descarga archivo de backup (con JWT) |

---

## Variables de entorno del backend

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de MySQL | localhost |
| `DB_PORT` | Puerto de MySQL | 3306 |
| `DB_USER` | Usuario de MySQL | root |
| `DB_PASSWORD` | Contrasena de MySQL | |
| `DB_NAME` | Nombre de la BD | unimente |
| `DB_SYNCHRONIZE` | Sincronizar esquema | false |
| `JWT_SECRET` | Secreto para firmar JWT | cadena-larga-aleatoria |
| `JWT_EXPIRES` | Duracion del token | 8h |
| `RESTORE_SECRET` | Clave para restauracion de emergencia | cadena-larga-aleatoria |
| `PORT` | Puerto del servidor | 3000 |
| `NODE_ENV` | Entorno | development |

---

## Despliegue

### Frontend web — AWS Amplify

```bash
cd frontend
npm run build
```

Conecta el repositorio a Amplify:
- Build command: `npm run build`
- Output directory: `dist`

### Backend

Cualquier servidor con Node.js 18+ y acceso a MySQL. Configura las variables de entorno en el servidor de produccion.

### App movil — APK

```powershell
cd mobile

# Primera vez o paquetes nuevos
npm run build:full

# Solo cambios de codigo
npm run build:android
```

El APK queda en `android\app\build\outputs\apk\release\unimente-release.apk`

> Instrucciones completas en [MOBILE.md](./mobile/MOBILE.md#5-generar-apk)