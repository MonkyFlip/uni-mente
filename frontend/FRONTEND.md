# UniMente — Frontend

Interfaz de usuario del Portal de Bienestar Universitario.  
Stack: **React 18 · TypeScript · Apollo Client · React Router · CSS Modules**.

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
9. [Componentes reutilizables](#9-componentes-reutilizables)  
10. [Operaciones GraphQL](#10-operaciones-graphql)  
11. [Decisiones técnicas y bugs resueltos](#11-decisiones-técnicas-y-bugs-resueltos)  
12. [Scripts disponibles](#12-scripts-disponibles)  

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
npm install
```

---

## 3. Variables de entorno

Crea el archivo `.env` en `frontend/`:

```env
VITE_API_URL=http://localhost:3000/graphql
```

Si no se crea el archivo, Apollo Client apunta por defecto a `http://localhost:3000/graphql` según la configuración en `src/apollo/client.ts`.

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
│   ├── main.tsx                     # Entry point
│   ├── App.tsx                      # Router + providers
│   ├── index.css                    # Variables CSS globales (tokens de diseño)
│   │
│   ├── apollo/
│   │   └── client.ts                # Apollo Client con auth link + error link
│   │
│   ├── auth/
│   │   ├── AuthContext.tsx          # Contexto global de usuario autenticado
│   │   ├── ProtectedRoute.tsx       # Guard de rutas por rol
│   │   └── ThemeContext.tsx         # Tema claro/oscuro
│   │
│   ├── components/
│   │   ├── UI.tsx                   # Componentes base: Button, Card, Modal...
│   │   ├── UI.module.css
│   │   ├── Layout.tsx               # Layout general con Sidebar
│   │   ├── Layout.module.css
│   │   ├── Sidebar.tsx              # Navegación lateral según rol
│   │   ├── Sidebar.module.css
│   │   ├── DatePicker.tsx           # Selector de fecha con día de semana forzado
│   │   ├── DatePicker.module.css
│   │   ├── TimePicker.tsx           # Selector de hora HH:MM
│   │   └── TimePicker.module.css
│   │
│   ├── graphql/
│   │   └── operations.ts            # Todas las queries y mutations GraphQL
│   │
│   └── pages/
│       ├── Login.tsx
│       ├── Login.module.css
│       ├── Registro.tsx             # Registro de estudiante
│       ├── Registro.module.css
│       ├── Dashboard.tsx            # Dashboard según rol
│       ├── Dashboard.module.css
│       ├── admin/
│       │   ├── Psicologos.tsx       # CRUD de psicólogos (admin)
│       │   ├── Psicologos.module.css
│       │   ├── RegistrarPsicologo.tsx
│       │   └── RegistrarPsicologo.module.css
│       ├── estudiante/
│       │   ├── Psicologos.tsx       # Buscar y agendar cita
│       │   ├── Psicologos.module.css
│       │   ├── MisCitas.tsx         # Ver y cancelar citas
│       │   └── MisCitas.module.css
│       └── psicologo/
│           ├── Agenda.tsx           # Gestionar citas del día
│           ├── Agenda.module.css
│           ├── Horarios.tsx         # CRUD de horarios de disponibilidad
│           └── Horarios.module.css
│
├── .env
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Páginas y rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | → Redirige a `/login` | Público |
| `/login` | Login | Público |
| `/registro` | Registro de estudiante | Público |
| `/dashboard` | Dashboard según rol | Autenticado |
| `/psicologos` | Lista de psicólogos con agenda | Autenticado |
| `/mis-citas` | Mis citas (ver y cancelar) | Solo estudiante |
| `/agenda` | Agenda del psicólogo | Solo psicólogo |
| `/horarios` | Gestión de horarios | Solo psicólogo |
| `/admin/psicologos` | CRUD de psicólogos | Solo administrador |
| `/registrar-psicologo` | Formulario rápido de registro | Solo administrador |
| `/*` | → Redirige a `/dashboard` | — |

### Guard de rutas por rol

```tsx
// Ruta solo para psicólogos
<Route path="/agenda" element={
  <ProtectedRoute roles={['psicologo']}>
    <Agenda />
  </ProtectedRoute>
} />
```

Si el usuario no tiene el rol requerido, es redirigido a `/dashboard`.

---

## 7. Autenticación y contexto global

### AuthContext

Almacena el usuario en `localStorage` para persistir la sesión entre recargas:

```typescript
interface User {
  nombre: string;
  correo: string;
  rol: 'administrador' | 'psicologo' | 'estudiante';
  token: string;
  id_perfil?: number;  // id_estudiante o id_psicologo según rol
}
```

### Flujo de login

```
Usuario envía credenciales
  → useMutation(LOGIN)
  → backend devuelve { access_token, rol, nombre, correo, id_perfil }
  → login() guarda en localStorage y AuthContext
  → navigate('/dashboard')
```

### Logout

```typescript
const { logout } = useAuth();
logout(); // limpia localStorage y redirige a /login
```

---

## 8. Apollo Client

`src/apollo/client.ts` configura tres links encadenados:

**errorLink** — detecta errores `Unauthorized` y redirige al login:
```typescript
const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors?.some(e => e.message === 'Unauthorized')) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
});
```

**authLink** — adjunta el JWT a cada petición:
```typescript
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return { headers: { ...headers, authorization: token ? `Bearer ${token}` : '' } };
});
```

**httpLink** — apunta al endpoint GraphQL:
```typescript
const httpLink = createHttpLink({ uri: 'http://localhost:3000/graphql' });
```

La caché usa `fetchPolicy: 'cache-and-network'` como defecto para que los datos siempre estén actualizados.

---

## 9. Componentes reutilizables

### `UI.tsx`

| Componente | Props principales | Descripción |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `icon` | Botón con estados de carga |
| `Card` | `hoverable` | Tarjeta con sombra y border |
| `Modal` | `open`, `onClose`, `title` | Diálogo centrado con overlay |
| `Field` | `label` | Wrapper de campo de formulario |
| `Alert` | `message`, `type` | Mensaje de éxito o error |
| `Badge` | `label`, `variant` | Etiqueta de estado |
| `Spinner` | `size` | Indicador de carga |
| `EmptyState` | `icon`, `title`, `description` | Estado vacío de listas |
| `PageHeader` | `title`, `subtitle`, `action` | Cabecera de página |
| `StatCard` | `icon`, `label`, `value` | Tarjeta de estadística en dashboard |

### `DatePicker.tsx`

Selector de fecha que filtra solo los días de la semana permitidos. Utilizado al agendar citas para que el estudiante solo pueda elegir fechas que coincidan con el día del horario seleccionado.

```tsx
<DatePicker
  value={fecha}
  onChange={setFecha}
  min="2026-03-07"
  diaPermitido={1}  // 0=Dom, 1=Lun, ..., 6=Sab
/>
```

### `TimePicker.tsx`

Selector de hora en formato `HH:MM`. Devuelve el valor como string, que luego el formulario convierte a `HH:MM:SS` antes de enviarlo al backend.

---

## 10. Operaciones GraphQL

Todas las queries y mutations están centralizadas en `src/graphql/operations.ts`.

### Queries

| Nombre | Variables | Descripción |
|---|---|---|
| `GET_PSICOLOGOS` | — | Lista todos los psicólogos con horarios |
| `GET_CITAS_ESTUDIANTE` | `id_estudiante: Int!` | Citas del estudiante |
| `GET_AGENDA_PSICOLOGO` | `id_psicologo: Int!` | Agenda del psicólogo |
| `GET_EXPEDIENTE` | `id_estudiante: Int!` | Historial clínico del estudiante |

### Mutations

| Nombre | Variables | Descripción |
|---|---|---|
| `LOGIN` | `correo, password` | Autenticación, devuelve JWT |
| `REGISTRAR_ESTUDIANTE` | `input: CreateEstudianteInput!` | Registro de estudiante |
| `REGISTRAR_PSICOLOGO` | `input: CreatePsicologoInput!` | Solo admin |
| `ACTUALIZAR_PSICOLOGO` | `id: Int!, input: UpdatePsicologoInput!` | Solo admin |
| `CREAR_HORARIO` | `input: CreateHorarioInput!` | Solo psicólogo |
| `ELIMINAR_HORARIO` | `id: Int!` | Solo psicólogo |
| `AGENDAR_CITA` | `input: CreateCitaInput!` | Solo estudiante |
| `CAMBIAR_ESTADO_CITA` | `id_cita: Int!, input: UpdateEstadoCitaInput!` | Psicólogo o estudiante |
| `REGISTRAR_SESION` | `input: CreateSesionInput!` | Solo psicólogo |

---

## 11. Decisiones técnicas y bugs resueltos

### Bug 1 — Campos opcionales enviados como `""`

**Síntoma:** El backend rechazaba mutaciones o guardaba cadenas vacías en columnas opcionales.

**Causa:** Los formularios inicializaban todos los campos con `""`. Al enviar el input completo, campos como `matricula`, `carrera` o `telefono` llegaban como `""` al backend, que los guardaba como cadenas vacías en lugar de `NULL`.

**Solución — función `strip()` en Registro y `clean()` en formularios admin:**

```typescript
// Convierte campos opcionales vacíos a undefined antes de enviar
function strip<T extends Record<string, any>>(obj: T, optionales: (keyof T)[]): T {
  const out = { ...obj };
  for (const k of optionales) {
    if (out[k] === '' || out[k] === null) out[k] = undefined as any;
  }
  return out;
}

// Uso en Registro.tsx
const input = strip(form, ['matricula', 'carrera', 'telefono']);
registrar({ variables: { input } });
```

```typescript
// Elimina TODAS las claves vacías del objeto
function clean<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (obj[k] !== '' && obj[k] !== null && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// Uso en admin/Psicologos.tsx al editar
const input = clean(editForm); // solo envía los campos con dato real
actualizar({ variables: { id: editTarget.id_psicologo, input } });
```

### Bug 2 — Horarios con formato `"HH:MM"` en lugar de `"HH:MM:SS"`

**Síntoma:** MySQL rechazaba el valor de `hora_inicio` o lo guardaba incorrectamente.

**Causa:** El `TimePicker` devuelve el valor en formato `HH:MM` (sin segundos), pero la columna `TIME` de MySQL espera `HH:MM:SS`.

**Solución — función `toTimeDB()` en `Horarios.tsx`:**

```typescript
function toTimeDB(t: string): string {
  if (!t) return '00:00:00';
  const parts = t.split(':');
  if (parts.length === 3) return t;         // ya tiene segundos
  if (parts.length === 2) return `${t}:00`; // agregar :00
  return `${t}:00:00`;
}

// Antes de la mutation:
const inicio = toTimeDB(form.hora_inicio); // "09:00" → "09:00:00"
const fin    = toTimeDB(form.hora_fin);    // "10:00" → "10:00:00"
```

Además se agregó validación que `hora_inicio < hora_fin` con mensaje de error al usuario.

### Bug 3 — `id_psicologo` e `id_horario` podían ser `undefined` al agendar

**Síntoma:** La mutation `agendarCita` se disparaba sin los IDs necesarios, enviando `null` al backend.

**Causa:** Los estados `selected` y `horarioSel` son `any | null` y no había verificación antes de la mutation.

**Solución — guards explícitos en `handleAgendar` y en el `disabled` del botón:**

```typescript
const handleAgendar = (e: React.FormEvent) => {
  e.preventDefault();
  if (!horarioSel || !fecha) return;
  if (!fechaValidaParaDia(fecha, horarioSel.dia_semana)) return;
  if (!selected?.id_psicologo || !horarioSel?.id_horario) return; // guard

  const input: Record<string, any> = {
    id_psicologo: selected.id_psicologo,   // número garantizado
    id_horario:   horarioSel.id_horario,   // número garantizado
    fecha,
  };
  if (motivo.trim()) input.motivo = motivo.trim(); // solo si tiene contenido
  agendar({ variables: { input } });
};
```

```tsx
<Button
  disabled={
    !horarioSel ||
    !fecha ||
    !fechaValidaParaDia(fecha, horarioSel?.dia_semana) ||
    !selected?.id_psicologo ||    // deshabilita si no hay IDs
    !horarioSel?.id_horario
  }
>
  Confirmar cita
</Button>
```

### Bug 4 — `motivo` enviado como `""` al no escribir nada

**Síntoma:** El campo `motivo` llegaba como `""` al backend en lugar de no llegar.

**Causa:** El estado `motivo` inicializa en `""` y el input se incluía en el objeto sin verificar si tenía contenido.

**Solución:** Solo incluir `motivo` en el input si `motivo.trim()` tiene longitud:
```typescript
if (motivo.trim()) input.motivo = motivo.trim();
```

---

## 12. Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm install` | Instalar dependencias (primera vez) |
| `npm run dev` | Servidor de desarrollo en `localhost:5173` |
| `npm run build` | Compilar para producción en `dist/` |
| `npm run preview` | Previsualizar el build de producción |
| `npm run lint` | Ejecutar ESLint |