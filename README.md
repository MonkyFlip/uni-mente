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
| [AWS_DUCKDNS.md](./backend/AWS_DUCKDNS.md) | Configuración del dominio gratuito DuckDNS + SSL Let's Encrypt |
| [FRONTEND.md](./frontend/FRONTEND.md) | Componentes, rutas, tour interactivo, Amplify |
| [MOBILE.md](./mobile/MOBILE.md) | Expo, EAS Build, AAB para Google Play |

---

## Descripción

UniMente cubre el ciclo completo de atención psicológica universitaria: agendamiento de citas con calendario personalizado, registro de sesiones clínicas, historial del paciente, autenticación de dos factores (MFA/TOTP), sistema de respaldos en múltiples formatos con descarga directa y protocolo de restauración de emergencia.

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
| Proxy / SSL | nginx 1.27 + Let's Encrypt (SSL real) |
| DNS dinámico | DuckDNS (gratuito, auto-actualización) |
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
│   ├── AWS.md                # Guía completa de despliegue y operación en EC2
│   ├── AWS_DUCKDNS.md        # Dominio gratuito DuckDNS + SSL Let's Encrypt
│   └── BACKEND.md            # Documentación técnica de la API
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
| **Dominio** | **unimente.duckdns.org** |
| Puerto público | 443 (HTTPS con certificado Let's Encrypt) |
| Base de datos | SQL Server 2022 (Docker, red interna) |

> **La IP de la EC2 ya no importa.** El dominio `unimente.duckdns.org` se actualiza automáticamente cada vez que la instancia se enciende gracias al script DuckDNS configurado en el cron. No hay que tocar ningún archivo del código.
>
> Ver [AWS_DUCKDNS.md](./backend/AWS_DUCKDNS.md) para detalles de la configuración.

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
ssh -i unimente-key.pem ec2-user@unimente.duckdns.org
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

Las contraseñas se configuran en `.env` antes del primer arranque (mínimo 8 caracteres).

| Rol | Correo | Variable |
|---|---|---|
| Administrador | admin@unimente.edu | `SEED_ADMIN_PASSWORD` |
| Admin Brenda | brendaAdmin@unimente.com | `SEED_ADMIN_BRENDA_PASSWORD` |
| Admin Abril | abrilAdmin@unimente.com | `SEED_ADMIN_ABRIL_PASSWORD` |
| Admin Mai | maiAdmin@unimente.com | `SEED_ADMIN_MAI_PASSWORD` |
| Psicólogos | psicologo1..12@unimente.edu | `SEED_DEFAULT_PASSWORD` |
| Estudiantes | estudiante1..100@unimente.edu | `SEED_DEFAULT_PASSWORD` |

---

## Funcionalidades principales

| Rol | Funcionalidades |
|---|---|
| **Administrador** | Gestionar psicólogos y estudiantes, registrar psicólogos, crear/restaurar/descargar backups, configurar backup automático, seguridad MFA |
| **Psicólogo** | Gestionar horarios, ver agenda, registrar sesiones clínicas, ver expediente de pacientes, exportar historial a PDF |
| **Estudiante** | Buscar psicólogos, agendar citas con calendario personalizado, ver y cancelar citas |

---

## Arquitectura en producción

```
Amplify (HTTPS)          Expo Go / APK / AAB
       │                        │
       └──────────┬─────────────┘
                  │  HTTPS :443
                  ▼
     unimente.duckdns.org
     ┌─────────────────────────────────┐
     │  EC2 c7i-flex.large             │
     │  ┌───────────────────────────┐  │
     │  │  nginx (SSL Let's Encrypt)│  │
     │  │  CORS handler             │  │
     │  └──────────┬────────────────┘  │
     │             │ HTTP interno       │
     │  ┌──────────▼────────────────┐  │
     │  │  NestJS + Apollo GraphQL  │  │
     │  │  Puerto 3000 (interno)    │  │
     │  └──────────┬────────────────┘  │
     │             │ mssql driver       │
     │  ┌──────────▼────────────────┐  │
     │  │  SQL Server 2022          │  │
     │  │  Puerto 1433 (interno)    │  │
     │  │  Volumen EBS persistente  │  │
     │  └───────────────────────────┘  │
     └─────────────────────────────────┘

     DuckDNS actualiza unimente.duckdns.org
     automáticamente cada 5 min si la IP cambia
```

---

## Seguridad implementada (OWASP Top 10)

| OWASP | Mitigación |
|---|---|
| A01 Broken Access Control | Guards por rol en cada resolver y controller |
| A01 | Soft delete vía `activo BIT` — datos clínicos nunca se borran |
| A02 Cryptographic Failures | bcrypt, JWT 96+ chars, TLS con Let's Encrypt |
| A03 Injection | TypeORM parametrizado, sin SQL raw expuesto |
| A05 Security Misconfiguration | `synchronize: false`, usuario no-root en Docker, puertos 1433 y 3000 no expuestos |
| A07 Auth Failures | Rate limiting global, MFA TOTP para operaciones críticas |
| A08 Software Integrity | Multi-stage Docker build, `npm ci` con lockfile |
| A09 Logging | Intentos no autorizados registrados con IP |
| CWE-23 | Path traversal prevenido en descarga y restauración de backups |

---

## App móvil — Google Play

La app se publica en Google Play usando **EAS Build** de Expo para generar el **AAB** (Android App Bundle).

Ver [MOBILE.md](./mobile/MOBILE.md) para el proceso completo.