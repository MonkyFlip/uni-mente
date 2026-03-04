# 🧠 UniMente

> Sistema de gestión de citas psicológicas universitarias — plataforma web full-stack para conectar estudiantes con psicólogos certificados de manera confidencial y segura.

---

## 📌 Descripción del proyecto

**UniMente** es un portal de bienestar psicológico universitario desarrollado con una arquitectura moderna cliente-servidor. Permite a los estudiantes agendar citas con psicólogos, a los psicólogos gestionar su agenda y registrar sesiones clínicas, y a los administradores gestionar el catálogo de profesionales.

---

## 🏗️ Arquitectura general

```
UniMente/
├── backend/          # API GraphQL — NestJS + TypeORM + MySQL
│   └── BACKEND.md    # Documentación completa del backend
├── frontend/         # SPA React — Apollo Client + CSS Modules
│   └── FRONTEND.md   # Documentación completa del frontend
└── README.md         # Este archivo
```

---

## 📚 Documentación

| Documento | Descripción |
|---|---|
| [BACKEND.md](./backend/BACKEND.md) | Setup, variables de entorno, tablas, endpoints GraphQL, autenticación JWT, scripts |
| [FRONTEND.md](./frontend/FRONTEND.md) | Instalación, estructura de componentes, paleta de temas, rutas, dependencias |

---

## 👥 Roles del sistema

| Rol | Capacidades |
|---|---|
| **Estudiante** | Registro público, buscar psicólogos, agendar y cancelar citas |
| **Psicólogo** | Gestionar horarios, ver agenda, registrar sesiones clínicas |
| **Administrador** | Registrar psicólogos, ver todos los psicólogos y estudiantes |

---

## 🗄️ Modelo de datos

```
Rol ──< Usuario >── Estudiante
                └── Psicologo ──< Horario_Psicologo
                                └──< Cita >── Sesion
                                              └──< Detalle_Historial
                                                   └── Historial_Clinico
```

9 tablas relacionales con integridad referencial y constraint UNIQUE para evitar doble reserva en el mismo horario.

---

## ⚙️ Stack tecnológico

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| NestJS | 10+ | Framework principal |
| GraphQL (code-first) | — | API layer |
| Apollo Server | 4.x | Servidor GraphQL |
| TypeORM | — | ORM |
| MySQL | 8+ | Base de datos |
| JWT + Passport | — | Autenticación |
| bcrypt | — | Hash de contraseñas |

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 19 | UI library |
| Vite | — | Build tool |
| Apollo Client | 3.x | Cliente GraphQL |
| React Router | 7 | Navegación SPA |
| Lucide React | — | Iconografía |
| CSS Modules | — | Estilos encapsulados |

---

## 🚀 Inicio rápido

### Requisitos previos
- Node.js 18+
- MySQL 8+
- npm 9+

### 1. Clonar el repositorio

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd unimente
```

### 2. Configurar y arrancar el backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de MySQL
npm install --legacy-peer-deps
nest start
```

### 3. Configurar y arrancar el frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### 4. Abrir en el navegador

| Servicio | URL |
|---|---|
| Frontend (app) | http://localhost:5173 |
| Backend (GraphQL Sandbox) | http://localhost:3000/graphql |

---

## 🔑 Credenciales iniciales

Después de ejecutar el `seed.sql` en el backend, el administrador inicial es:

```
Correo:     admin@unimente.edu
Contraseña: password
```

> ⚠️ Cambia estas credenciales antes de cualquier despliegue en producción.

---

## 🌿 Flujo de trabajo git sugerido

```
main          → rama estable, solo merges desde develop
develop       → integración
feature/xxx   → nuevas funcionalidades
fix/xxx       → correcciones
```

---

## 📋 Estado del proyecto

| Módulo | Estado |
|---|---|
| Auth JWT (login / registro) | ✅ Completo |
| CRUD Estudiantes | ✅ Completo |
| CRUD Psicólogos | ✅ Completo |
| Horarios de disponibilidad | ✅ Completo |
| Agendado de citas | ✅ Completo |
| Registro de sesiones clínicas | ✅ Completo |
| Historial clínico | ✅ Completo |
| Frontend — Login / Registro | ✅ Completo |
| Frontend — Dashboard por rol | ✅ Completo |
| Frontend — Paleta de 5 temas | ✅ Completo |
| Frontend — Agenda psicólogo | ✅ Completo |
| Frontend — Horarios psicólogo | ✅ Completo |
| Notificaciones / correos | 🔲 Pendiente |
| Panel de estadísticas admin | 🔲 Pendiente |
| App móvil | 🔲 Futuro |
