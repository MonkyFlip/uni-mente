# UniMente

Portal de Bienestar Universitario — Sistema integral de gestión de atención psicológica que conecta estudiantes con psicólogos certificados de manera confidencial y segura.

---

## Documentación

<div align="center">

[![Backend](https://img.shields.io/badge/Backend-NestJS%20%2B%20GraphQL-teal?style=for-the-badge&logo=nestjs)](./backend/BACKEND.md)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=for-the-badge&logo=react)](./frontend/FRONTEND.md)
[![Mobile](https://img.shields.io/badge/Mobile-Expo%20SDK%2054-purple?style=for-the-badge&logo=expo)](./mobile/MOBILE.md)
[![AWS](https://img.shields.io/badge/Deploy-AWS%20EC2-orange?style=for-the-badge&logo=amazon-aws)](./backend/AWS.md)

</div>

| Documento | Contenido |
|---|---|
| [BACKEND.md](./backend/BACKEND.md) | API GraphQL, base de datos, seed, backups, MFA, endpoints REST |
| [AWS.md](./backend/AWS.md) | Despliegue, operación, troubleshooting y actualización en EC2 |
| [FRONTEND.md](./frontend/FRONTEND.md) | Componentes, rutas, tour interactivo, Amplify |
| [MOBILE.md](./mobile/MOBILE.md) | Expo, APK, pantallas |

---

## Descripción

UniMente cubre el ciclo completo de atención psicológica universitaria: agendamiento de citas con calendario personalizado, registro de sesiones clínicas, historial del paciente, autenticación de dos factores (MFA/TOTP), sistema de respaldos de base de datos en múltiples formatos, descarga de respaldos y protocolo de restauración de emergencia.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend web | React 18 + TypeScript + Vite + Apollo Client + React Router + CSS Modules |
| Backend | NestJS v11 + TypeORM + Apollo GraphQL v4 + Passport JWT + @nestjs/schedule |
| Base de datos | SQL Server 2022 (Docker) |
| Comunicación | GraphQL |
| MFA | speakeasy (TOTP RFC 6238) + qrcode |
| Backups | ExcelJS + mssql nativo |
| Proxy / SSL | nginx 1.27 (SSL termination + CORS handler) |
| App móvil | React Native 0.81 + Expo SDK 54 + Expo Router + Apollo Client |
| Contenedores | Docker + Docker Compose |
| Frontend cloud | AWS Amplify |
| Backend cloud | AWS EC2 c7i-flex.large (2 vCPU / 4 GB RAM) |

---

## Estructura del repositorio

```
uni-mente/
├── backend/                  # API NestJS + SQL Server + nginx (Docker)
│   ├── src/
│   ├── nginx/                # nginx.conf + gen-cert.sh + certs/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── AWS.md                # Guía completa de despliegue en EC2
│   └── BACKEND.md            # Documentación técnica
├── frontend/                 # App web React + Vite
├── mobile/                   # App móvil React Native + Expo
└── README.md                 # Este archivo
```

---

## Ramas

| Rama | Propósito |
|---|---|
| `main` | Versión estable de referencia |
| `aws` | Rama de producción — conectada a Amplify y EC2 |

---

## Despliegue actual

### Frontend — AWS Amplify

**URL:** https://aws.d1mrcwf1ifucba.amplifyapp.com/
Rama conectada: `aws` — se redespliega automáticamente con cada push.

### Backend — AWS EC2

| Parámetro | Valor |
|---|---|
| Instancia | c7i-flex.large (2 vCPU / 4 GB RAM) |
| SO | Amazon Linux 2023 |
| Almacenamiento | 30 GiB gp3 |
| Puerto público | 443 (HTTPS vía nginx) |
| Base de datos | SQL Server 2022 (Docker, red interna) |

> **⚠️ IP dinámica — verificar antes de usar**
>
> La EC2 tiene IP pública dinámica. **Cada vez que la instancia se apaga y vuelve a encender, la IP cambia.**
>
> **Pasos tras encender la EC2:**
> 1. Consola AWS → EC2 → Instancias → seleccionar `UniMente`
> 2. Copiar la nueva **Dirección IPv4 pública**
> 3. Actualizar `frontend/src/apollo/client.ts`:
>    ```typescript
>    uri: 'https://<NUEVA_IP>/graphql'
>    ```
> 4. `git push origin aws` → Amplify redespliega en ~2 min
>
> **Solución permanente:** asignar una **Elastic IP** en la consola AWS (gratis mientras la instancia está encendida).

---

## Inicio rápido local

### Backend

```bash
cd backend
cp .env.example .env
# Editar .env con tus valores

docker compose up --build -d
# API en http://localhost:3000/graphql
```

SQL Server y NestJS se levantan en orden automáticamente. El seed corre al primer arranque.

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# App en http://localhost:5173
```

### App móvil

```bash
cd mobile
npm install --legacy-peer-deps
npm start
# Escanea el QR con Expo Go (SDK 54)
```

---

## Aplicar nuevos cambios

### Subir cambios al repositorio

```bash
git add .
git commit -m "descripción del cambio"
git push origin aws
```

Amplify detecta el push y redespliega el frontend automáticamente.

### Actualizar la EC2

```bash
ssh -i unimente-key.pem ec2-user@<IP_PUBLICA>
cd ~/unimente-backend
git stash
git pull origin aws
git stash drop
cd backend
```

Según qué cambió:

| Cambió | Comando |
|---|---|
| Solo frontend / config | `docker compose up -d` |
| Código backend (`src/`, `package.json`) | `docker compose up --build -d backend` |
| `nginx/nginx.conf` | `docker compose exec nginx nginx -s reload` |
| `docker-compose.yml` | `docker compose down && docker compose up -d` |

> Los datos de SQL Server **no se borran** al rebuildar — el volumen EBS persiste siempre.

---

## Credenciales de prueba

Las contraseñas se configuran en `.env` antes del primer arranque.

| Rol | Correo | Variable |
|---|---|---|
| Administrador | admin@unimente.edu | `SEED_ADMIN_PASSWORD` |
| Admin Brenda | brendaAdmin@unimente.com | `SEED_ADMIN_BRENDA_PASSWORD` |
| Admin Abril | abrilAdmin@unimente.com | `SEED_ADMIN_ABRIL_PASSWORD` |
| Admin Mai | maiAdmin@unimente.com | `SEED_ADMIN_MAI_PASSWORD` |
| Psicólogos | psicologo1..12@unimente.edu | `SEED_DEFAULT_PASSWORD` |
| Estudiantes | estudiante1..100@unimente.edu | `SEED_DEFAULT_PASSWORD` |

> Todas las contraseñas deben tener **mínimo 8 caracteres** (requerido por el seed en producción).

---

## Funcionalidades principales

### Por rol

| Rol | Funcionalidades |
|---|---|
| **Administrador** | Gestionar psicólogos y estudiantes (activar/desactivar), registrar psicólogos, crear/restaurar/descargar backups, configurar backup automático, seguridad MFA |
| **Psicólogo** | Gestionar horarios de atención, ver y gestionar agenda, registrar sesiones clínicas, ver expediente completo de pacientes |
| **Estudiante** | Buscar psicólogos disponibles, agendar citas con calendario personalizado, ver y cancelar citas, ver historial |

### Calendario de citas

El calendario solo muestra días válidos según el horario del psicólogo seleccionado. Los días con citas existentes se marcan en rojo — imposible agendar en fecha incorrecta.

### MFA

TOTP compatible con Google Authenticator, Microsoft Authenticator y Authy. Requerido para operaciones críticas: crear backups, restaurar backups, cambiar contraseña.

### Respaldos

- **Tipos:** COMPLETO, DIFERENCIAL, INCREMENTAL
- **Formatos:** SQL, JSON, EXCEL, CSV
- **Scheduler:** automático con frecuencia configurable (1h a 720h)
- **Límite:** máximo 3 respaldos — el más antiguo se elimina automáticamente
- **Descarga:** botón de descarga directa en la interfaz de administrador
- **Emergencia:** restauración sin JWT cuando la BD está vacía

---

## Arquitectura en producción

```
Amplify (HTTPS)          Expo Go / APK
       │                      │
       └──────┬───────────────┘
              │  HTTPS :443
              ▼
     EC2 c7i-flex.large
     ┌─────────────────────────────┐
     │  nginx (SSL termination)    │
     │  CORS handler               │
     │  Reverse proxy              │
     └──────────┬──────────────────┘
                │ HTTP interno
                ▼
     ┌─────────────────────────────┐
     │  NestJS + Apollo GraphQL    │
     │  Puerto 3000 (interno)      │
     └──────────┬──────────────────┘
                │ mssql driver
                ▼
     ┌─────────────────────────────┐
     │  SQL Server 2022            │
     │  Puerto 1433 (interno)      │
     │  Volumen EBS persistente    │
     └─────────────────────────────┘
```

---

## Seguridad implementada (OWASP Top 10)

| OWASP | Mitigación |
|---|---|
| A01 Broken Access Control | Guards por rol (`@Roles`) en cada resolver y controller |
| A01 | Soft delete vía columna `activo BIT` — datos clínicos nunca se borran |
| A02 Cryptographic Failures | bcrypt para contraseñas, JWT firmado con secreto de 96+ chars, TLS en SQL Server |
| A03 Injection | TypeORM con queries parametrizadas, sin SQL raw expuesto al usuario |
| A05 Security Misconfiguration | `synchronize: false`, usuario no-root en Docker, puertos 1433 y 3000 no expuestos al exterior |
| A07 Auth Failures | Rate limiting global con `@nestjs/throttler`, MFA TOTP para operaciones críticas |
| A08 Software Integrity | Multi-stage Docker build, `npm ci` con lockfile, imágenes con tag fijo |
| A09 Logging | Todos los intentos no autorizados registrados con IP (backups, emergency restore, path traversal) |
| CWE-23 | Path traversal en descarga y restauración de backups: allowlist + `resolve()` + `startsWith()` |

---

## App móvil — APK

```powershell
cd mobile
npm run build:android
```

El APK queda en `android\app\build\outputs\apk\release\unimente-release.apk`

Ver [MOBILE.md](./mobile/MOBILE.md#5-generar-apk) para instrucciones completas.