# UniMente

Portal de Bienestar Universitario — Sistema integral de gestion de atencion psicologica que conecta estudiantes con psicologos certificados de manera confidencial y segura.

---

## Documentacion

<div align="center">

[![Backend](https://img.shields.io/badge/Backend-NestJS%20%2B%20GraphQL-teal?style=for-the-badge&logo=nestjs)](./backend/BACKEND.md)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=for-the-badge&logo=react)](./frontend/FRONTEND.md)
[![Mobile](https://img.shields.io/badge/Mobile-Expo%20SDK%2054-purple?style=for-the-badge&logo=expo)](./mobile/MOBILE.md)
[![AWS](https://img.shields.io/badge/Deploy-AWS%20EC2-orange?style=for-the-badge&logo=amazon-aws)](./backend/AWS.md)

</div>

| Documento | Contenido |
|---|---|
| [BACKEND.md](./backend/BACKEND.md) | API GraphQL, endpoints REST, modelos de datos, seed, backups, MFA |
| [AWS.md](./backend/AWS.md) | Guia de despliegue y operacion en EC2 |
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
| Backend | NestJS v11 + TypeORM + Apollo GraphQL v4 + Passport JWT + @nestjs/schedule |
| Base de datos | SQL Server 2022 (Docker) |
| Comunicacion | GraphQL |
| MFA | speakeasy (TOTP RFC 6238) + qrcode |
| Backups | ExcelJS + mssql nativo |
| App movil | React Native 0.81 + Expo SDK 54 + Expo Router + Apollo Client |
| Contenedores | Docker + Docker Compose |
| Frontend cloud | AWS Amplify |
| Backend cloud | AWS EC2 c7i-flex.large |

---

## Estructura del repositorio

```
uni-mente/
├── backend/          # API NestJS + SQL Server (Docker)
│   ├── src/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── AWS.md        # Guia de despliegue en EC2
│   └── BACKEND.md    # Documentacion tecnica completa
├── frontend/         # App web React + Vite
├── mobile/           # App movil React Native + Expo
└── README.md         # Este archivo
```

---

## Ramas

| Rama | Proposito |
|---|---|
| `main` | Version estable |
| `aws` | Rama de produccion — desplegada en EC2 |

---

## Despliegue actual

### Frontend — AWS Amplify

URL: **https://aws.d1mrcwf1ifucba.amplifyapp.com/**
Rama conectada: `aws`

### Backend — AWS EC2

| Parametro | Valor |
|---|---|
| Instancia | c7i-flex.large (2 vCPU / 4 GB RAM) |
| SO | Amazon Linux 2023 |
| Almacenamiento | 30 GiB gp3 |
| Puerto API | 3000 |
| Base de datos | SQL Server 2022 (Docker, red interna) |

> **⚠️ IP dinamica — verificar antes de usar**
>
> La EC2 usa IP publica dinamica. **Cada vez que la instancia se apaga y vuelve a encender, la IP cambia.**
>
> Antes de usar el sistema tras un periodo de inactividad:
> 1. Entra a la consola AWS → EC2 → Instancias
> 2. Selecciona la instancia `UniMente`
> 3. Copia la nueva **Direccion IPv4 publica**
> 4. Actualiza `frontend/src/apollo/client.ts`:
>    ```typescript
>    uri: 'http://<NUEVA_IP>:3000/graphql'
>    ```
> 5. Haz push a la rama `aws` → Amplify redespliega automaticamente
>
> Para evitar este paso, asigna una **Elastic IP** en la consola AWS (gratis mientras la instancia este encendida).

---

## Instalacion local (desarrollo)

### 1. Clonar el repositorio

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente
```

### 2. Backend con Docker (recomendado)

```bash
cd backend
cp .env.example .env
# Editar .env con tus valores

docker compose up --build -d
# API disponible en http://localhost:3000/graphql
```

SQL Server y NestJS se levantan automaticamente en orden. El seed corre en el primer arranque.

### 3. Frontend web

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# App disponible en http://localhost:5173
```

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

Las contrasenas se configuran en `.env` antes del primer arranque (`SEED_*` variables).

| Rol | Correo | Variable |
|---|---|---|
| Administrador | admin@unimente.edu | `SEED_ADMIN_PASSWORD` |
| Administrador | brendaAdmin@unimente.com | `SEED_ADMIN_BRENDA_PASSWORD` |
| Administrador | abrilAdmin@unimente.com | `SEED_ADMIN_ABRIL_PASSWORD` |
| Administrador | maiAdmin@unimente.com | `SEED_ADMIN_MAI_PASSWORD` |
| Psicologo | psicologo1..12@unimente.edu | `SEED_DEFAULT_PASSWORD` |
| Estudiante | estudiante1..100@unimente.edu | `SEED_DEFAULT_PASSWORD` |

---

## Funcionalidades principales

### Roles

| Rol | Acceso |
|---|---|
| Administrador | CRUD psicologos, backups, MFA, toggle activo/inactivo |
| Psicologo | Agenda, horarios, registro de sesiones clinicas, historial |
| Estudiante | Buscar psicologos, agendar citas, ver historial de citas |

### Agendamiento de citas

El estudiante selecciona un psicologo y un horario disponible. El calendario personalizado solo muestra los dias validos del horario elegido — es imposible seleccionar una fecha incorrecta. Los dias con citas existentes del psicologo se marcan en rojo.

### Autenticacion de dos factores (MFA)

TOTP compatible con Google Authenticator y Microsoft Authenticator. Obligatorio para crear backups, restaurar backups y cambiar contrasena.

### Sistema de respaldos

- Tipos: COMPLETO, DIFERENCIAL, INCREMENTAL
- Formatos: SQL, JSON, EXCEL, CSV
- Scheduler automatico configurable
- Maximo 3 respaldos (los mas antiguos se eliminan automaticamente)
- Restauracion normal (con MFA) y de emergencia (sin usuarios en BD)

> Para mas detalles ver [BACKEND.md](./backend/BACKEND.md)

---

## Arquitectura

```
Cliente Web (Amplify)     App Movil (Expo)
        |                       |
        |      GraphQL :3000    |
        +----------+------------+
                   |
          NestJS API (EC2)
          ├── Auth          JWT + Passport
          ├── Usuario       Perfiles y roles (soft delete)
          ├── Psicologo     Datos del profesional
          ├── Estudiante    Datos del alumno
          ├── Cita          Agendamiento
          ├── Horario       Disponibilidad
          ├── Sesion        Registro clinico
          ├── Historial     Expediente del paciente
          ├── Mfa           TOTP (speakeasy)
          └── Backup        Respaldos + scheduler
                   |
          SQL Server 2022 (Docker, red interna)
```

Endpoints REST adicionales:

| Endpoint | Descripcion |
|---|---|
| `GET  /api/emergency-backups` | Lista backups disponibles (sin JWT) |
| `POST /api/emergency-restore` | Restaura BD sin JWT (requiere RESTORE_SECRET) |

---

## Variables de entorno del backend

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `DB_PASSWORD` | Contrasena de SQL Server | `UniMente_DB_2026!` |
| `DB_PORT` | Puerto de SQL Server | `1433` |
| `DB_NAME` | Nombre de la BD | `unimente` |
| `DB_TRUST_CERT` | Confiar en certificado autofirmado | `true` |
| `JWT_SECRET` | Secreto para firmar JWT (min 32 chars) | cadena aleatoria |
| `JWT_EXPIRES` | Duracion del token | `8h` |
| `RESTORE_SECRET` | Clave para restauracion de emergencia | cadena aleatoria |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `production` |
| `ALLOWED_ORIGINS` | CORS — origenes permitidos | URL de Amplify |
| `SEED_ADMIN_PASSWORD` | Contrasena admin principal | min 8 chars |
| `SEED_DEFAULT_PASSWORD` | Contrasena psicologos y estudiantes | min 8 chars |

Ver `.env.example` para la lista completa.

---

## Seguridad (OWASP Top 10)

- **A01** Broken Access Control → Guards por rol en cada resolver, soft delete via columna `activo`
- **A02** Cryptographic Failures → bcrypt para contrasenas, JWT firmado, TLS en BD
- **A03** Injection → TypeORM con queries parametrizadas, sin SQL raw expuesto
- **A05** Security Misconfiguration → `synchronize: false`, usuario no-root en Docker, puerto 1433 no expuesto
- **A07** Auth Failures → Rate limiting global con `@nestjs/throttler`
- **A08** Software Integrity → Multi-stage Docker build, `npm ci` con lockfile
- **A09** Logging → Intentos de acceso no autorizados registrados con IP

---

## Despliegue en AWS (resumen)

```bash
# Solo la primera vez en la EC2
git init unimente-backend && cd unimente-backend
git remote add origin https://github.com/MonkyFlip/uni-mente.git
git sparse-checkout init --cone
git sparse-checkout set backend
git pull origin aws

cd backend
cp .env.example .env
nano .env   # configurar valores de produccion

# Instalar Docker y configurar systemd (ver AWS.md)
docker compose up --build -d
```

El servicio `systemd` arranca Docker Compose automaticamente en cada encendido de la EC2. Ver [AWS.md](./backend/AWS.md) para la guia completa.

---

## App movil — APK

```powershell
cd mobile
npm run build:android
```

El APK queda en `android\app\build\outputs\apk\release\unimente-release.apk`

> Instrucciones completas en [MOBILE.md](./mobile/MOBILE.md#5-generar-apk)