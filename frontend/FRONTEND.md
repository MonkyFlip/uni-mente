# UniMente — Frontend Web

Aplicación web del Portal de Bienestar Universitario.
Stack: **React 18 · TypeScript · Vite · Apollo Client · React Router · CSS Modules**

---

## Índice

1. [Inicio rápido](#1-inicio-rápido)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Configuración de la API](#3-configuración-de-la-api)
4. [Rutas y roles](#4-rutas-y-roles)
5. [Autenticación y contexto](#5-autenticación-y-contexto)
6. [Componentes base](#6-componentes-base)
7. [Páginas por rol](#7-páginas-por-rol)
8. [Tour interactivo de onboarding](#8-tour-interactivo-de-onboarding)
9. [Sistema de temas](#9-sistema-de-temas)
10. [Operaciones GraphQL](#10-operaciones-graphql)
11. [Despliegue en AWS Amplify](#11-despliegue-en-aws-amplify)
12. [Aplicar nuevos cambios](#12-aplicar-nuevos-cambios)

---

## 1. Inicio rápido

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# App disponible en http://localhost:5173
```

### Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |

### Scripts disponibles

```bash
npm run dev      # servidor de desarrollo con hot-reload
npm run build    # compilar para producción → dist/
npm run preview  # previsualizar build local
```

---

## 2. Estructura del proyecto

```
frontend/src/
│
├── apollo/
│   └── client.ts              # ApolloClient + exporta GRAPHQL_URL y API_BASE_URL
│
├── auth/
│   ├── AuthContext.tsx         # Contexto global de sesión (token + usuario + rol)
│   ├── ProtectedRoute.tsx      # Guard de rutas con validación de rol
│   └── ThemeContext.tsx        # Contexto del tema de color (paletas)
│
├── components/
│   ├── UI.tsx                  # Biblioteca de componentes base (ver sección 6)
│   ├── UI.module.css
│   ├── Sidebar.tsx             # Navegación lateral (diferente por rol)
│   ├── Sidebar.module.css
│   ├── Layout.tsx              # Shell: Sidebar + área de contenido
│   ├── Layout.module.css
│   ├── DatePicker.tsx          # Calendario personalizado para agendar citas
│   ├── DatePicker.module.css
│   ├── TimePicker.tsx          # Selector de hora
│   └── TimePicker.module.css
│
├── graphql/
│   └── operations.ts           # Todas las queries y mutations de Apollo
│
├── pages/
│   ├── Login.tsx               # Inicio de sesión
│   ├── Login.module.css
│   ├── Registro.tsx            # Registro de estudiante
│   ├── Registro.module.css
│   ├── Dashboard.tsx           # Dashboard adaptado por rol con stats reales
│   ├── Dashboard.module.css
│   ├── CambiarPassword.module.css
│   │
│   ├── admin/
│   │   ├── Backup.tsx          # Respaldos: crear, restaurar, descargar
│   │   ├── Backup.module.css
│   │   ├── EmergencyRestore.tsx  # Restauración sin JWT (BD vacía)
│   │   ├── EmergencyRestore.module.css
│   │   ├── Estudiantes.tsx     # Gestión de estudiantes con toggle activo
│   │   ├── MfaConfig.tsx       # Configuración de MFA
│   │   ├── MfaConfig.module.css
│   │   ├── Psicologos.tsx      # Gestión de psicólogos con toggle activo
│   │   ├── Psicologos.module.css
│   │   ├── RegistrarPsicologo.tsx
│   │   └── RegistrarPsicologo.module.css
│   │
│   ├── estudiante/
│   │   ├── MisCitas.tsx        # Lista de citas con filtros y paginación
│   │   ├── MisCitas.module.css
│   │   ├── Psicologos.tsx      # Búsqueda y agendamiento de citas
│   │   └── Psicologos.module.css
│   │
│   └── psicologo/
│       ├── Agenda.tsx          # Agenda diaria con filtros y paginación
│       ├── Agenda.module.css
│       ├── Historial.tsx       # Expedientes de pacientes + exportar PDF
│       ├── Historial.module.css
│       ├── Horarios.tsx        # Gestión de horarios de atención
│       └── Horarios.module.css
│
├── tours/
│   ├── TourContext.tsx         # Contexto del tour interactivo
│   ├── Tour.tsx                # Componente overlay del tour
│   ├── Tour.module.css
│   └── tourSteps.ts            # 7 pasos por rol (3 roles × 7 = 21 pasos)
│
├── App.tsx                     # Rutas con React Router
├── main.tsx                    # Entry point — ApolloProvider + AuthProvider
└── index.css                   # Design tokens + 15 animaciones CSS keyframe
```

---

## 3. Configuración de la API

El archivo `src/apollo/client.ts` centraliza la configuración de la conexión al backend:

```typescript
// Cambiar estas dos constantes al actualizar la IP de la EC2
export const GRAPHQL_URL  = 'https://18.190.217.141/graphql';
export const API_BASE_URL = 'https://18.190.217.141';
```

`API_BASE_URL` es importado por `Backup.tsx` para las descargas de archivos (endpoint REST). Cuando cambie la IP de la EC2, **solo hay que editar este archivo** — el resto del frontend lo hereda automáticamente.

### Apollo Client

- **`authLink`** — inyecta `Authorization: Bearer <token>` en cada petición desde `localStorage`
- **`errorLink`** — redirige a `/login` solo si no hay token (evita cerrar sesiones activas por errores transitorios)
- **`fetchPolicy: cache-and-network`** — siempre refresca datos del servidor pero muestra cache mientras carga

---

## 4. Rutas y roles

| Ruta | Acceso | Componente |
|---|---|---|
| `/login` | Público | `Login` |
| `/registro` | Público | `Registro` |
| `/emergency-restore` | Público | `EmergencyRestore` |
| `/dashboard` | Todos los roles | `Dashboard` |
| `/admin/mfa` | Todos los roles | `MfaConfig` |
| `/psicologos` | `estudiante` | `EstPsicologos` |
| `/mis-citas` | `estudiante` | `MisCitas` |
| `/agenda` | `psicologo` | `Agenda` |
| `/horarios` | `psicologo` | `Horarios` |
| `/mis-pacientes` | `psicologo` | `Historial` |
| `/admin/psicologos` | `administrador` | `AdminPsicologos` |
| `/admin/estudiantes` | `administrador` | `AdminEstudiantes` |
| `/admin/backup` | `administrador` | `Backup` |
| `*` | Todos | Redirige a `/dashboard` |

`ProtectedRoute` verifica token en `localStorage` y opcionalmente valida el rol. Si no coincide, redirige a `/login`.

---

## 5. Autenticación y contexto

### AuthContext

Almacena el estado de sesión de forma global:

```typescript
interface AuthUser {
  nombre:    string;
  correo:    string;
  rol:       'administrador' | 'psicologo' | 'estudiante';
  token:     string;
  id_perfil: number | null;  // id_estudiante o id_psicologo; null para admin
}
```

**Persistencia:** `localStorage` con clave `user` (objeto) y `token` (string). Al recargar la página se restaura la sesión automáticamente.

**Version guard:** `auth_version` en `localStorage` invalida sesiones de versiones antiguas al actualizar el frontend.

**Login:**
```typescript
const { login, logout, user } = useAuth();
login(userData);   // guarda en localStorage y context
logout();          // limpia localStorage y redirige a /login
```

### ThemeContext

Gestiona la paleta de color activa. Las paletas disponibles son:

| Paleta | Color principal |
|---|---|
| Océano | Teal (#1a7a6e) |
| Lavanda | Morado suave |
| Coral | Naranja-rosa |
| Menta | Verde claro |
| Noche | Azul oscuro |

La paleta se guarda en `localStorage` y se aplica como variables CSS en `document.documentElement`.

---

## 6. Componentes base

Todos en `src/components/UI.tsx`.

### Button

```tsx
<Button variant="primary|secondary|danger" size="sm|md|lg" loading={false}>
  Texto
</Button>
```

Incluye efecto ripple al hacer clic.

### Card

```tsx
<Card className="opcional">Contenido</Card>
```

### PageHeader

```tsx
<PageHeader title="Respaldos" subtitle="Descripción" action={<Button>Acción</Button>} />
```

### Badge

```tsx
<Badge label="COMPLETO" variant="teal|gray|red" />
```

### Modal

```tsx
<Modal open={show} onClose={() => setShow(false)} title="Título">
  Contenido del modal
</Modal>
```

### Alert

```tsx
<Alert message="Texto del mensaje" type="error|success" />
```

### StatCard

```tsx
<StatCard icon={<Users size={20} />} label="Estudiantes" value={100} color="teal" />
```

Usado en el Dashboard para métricas en tiempo real.

### Field

```tsx
<Field label="Correo" error="Mensaje de error">
  <input type="email" />
</Field>
```

### Pagination + usePagination

```tsx
const { page, setPage, slice, totalPages } = usePagination(items, 10);

<Pagination total={items.length} page={page} pageSize={10} onChange={setPage} />
```

### Spinner, EmptyState

```tsx
<Spinner size={24} />
<EmptyState icon="📭" title="Sin resultados" description="Descripción opcional" />
```

### DatePicker (componente personalizado)

Calendario con lógica de negocio integrada:
- Solo muestra días válidos según el horario del psicólogo seleccionado
- Días con citas existentes marcados en rojo (bloqueados)
- Evita fechas pasadas
- Corrección de zona horaria con `setHours(12,0,0,0)` para evitar desfase de día

### TimePicker

Selector de hora en formato `HH:MM` con opciones cada 30 minutos.

---

## 7. Páginas por rol

### Público

**Login** (`/login`)
- Formulario correo + contraseña
- Icono `<Brain>` de Lucide (sin emojis)
- Redirige al dashboard tras login exitoso

**Registro** (`/registro`)
- Solo para estudiantes
- Campos: nombre, correo, contraseña, teléfono, matrícula, carrera
- Mismo icono `<Brain>` que Login

**Restauración de emergencia** (`/emergency-restore`)
- Accesible sin sesión
- Solo funciona cuando la BD no tiene usuarios
- Lista backups disponibles del servidor
- Requiere `RESTORE_SECRET` para confirmar

---

### Administrador

**Dashboard** (`/dashboard`)
Stats reales obtenidas vía GraphQL:
- Total de psicólogos activos
- Total de estudiantes registrados
- Total de citas del sistema

**Psicólogos** (`/admin/psicologos`)
- Lista completa con paginación
- Filtros: Todos / Activos / Inactivos con contadores
- Toggle activo/inactivo por psicólogo (soft delete)
- Botón para registrar nuevo psicólogo

**Estudiantes** (`/admin/estudiantes`)
- Lista completa con paginación
- Filtros: Todos / Activos / Inactivos con contadores
- Toggle activo/inactivo por estudiante

**Respaldos** (`/admin/backup`)
- Selección de tipo (COMPLETO / DIFERENCIAL / INCREMENTAL)
- Selección de formato (SQL / JSON / EXCEL / CSV)
- Modal de confirmación con código MFA
- Lista de respaldos disponibles (máx. 3)
- **Botón de descarga** — descarga el archivo directamente al navegador usando `API_BASE_URL` + JWT
- **Botón de restaurar** — abre modal con advertencia + código MFA
- Panel de configuración de backup automático (tipo, formato, frecuencia)

**Seguridad MFA** (`/admin/mfa`)
- Configurar / deshabilitar TOTP
- QR code para escanear con app autenticadora

---

### Psicólogo

**Dashboard** (`/dashboard`)
Stats reales:
- Total de citas en agenda
- Citas pendientes
- Pacientes atendidos

**Agenda** (`/agenda`)
- Lista paginada (10/página) con orden: pendientes primero
- Filtros: Todos / Pendientes / Asistidas / Canceladas
- Botones de acción en citas PENDIENTES: marcar Asistida / Cancelar
- Fecha corregida con hora local (sin desfase UTC)

**Horarios** (`/horarios`)
- Tarjetas estilizadas por día de la semana
- Badge de disponibilidad
- Agregar nuevo horario (día + hora inicio + hora fin)
- Botón eliminar con ícono SVG

**Mis pacientes / Historial** (`/mis-pacientes`)
- Lista de pacientes con acordeón expandible
- Historial clínico completo por paciente
- **Exportar PDF** — genera documento HTML en nueva pestaña y llama a `window.print()` (sin dependencias externas)

---

### Estudiante

**Dashboard** (`/dashboard`)
Stats reales:
- Total de citas agendadas
- Citas pendientes
- Citas asistidas

**Psicólogos** (`/psicologos`)
- Lista paginada (9/página)
- Solo muestra psicólogos activos
- Tarjetas con especialidad, cédula y horarios disponibles
- Botón "Agendar cita" por psicólogo
- Modal de agendamiento con `DatePicker` + `TimePicker`
- Días ocupados bloqueados en rojo

**Mis citas** (`/mis-citas`)
- Lista paginada (8/página)
- Filtros: Todas / Pendientes / Asistidas / Canceladas
- Orden: pendientes primero
- Botón cancelar solo en citas PENDIENTES

---

## 8. Tour interactivo de onboarding

Sistema de tour guiado que se activa automáticamente en el primer login de cada rol. También accesible desde el sidebar con el botón "Tour".

### Implementación

- **`TourContext.tsx`** — estado global: paso actual, visible, completado
- **`Tour.tsx`** — overlay con spotlight, flecha de posicionamiento, navegación
- **`tourSteps.ts`** — 7 pasos por rol (21 pasos totales)

### Pasos por rol

**Administrador (7 pasos):**
Dashboard → Psicólogos → Estudiantes → Respaldos → Backup automático → Seguridad MFA → Fin

**Psicólogo (7 pasos):**
Dashboard → Agenda → Horarios → Mis pacientes → Exportar PDF → Seguridad MFA → Fin

**Estudiante (7 pasos):**
Dashboard → Psicólogos disponibles → Agendar cita → Calendario → Mis citas → Filtros → Fin

### Persistencia

El estado "tour completado" se guarda en `localStorage` con clave `tour_completed_<rol>`. No se vuelve a mostrar automáticamente, pero el botón del sidebar lo reactiva manualmente.

---

## 9. Sistema de temas

### Design tokens (index.css)

Variables CSS globales:

```css
--navy:        #0d1117   /* fondo principal */
--navy-card:   #161b22   /* fondo de tarjetas */
--teal:        #1a7a6e   /* color primario */
--teal-light:  #3ecf8e   /* acento brillante */
--cream:       #e6e1d6   /* texto principal */
--cream-dim:   #8b949e   /* texto secundario */
--border:      rgba(255,255,255,0.06)
```

### Animaciones CSS (15 keyframes)

Definidas en `index.css` y usadas con clases:

| Clase | Efecto |
|---|---|
| `.anim-fade-down` | Aparece desde arriba |
| `.anim-fade-up` | Aparece desde abajo |
| `.anim-fade-in` | Aparece con opacidad |
| `.anim-slide-in` | Entra desde la izquierda |
| `.delay-1` a `.delay-5` | Retrasos escalonados |

### Sidebar

- Navegación diferente por rol
- Iconos de Lucide (sin emojis)
- Selector de paleta de color como dropdown hacia arriba
- Botón de Tour
- Botón de Cerrar sesión

---

## 10. Operaciones GraphQL

Todas en `src/graphql/operations.ts`. Se usan directamente con `useQuery` y `useMutation` de Apollo Client.

### Autenticación

```typescript
LOGIN                   // mutation — devuelve access_token, rol, nombre, id_perfil
REGISTRAR_ESTUDIANTE    // mutation — registro público
```

### Estudiante

```typescript
GET_PSICOLOGOS          // query — lista con horarios (solo activos)
GET_MIS_CITAS           // query JWT — citas propias sin pasar ID
AGENDAR_CITA            // mutation
CAMBIAR_ESTADO_CITA     // mutation — cancelar cita
```

### Psicólogo

```typescript
GET_MI_AGENDA           // query JWT — agenda propia sin pasar ID
GET_MIS_PACIENTES       // query JWT — pacientes propios
CREAR_HORARIO           // mutation
ELIMINAR_HORARIO        // mutation
CAMBIAR_ESTADO_CITA     // mutation — asistida / cancelar
REGISTRAR_SESION        // mutation — crea sesión clínica
GET_EXPEDIENTE          // query — historial completo de un paciente
```

### Administrador

```typescript
GET_PSICOLOGOS_ADMIN    // query — todos los psicólogos con activo
GET_ESTUDIANTES_ADMIN   // query — todos los estudiantes con activo
TOGGLE_ACTIVO_PSICOLOGO // mutation — soft delete
TOGGLE_ACTIVO_ESTUDIANTE// mutation
REGISTRAR_PSICOLOGO     // mutation
GET_BACKUPS             // query — lista de backups
CREAR_BACKUP            // mutation + código MFA
RESTAURAR_BACKUP        // mutation + código MFA
GET_BACKUP_CONFIG       // query — configuración automática
CONFIGURAR_BACKUP_AUTO  // mutation + código MFA
```

### MFA (todos los roles)

```typescript
SETUP_MFA               // mutation — genera QR y secret
HABILITAR_MFA           // mutation + código
DESHABILITAR_MFA        // mutation + código
MI_ESTADO_MFA           // query — activo o no
CAMBIAR_PASSWORD        // mutation (+ código MFA si activo)
```

---

## 11. Despliegue en AWS Amplify

### Configuración

| Parámetro | Valor |
|---|---|
| URL | https://aws.d1mrcwf1ifucba.amplifyapp.com/ |
| Rama | `aws` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Auto-deploy | Sí — con cada push a la rama `aws` |

### Amplify rewrites (necesario para React Router)

En la consola Amplify → Rewrites and redirects, agregar:

```
Source:      </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>
Target:      /index.html
Type:        200 (Rewrite)
```

Esto evita el error 404 al refrescar una ruta como `/dashboard`.

### Certificado SSL de la EC2

El backend usa un certificado autofirmado. Para que el frontend en Amplify pueda conectar:

1. Abrir `https://<IP_EC2>/graphql` en el navegador
2. Aceptar la advertencia "No seguro" → Avanzado → Continuar
3. A partir de ese momento el frontend funciona sin restricciones

Este paso debe repetirse por cada dispositivo y cada vez que la IP cambie.

---

## 12. Aplicar nuevos cambios

### Subir cambios al repositorio

```bash
git add .
git commit -m "descripción del cambio"
git push origin aws
```

Amplify detecta el push y redespliega automáticamente en ~2 minutos.

### Actualizar la IP del backend

Cuando la EC2 cambia de IP:

1. Editar `src/apollo/client.ts`:
   ```typescript
   export const GRAPHQL_URL  = 'https://<NUEVA_IP>/graphql';
   export const API_BASE_URL = 'https://<NUEVA_IP>';
   ```
2. `git push origin aws`
3. Aceptar el certificado en `https://<NUEVA_IP>/graphql`

Al cambiar solo `client.ts`, tanto las peticiones GraphQL como las descargas de backup usarán la nueva IP automáticamente.