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
10. [Componentes reutilizables y paginación](#10-componentes-reutilizables-y-paginación)
11. [Módulo MFA](#11-módulo-mfa)
12. [Módulo de respaldos](#12-módulo-de-respaldos)
13. [Restauración de emergencia](#13-restauración-de-emergencia)
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

Opcional — Apollo Client apunta a `localhost:3000` por defecto:

```env
VITE_API_URL=http://localhost:3000/graphql
```

---

## 4. Iniciar la aplicación

```bash
npm run dev       # Desarrollo → http://localhost:5173
npm run build     # Producción → dist/
npm run preview   # Previsualizar build
```

---

## 5. Estructura del proyecto

```
frontend/src/
├── App.tsx                           # Router + providers + TourProvider
├── index.css                         # Variables CSS globales (tokens de diseño)
│
├── apollo/
│   └── client.ts                     # errorLink + authLink + httpLink
│
├── auth/
│   ├── AuthContext.tsx               # User en localStorage, login/logout
│   ├── ProtectedRoute.tsx            # Guard por rol
│   └── ThemeContext.tsx              # 6 paletas de colores
│
├── tours/
│   ├── tourSteps.ts                  # Pasos por rol (7 pasos cada uno)
│   ├── TourContext.tsx               # Estado + localStorage por rol
│   ├── Tour.tsx                      # Overlay SVG + tooltip animado
│   └── Tour.module.css
│
├── components/
│   ├── UI.tsx                        # Button, Card, Modal, Badge,
│   │                                 # Pagination, usePagination, StatCard...
│   ├── UI.module.css
│   ├── Layout.tsx / Layout.module.css
│   ├── Sidebar.tsx                   # Nav + botón Guía + links Backup/MFA
│   ├── Sidebar.module.css
│   ├── DatePicker.tsx                # Selector de fecha con día de semana forzado
│   └── TimePicker.tsx                # Selector HH:MM → backend recibe HH:MM:SS
│
├── graphql/
│   └── operations.ts                 # Todas las queries y mutations
│
└── pages/
    ├── Login.tsx                     # Login + modal cambio contraseña con MFA
    ├── CambiarPassword.module.css
    ├── Login.module.css
    ├── Registro.tsx
    ├── Dashboard.tsx                 # Stats reales por rol vía Apollo
    │
    ├── admin/
    │   ├── Psicologos.tsx            # CRUD paginado (9/página)
    │   ├── RegistrarPsicologo.tsx
    │   ├── Backup.tsx                # Modal MFA antes de crear backup
    │   ├── MfaConfig.tsx             # Activar/desactivar TOTP, nota sobre pwd
    │   └── EmergencyRestore.tsx      # Panel público para BD vacía
    │
    ├── estudiante/
    │   ├── Psicologos.tsx            # Búsqueda + agendar (6/página)
    │   └── MisCitas.tsx              # Filtros + paginación (10/página)
    │
    └── psicologo/
        ├── Agenda.tsx                # Próximas (8/pág) + Historial (10/pág)
        └── Horarios.tsx
```

---

## 6. Páginas y rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | → `/login` | Público |
| `/login` | Login + cambio contraseña | Público |
| `/registro` | Registro de estudiante | Público |
| `/emergency-restore` | Restauración de emergencia | Público |
| `/dashboard` | Stats en tiempo real | Autenticado |
| `/psicologos` | Lista con paginación | Autenticado |
| `/mis-citas` | Filtros + paginación | Solo estudiante |
| `/agenda` | Dos secciones paginadas | Solo psicólogo |
| `/horarios` | CRUD de disponibilidad | Solo psicólogo |
| `/admin/psicologos` | CRUD paginado | Solo administrador |
| `/registrar-psicologo` | Formulario rápido | Solo administrador |
| `/admin/backup` | Dashboard de respaldos | Solo administrador |
| `/admin/mfa` | Configurar TOTP | Todos (autenticado) |
| `/*` | → `/dashboard` | — |

---

## 7. Autenticación y contexto global

### Estructura del usuario

```typescript
interface User {
  nombre:    string;
  correo:    string;
  rol:       'administrador' | 'psicologo' | 'estudiante';
  token:     string;
  id_perfil?: number;  // id_estudiante o id_psicologo según rol
}
```

Persiste en `localStorage` para sobrevivir recargas.

### Cambio de contraseña (desde Login)

El botón "Cambiar contraseña" abre un modal que requiere:

1. Correo de la cuenta
2. Contraseña actual
3. Nueva contraseña (mínimo 8 caracteres)
4. **Código MFA de 6 dígitos — siempre obligatorio, sin excepción**

El botón "Actualizar contraseña" permanece deshabilitado hasta que los 6 dígitos estén completos. No hay forma de omitir el paso de MFA — esto previene que alguien con acceso al dispositivo cambie la contraseña sin autorización del dueño de la cuenta.

---

## 8. Apollo Client

`src/apollo/client.ts` encadena tres links:

**errorLink** — detecta `Unauthorized` y redirige a `/login` limpiando `localStorage`.

**authLink** — adjunta JWT:
```typescript
authorization: token ? `Bearer ${token}` : ''
```

**httpLink** — `http://localhost:3000/graphql`.

Caché con `fetchPolicy: 'cache-and-network'` global.

---

## 9. Guía interactiva del sistema

### Comportamiento

Al iniciar sesión por primera vez, se activa automáticamente una guía que:
- Muestra overlay oscuro con recorte SVG sobre el elemento resaltado
- Tooltip animado con título, descripción y barra de progreso de pasos
- Al completarse o saltarse, guarda `unimente_tour_v1_{rol}` en `localStorage`
- El botón **"Guía del sistema"** (icono `HelpCircle`) en la barra lateral la relanza en cualquier momento

### Pasos por rol

| Rol | Pasos | Cubre |
|---|---|---|
| Estudiante | 7 | Dashboard, psicólogos, mis citas, stats, acciones, tema |
| Psicólogo | 7 | Dashboard, agenda, horarios, stats, acciones, tema |
| Administrador | 7 | Dashboard, psicólogos, stats, respaldos, MFA, tema |

### Atributos `data-tour`

Los elementos del DOM con `data-tour` son los objetivos del tour:
```
sidebar-brand    nav-dashboard    nav-psicologos    nav-mis-citas
nav-agenda       nav-horarios     nav-backup        nav-mfa
tour-stats       tour-actions     sidebar-theme
```

### Nota técnica — `import type`

```typescript
import { TOUR_STEPS } from './tourSteps';
import type { TourStep } from './tourSteps';  // obligatorio
```

Vite ESM no puede importar interfaces TypeScript como valores. Sin `import type`, lanza `SyntaxError: does not provide an export named 'TourStep'` en runtime.

---

## 10. Componentes reutilizables y paginación

### `UI.tsx` — componentes base

| Componente | Props | Descripción |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `icon` | Con estados de carga |
| `Card` | `hoverable` | Tarjeta con borde |
| `Modal` | `open`, `onClose`, `title` | Diálogo con overlay |
| `Field` | `label`, `error` | Wrapper de campo |
| `Alert` | `message`, `type` | Error o éxito |
| `Badge` | `label`, `variant` | Etiqueta coloreada |
| `Spinner` | `size` | Indicador de carga |
| `EmptyState` | `icon`, `title`, `description` | Estado vacío |
| `PageHeader` | `title`, `subtitle`, `action` | Cabecera |
| `StatCard` | `icon`, `label`, `value` | Métrica de dashboard |
| `Pagination` | `total`, `page`, `pageSize`, `onChange` | Con ellipsis |

### `usePagination<T>` hook

```typescript
const { page, setPage, slice, total, pageSize } = usePagination(items, pageSize);
```

- `slice` → elementos de la página actual
- `setPage(1)` al filtrar para volver a la primera página
- Hace scroll al top automáticamente al cambiar de página

### Paginación por vista

| Vista | Por página | Notas |
|---|---|---|
| Admin Psicólogos | 9 | Reset al buscar |
| Estudiante Psicólogos | 6 | Reset al buscar |
| Mis Citas | 10 | Filtros de estado con conteo + reset |
| Agenda Próximas | 8 | Independiente de Historial |
| Agenda Historial | 10 | Independiente de Próximas |

### `DatePicker.tsx`

Bloquea días de la semana no permitidos. Al agendar, el estudiante solo puede seleccionar fechas del día de semana del horario elegido.

### `TimePicker.tsx`

Devuelve `HH:MM`. La función `toTimeDB()` en `Horarios.tsx` lo convierte a `HH:MM:SS` antes de enviar al backend:
```typescript
function toTimeDB(t: string): string {
  return t.split(':').length === 2 ? `${t}:00` : t;
}
```

---

## 11. Módulo MFA

### Página `/admin/mfa`

Accesible para cualquier usuario autenticado.

**Activar MFA (2 pasos):**
```
1. Clic "Activar MFA"
   → backend genera secreto TOTP
   → frontend recibe qr_code (PNG base64) + secret (base32)
2. Usuario escanea QR con Google/Microsoft Authenticator
3. Ingresa código de 6 dígitos para confirmar
4. MFA activo
```

**Desactivar MFA:** Requiere un código válido de la app para confirmar.

**Nota sobre cambio de contraseña:** La página MFA informa que el cambio de contraseña se realiza desde el login. No incluye formulario de contraseña propio.

### Error de MFA en modales — manejo de estado

Los modales de backup y restauración usan estado local `backupError` en lugar del `error` del hook de Apollo. Esto permite limpiar el mensaje de error al instante cuando el usuario modifica el código, sin esperar a que la mutation vuelva a ejecutarse.

```typescript
const [backupError, setBackupError] = useState('');

onChange={e => {
  setConfirmMfa(e.target.value.replace(/\D/g, ''));
  setBackupError('');  // limpia el error al escribir
}}
```

---

## 12. Módulo de respaldos

### Página `/admin/backup`

Solo para administradores con MFA activo y configurado.

### Crear backup manual

1. Seleccionar tipo y formato en la página
2. Clic en "Crear respaldo" → **abre modal de confirmación**
3. El modal muestra resumen (tipo, formato, descripción)
4. Campo MFA grande y prominente (6 dígitos, obligatorio)
5. Botón "Crear respaldo" deshabilitado hasta completar 6 dígitos

### Restaurar backup

Botón "Restaurar" en cada fila abre modal de confirmación con:
- Aviso de impacto (COMPLETO borra todo / parciales actualizan)
- Campo MFA obligatorio de 6 dígitos

### Backup automático

- Clic "Configurar automático" → modal con tipo, formato, frecuencia y MFA
- Al guardar se ejecuta un backup inmediato
- Scheduler verifica cada hora (`@Cron(EVERY_HOUR)`)

---

## 13. Restauración de emergencia

### Página `/emergency-restore`

Pública — sin login, sin JWT. Para usar cuando la BD está vacía.

### Flujo

```
1. Abrir http://localhost:5173/emergency-restore
2. Ingresar RESTORE_SECRET del archivo .env del servidor
3. Ingresar ID del backup O nombre del archivo (están en backend/Backup/)
4. Clic "Restaurar base de datos"
5. El backend verifica BD vacía + clave secreta → restaura
6. Ir a /login con las credenciales normales
```

El formulario tiene:
- Campo de clave secreta con toggle mostrar/ocultar
- Campo de ID numérico del backup
- Campo alternativo de nombre de archivo
- Mensajes de error/éxito claros
- Botón deshabilitado durante la operación

---

## 14. Operaciones GraphQL

Centralizadas en `src/graphql/operations.ts`.

### Auth y stats

| Operación | Descripción |
|---|---|
| `LOGIN` | Devuelve JWT + rol + id_perfil |
| `REGISTRAR_ESTUDIANTE` | Registro público |
| `GET_PSICOLOGOS` | Lista completa con horarios |
| `GET_PSICOLOGOS_SLIM` | Solo id (para conteo en dashboard) |
| `GET_ESTUDIANTES_SLIM` | Solo id (para conteo en dashboard) |

### MFA

| Operación | Descripción |
|---|---|
| `GET_MFA_ESTADO` | Consulta `mfa_enabled` |
| `SETUP_MFA` | Genera QR + secreto |
| `HABILITAR_MFA(codigo)` | Activa MFA |
| `DESHABILITAR_MFA(codigo)` | Desactiva MFA |
| `VERIFICAR_MFA(codigo)` | Verificación puntual |
| `CAMBIAR_PASSWORD(input)` | Cambia contraseña con MFA obligatorio |

### Backup

| Operación | Descripción |
|---|---|
| `GET_BACKUPS` | Lista hasta 3 backups |
| `GET_BACKUP_CONFIG` | Config del automático |
| `CREAR_BACKUP(input)` | Manual con MFA |
| `RESTAURAR_BACKUP(input)` | Con MFA |
| `CONFIGURAR_BACKUP_AUTO(input)` | Configura + ejecuta inicial |

### Citas y sesiones

| Operación | Descripción |
|---|---|
| `GET_CITAS_ESTUDIANTE(id)` | Citas del estudiante |
| `GET_AGENDA_PSICOLOGO(id)` | Agenda del psicólogo |
| `AGENDAR_CITA(input)` | id_estudiante del JWT |
| `CAMBIAR_ESTADO_CITA(id, input)` | ASISTIDA / CANCELADA |
| `REGISTRAR_SESION(input)` | Sesión + marca ASISTIDA |
| `GET_EXPEDIENTE(id)` | Historial clínico completo |

---

## 15. Decisiones técnicas y bugs resueltos

### Bug 1 — Iconos invisibles en botones (admin Psicólogos)

**Causa:** Lucide React usa `stroke="currentColor"`. Botones `<button>` sin `type="button"` y sin `color` explícito heredan un color sobreescrito por resets del navegador.

**Solución (3 capas):**
```css
.iconBtn { color: var(--cream-dim) !important; padding: 0; line-height: 0; }
.iconBtn svg { stroke: currentColor; fill: none; }
```
```tsx
<button type="button" style={{ color: 'var(--cream-dim)' }} className={styles.iconBtn}>
```

### Bug 2 — Stats del dashboard con `—` fijo

**Causa:** Valores hardcodeados, sin queries reales al backend.

**Solución:** Componentes `AdminStats`, `PsicologoStats`, `EstudianteStats` con sus propias queries. Las queries "slim" solo piden el ID para conteo eficiente.

### Bug 3 — `TourStep` no exportable en Vite ESM

**Causa:** Las interfaces TypeScript no existen en runtime. Importarlas como valor lanza `SyntaxError`.

**Solución:** `import type { TourStep } from './tourSteps'`

### Bug 4 — Campos opcionales enviados como `""`

**Causa:** Estados de formulario inicializados en `""` se enviaban directamente.

**Solución:** `strip()` y `clean()` convierten `""` a `undefined` antes de mutations.

### Bug 5 — Horarios sin `:00` de segundos

**Causa:** `TimePicker` devuelve `HH:MM`, la BD espera `HH:MM:SS`.

**Solución:** `toTimeDB()` en `Horarios.tsx`.

### Bug 6 — MFA opcional en cambio de contraseña (problema de seguridad)

**Versión anterior:** Toggle "Mi cuenta tiene MFA activo" — el usuario podía omitirlo.

**Problema:** Cualquier persona con la contraseña actual podía cambiarla sin MFA.

**Solución:** Código MFA siempre visible, siempre requerido. Botón deshabilitado hasta 6 dígitos completos.

### Bug 7 — Error de MFA persistía al corregir el código

**Causa:** `error` de `useMutation` de Apollo no se limpia al cambiar estados locales — solo cuando la mutation se vuelve a ejecutar exitosamente.

**Solución:** Estado local `backupError` que se limpia en `onChange` del input de código MFA.

### Bug 8 — TypeScript errors en Backup.tsx

Tres errores que impedían compilar:
1. `useCallback` importado pero sin usar → eliminado del import
2. `lC` (loading de config) desestructurado pero sin referenciar → eliminado
3. `Field` no acepta prop `style` → envuelto en `<div style={...}>` externo

---

## 16. Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm install --legacy-peer-deps` | Instalar dependencias |
| `npm run dev` | Desarrollo en `localhost:5173` |
| `npm run build` | Compilar a `dist/` |
| `npm run preview` | Previsualizar build |
| `npm run lint` | ESLint |