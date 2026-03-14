# UniMente — Frontend

Interfaz de usuario del Portal de Bienestar Universitario.  
Stack: **React 18 · TypeScript · Vite · Apollo Client · React Router · CSS Modules**.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación](#2-instalación)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Iniciar la aplicación](#4-iniciar-la-aplicación)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Páginas y rutas](#6-páginas-y-rutas)
7. [Autenticación y contexto global](#7-autenticación-y-contexto-global)
8. [Apollo Client](#8-apollo-client)
9. [Guía interactiva del sistema](#9-guía-interactiva-del-sistema)
10. [Componentes reutilizables](#10-componentes-reutilizables)
11. [Paginación](#11-paginación)
12. [Módulo MFA — Seguridad](#12-módulo-mfa--seguridad)
13. [Módulo de respaldos](#13-módulo-de-respaldos)
14. [Operaciones GraphQL](#14-operaciones-graphql)
15. [Decisiones técnicas y bugs resueltos](#15-decisiones-técnicas-y-bugs-resueltos)
16. [Scripts disponibles](#16-scripts-disponibles)

---

## 1. Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| Backend UniMente | Corriendo en `localhost:3000` |

---

## 2. Instalación

```bash
git clone https://github.com/MonkyFlip/uni-mente.git
cd uni-mente/frontend
npm install --legacy-peer-deps
```

---

## 3. Variables de entorno

Crea el archivo `.env` en `frontend/` (opcional — el cliente ya apunta a `localhost:3000` por defecto):

```env
VITE_API_URL=http://localhost:3000/graphql
```

---

## 4. Iniciar la aplicación

```bash
# Desarrollo
npm run dev
```

La aplicación abre en http://localhost:5173

```bash
# Producción
npm run build
npm run preview
```

---

## 5. Estructura del proyecto

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                           # Router + providers + TourProvider
│   ├── index.css                         # Variables CSS globales (tokens de diseño)
│   │
│   ├── apollo/
│   │   └── client.ts                     # Apollo Client con auth link + error link
│   │
│   ├── auth/
│   │   ├── AuthContext.tsx               # Contexto global del usuario autenticado
│   │   ├── ProtectedRoute.tsx            # Guard de rutas por rol
│   │   └── ThemeContext.tsx              # Paleta de colores (6 temas)
│   │
│   ├── tours/
│   │   ├── tourSteps.ts                  # Pasos por rol (estudiante, psicólogo, admin)
│   │   ├── TourContext.tsx               # Estado y lógica del tour
│   │   ├── Tour.tsx                      # Overlay SVG + tooltip animado
│   │   └── Tour.module.css
│   │
│   ├── components/
│   │   ├── UI.tsx                        # Button, Card, Modal, Badge, Pagination...
│   │   ├── UI.module.css
│   │   ├── Layout.tsx / Layout.module.css
│   │   ├── Sidebar.tsx / Sidebar.module.css
│   │   ├── DatePicker.tsx                # Selector de fecha con día de semana forzado
│   │   └── TimePicker.tsx                # Selector HH:MM
│   │
│   ├── graphql/
│   │   └── operations.ts                 # Todas las queries y mutations GraphQL
│   │
│   └── pages/
│       ├── Login.tsx                     # Login + modal cambio de contraseña con MFA
│       ├── CambiarPassword.module.css
│       ├── Registro.tsx
│       ├── Dashboard.tsx                 # Stats en tiempo real por rol
│       ├── admin/
│       │   ├── Psicologos.tsx            # CRUD con paginación (9 por página)
│       │   ├── RegistrarPsicologo.tsx
│       │   ├── Backup.tsx                # Respaldos con modal MFA de confirmación
│       │   └── MfaConfig.tsx             # Activar/desactivar TOTP
│       ├── estudiante/
│       │   ├── Psicologos.tsx            # Buscar y agendar cita (6 por página)
│       │   └── MisCitas.tsx              # Ver y cancelar citas (10 por página)
│       └── psicologo/
│           ├── Agenda.tsx                # Gestionar citas (8/10 por sección)
│           └── Horarios.tsx              # CRUD de horarios disponibles
│
├── .env
├── vite.config.ts
└── package.json
```

---

## 6. Páginas y rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | → Redirige a `/login` | Público |
| `/login` | Login + botón cambiar contraseña | Público |
| `/registro` | Registro de estudiante | Público |
| `/dashboard` | Dashboard con stats en tiempo real | Autenticado |
| `/psicologos` | Lista de psicólogos con paginación | Autenticado |
| `/mis-citas` | Mis citas con filtros y paginación | Solo estudiante |
| `/agenda` | Agenda con paginación por sección | Solo psicólogo |
| `/horarios` | CRUD de horarios disponibles | Solo psicólogo |
| `/admin/psicologos` | CRUD de psicólogos con paginación | Solo administrador |
| `/registrar-psicologo` | Formulario rápido de registro | Solo administrador |
| `/admin/backup` | Dashboard de respaldos | Solo administrador |
| `/admin/mfa` | Configuración de MFA | Todos (autenticado) |
| `/*` | → Redirige a `/dashboard` | — |

### Guard de rutas

```tsx
<Route path="/agenda" element={
  <ProtectedRoute roles={['psicologo']}>
    <Agenda />
  </ProtectedRoute>
} />
```

---

## 7. Autenticación y contexto global

### Estructura del usuario en contexto

```typescript
interface User {
  nombre:    string;
  correo:    string;
  rol:       'administrador' | 'psicologo' | 'estudiante';
  token:     string;
  id_perfil?: number;  // id_estudiante o id_psicologo según rol
}
```

El usuario se persiste en `localStorage` para sobrevivir recargas.

### Cambio de contraseña desde Login

El botón "Cambiar contraseña" en la página de login abre un modal que requiere:

1. Correo de la cuenta
2. Contraseña actual
3. Nueva contraseña (mínimo 8 caracteres)
4. **Código MFA de 6 dígitos — siempre obligatorio**

El código MFA es **siempre requerido** independientemente de si la cuenta lo tiene activo o no en ese momento. Esto previene que alguien con acceso físico al dispositivo cambie la contraseña de otra persona.

---

## 8. Apollo Client

`src/apollo/client.ts` encadena tres links:

**errorLink** — detecta respuestas `Unauthorized` y redirige al login limpiando localStorage.

**authLink** — adjunta el JWT a cada petición:
```typescript
authorization: token ? `Bearer ${token}` : ''
```

**httpLink** — apunta a `http://localhost:3000/graphql`.

La caché usa `fetchPolicy: 'cache-and-network'` como defecto global.

---

## 9. Guía interactiva del sistema

### Funcionamiento

Al iniciar sesión por primera vez, el sistema activa automáticamente una guía interactiva (tour) que:

- Muestra un overlay oscuro con un recorte sobre el elemento destacado
- Resalta cada elemento con un borde teal animado
- Presenta un tooltip con título, descripción y barra de progreso
- Recuerda que la guía ya fue completada via `localStorage` (clave: `unimente_tour_v1_{rol}`)

### Relanzar la guía

El botón **"Guía del sistema"** (icono `HelpCircle`) en la barra lateral permite relanzarla en cualquier momento sin importar si ya fue completada.

### Pasos por rol

| Rol | Pasos | Temas cubiertos |
|---|---|---|
| Estudiante | 7 | Dashboard, psicólogos, mis citas, stats, acciones rápidas, tema |
| Psicólogo | 7 | Dashboard, agenda, horarios, stats, acciones rápidas, tema |
| Administrador | 7 | Dashboard, psicólogos, stats, respaldos, seguridad MFA, tema |

### `data-tour` attributes

Los elementos del DOM que participan en el tour tienen el atributo `data-tour`:

```
sidebar-brand    nav-dashboard    nav-psicologos    nav-mis-citas
nav-agenda       nav-horarios     nav-backup        nav-mfa
tour-stats       tour-actions     sidebar-theme
```

---

## 10. Componentes reutilizables

### `UI.tsx` — componentes base

| Componente | Props principales | Descripción |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `icon` | Botón con estados de carga |
| `Card` | `hoverable` | Tarjeta con sombra y borde |
| `Modal` | `open`, `onClose`, `title` | Diálogo con overlay |
| `Field` | `label`, `error` | Wrapper de campo de formulario |
| `Alert` | `message`, `type` | Mensaje de éxito o error |
| `Badge` | `label`, `variant` | Etiqueta de estado coloreada |
| `Spinner` | `size` | Indicador de carga |
| `EmptyState` | `icon`, `title`, `description` | Estado vacío de listas |
| `PageHeader` | `title`, `subtitle`, `action` | Cabecera de página |
| `StatCard` | `icon`, `label`, `value` | Tarjeta de métrica en dashboard |
| `Pagination` | `total`, `page`, `pageSize`, `onChange` | Paginación con ellipsis |

### `usePagination<T>` hook

```typescript
const { page, setPage, slice, total, pageSize } = usePagination(items, pageSize);
```

Hace scroll al top automáticamente al cambiar de página. `slice` son los elementos de la página actual. Al filtrar la lista se reinicia a la página 1 llamando `setPage(1)`.

### `DatePicker.tsx`

Selector de fecha que bloquea días de la semana no permitidos. Usado en el agendamiento de citas para que el estudiante solo pueda elegir fechas que coincidan con el horario seleccionado.

### `TimePicker.tsx`

Selector `HH:MM`. El formulario convierte a `HH:MM:SS` antes de enviar al backend.

---

## 11. Paginación

Implementada en todas las vistas con listas largas:

| Vista | Registros por página | Notas |
|---|---|---|
| Admin › Psicólogos | 9 | Se reinicia al cambiar búsqueda |
| Estudiante › Psicólogos | 6 | Se reinicia al cambiar búsqueda |
| Estudiante › Mis Citas | 10 | Paginación + filtros de estado con conteo |
| Psicólogo › Agenda — Próximas | 8 | Paginación independiente por sección |
| Psicólogo › Agenda — Historial | 10 | Paginación independiente por sección |

El componente `Pagination` muestra el rango de registros (`1–9 de 12`), botones de anterior/siguiente y números de página con puntos suspensivos automáticos para listas largas.

---

## 12. Módulo MFA — Seguridad

### Página `/admin/mfa`

Accesible para cualquier usuario autenticado. Permite:

- **Activar MFA** — genera un código QR escaneablecon Google Authenticator o Microsoft Authenticator. El secreto base32 también se muestra para ingreso manual. MFA no se activa hasta que se verifica el primer código de la app.
- **Desactivar MFA** — requiere un código válido de la app para confirmar.
- **Nota informativa** — indica que el cambio de contraseña se realiza desde el login.

### Flujo de activación

```
1. Clic en "Activar MFA"
   → backend genera secreto TOTP + URL otpauth://
   → frontend recibe qr_code (PNG base64) + secret (base32)

2. Usuario escanea QR con su app

3. Ingresa código de 6 dígitos para confirmar sincronización

4. MFA activo — operaciones sensibles requieren código
```

### Cambio de contraseña (desde Login)

El modal de cambio de contraseña siempre exige el código MFA de 6 dígitos como medida de seguridad obligatoria. El botón de envío permanece deshabilitado hasta que los 6 dígitos estén completos.

---

## 13. Módulo de respaldos

### Página `/admin/backup`

Solo accesible para administradores.

### Crear respaldo manual

1. Seleccionar tipo: `COMPLETO` / `DIFERENCIAL` / `INCREMENTAL`
2. Seleccionar formato: `SQL` / `JSON` / `EXCEL` / `CSV`
3. Clic en "Crear respaldo" → **se abre un modal de confirmación** que muestra un resumen del backup y solicita el código MFA
4. Ingresar código de 6 dígitos → confirmar

El campo MFA en el modal de confirmación es grande y visualmente prominente. Si el administrador no tiene MFA configurado, puede dejarlo vacío y el backend lo acepta.

### Backup automático

Al configurar el backup automático se ejecuta **un backup inmediato** de seguridad y luego el scheduler verifica cada hora si ha transcurrido el tiempo configurado.

### Lista de respaldos

Muestra los últimos 3 backups con: nombre de archivo, tipo, formato, modo (MANUAL/AUTOMÁTICO), tamaño y fecha. Cada entrada tiene un botón **Restaurar** que abre un modal de confirmación con código MFA requerido.

---

## 14. Operaciones GraphQL

Todas centralizadas en `src/graphql/operations.ts`.

### Auth y usuarios

| Operación | Variables | Descripción |
|---|---|---|
| `LOGIN` | `correo, password` | Devuelve JWT + rol + id_perfil |
| `REGISTRAR_ESTUDIANTE` | `input: CreateEstudianteInput!` | Registro público |
| `GET_PSICOLOGOS` | — | Lista completa con horarios |
| `GET_PSICOLOGOS_SLIM` | — | Solo id_psicologo (para stats) |
| `GET_ESTUDIANTES_SLIM` | — | Solo id_estudiante (para stats) |

### MFA

| Operación | Descripción |
|---|---|
| `GET_MFA_ESTADO` | Consulta si MFA está activo |
| `SETUP_MFA` | Genera QR + secreto TOTP |
| `HABILITAR_MFA(codigo)` | Activa MFA |
| `DESHABILITAR_MFA(codigo)` | Desactiva MFA |
| `VERIFICAR_MFA(codigo)` | Verificación puntual |
| `CAMBIAR_PASSWORD(input)` | Cambia contraseña + valida MFA obligatorio |

### Backup

| Operación | Descripción |
|---|---|
| `GET_BACKUPS` | Lista backups disponibles |
| `GET_BACKUP_CONFIG` | Config del automático |
| `CREAR_BACKUP(input)` | Backup manual con MFA |
| `RESTAURAR_BACKUP(input)` | Restaura con MFA |
| `CONFIGURAR_BACKUP_AUTO(input)` | Configura automático + ejecuta inicial |

### Citas, sesiones, historial

| Operación | Descripción |
|---|---|
| `GET_CITAS_ESTUDIANTE(id_estudiante)` | Citas del estudiante con filtros |
| `GET_AGENDA_PSICOLOGO(id_psicologo)` | Agenda del psicólogo |
| `AGENDAR_CITA(input)` | Agenda una cita (id_estudiante del JWT) |
| `CAMBIAR_ESTADO_CITA(id, input)` | Asistida / Cancelada |
| `REGISTRAR_SESION(input)` | Registra sesión y marca cita ASISTIDA |
| `GET_EXPEDIENTE(id_estudiante)` | Historial clínico completo |

---

## 15. Decisiones técnicas y bugs resueltos

### Bug 1 — Iconos invisibles en botones de acción (admin Psicólogos)

**Síntoma:** Los botones de editar y eliminar aparecían sin ícono.

**Causa:** Lucide React renderiza SVG con `stroke="currentColor"`. Los elementos `<button>` sin `type="button"` y sin `color` explícito pueden heredar un color sobreescrito por resets del navegador, haciendo el stroke invisible.

**Solución:** Tres capas de fix:
```css
/* CSS Module */
.iconBtn { color: var(--cream-dim) !important; padding: 0; line-height: 0; }
.iconBtn svg { stroke: currentColor; fill: none; }
```
```tsx
{/* TSX */}
<button type="button" style={{ color: 'var(--cream-dim)' }} className={styles.iconBtn}>
  <Edit2 size={15} strokeWidth={1.8} />
</button>
```

### Bug 2 — Stats del dashboard mostraban `—` fijo

**Causa:** Los valores eran literales hardcodeados, no había queries al backend.

**Solución:** Cada rol tiene su componente de stats propio (`AdminStats`, `PsicologoStats`, `EstudianteStats`) con sus queries correspondientes. Se usan queries "slim" para el conteo de psicólogos/estudiantes que solo piden el ID.

### Bug 3 — `TourStep` no exportable como valor en Vite ESM

**Síntoma:** `SyntaxError: The requested module does not provide an export named 'TourStep'`

**Causa:** `TourStep` es una interfaz TypeScript — solo existe en compilación, no en runtime. Vite ESM falla al intentar importarla como valor.

**Solución:**
```typescript
import { TOUR_STEPS } from './tourSteps';
import type { TourStep } from './tourSteps';   // ← import type
```

### Bug 4 — Campos opcionales enviados como `""`

**Síntoma:** El backend guardaba cadenas vacías en lugar de `NULL`.

**Solución:** Funciones `strip()` y `clean()` que convierten `""` a `undefined` antes de cada mutation.

### Bug 5 — Horarios con formato `"HH:MM"` en lugar de `"HH:MM:SS"`

**Solución:** Función `toTimeDB()` en `Horarios.tsx`:
```typescript
function toTimeDB(t: string): string {
  if (t.split(':').length === 2) return `${t}:00`;
  return t;
}
```

### Bug 6 — MFA con toggle opcional en cambio de contraseña

**Problema de seguridad:** La versión anterior tenía un botón "Mi cuenta tiene MFA activo" que el usuario podía ignorar. Esto permitía cambiar la contraseña de otra persona si se conocía la contraseña actual.

**Solución:** El código MFA es **siempre visible y requerido** en el modal de cambio de contraseña. El botón de envío queda deshabilitado hasta que el campo tenga exactamente 6 dígitos. No hay forma de omitirlo.

### Diseño del tour

El overlay usa un SVG posicionado con `position: fixed` que dibuja un rectángulo negro a pantalla completa con una máscara que crea el "hueco" sobre el elemento destacado. Se re-mide el elemento con `getBoundingClientRect()` en `useLayoutEffect` con un re-intento de 350ms para capturar posiciones después del scroll inicial. El viewport se escucha con `resize` para recalcular posiciones cuando el usuario cambia el tamaño de la ventana.

---

## 16. Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm install --legacy-peer-deps` | Instalar dependencias |
| `npm run dev` | Servidor de desarrollo en `localhost:5173` |
| `npm run build` | Compilar para producción en `dist/` |
| `npm run preview` | Previsualizar el build de producción |
| `npm run lint` | Ejecutar ESLint |