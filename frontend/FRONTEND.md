# 🖥️ UniMente — Frontend

SPA (Single Page Application) construida con **React 19 + Vite + Apollo Client** para la interfaz del sistema de citas psicológicas universitarias.

← [Volver al README principal](../README.md) | [Ver documentación del Backend](../backend/BACKEND.md)

---

## 📁 Estructura del proyecto

```
frontend/
├── src/
│   ├── apollo/
│   │   └── client.ts            # Apollo Client con JWT automático en headers
│   ├── auth/
│   │   ├── AuthContext.tsx      # Context de sesión (login/logout/user)
│   │   ├── ProtectedRoute.tsx   # HOC para rutas protegidas por rol
│   │   └── ThemeContext.tsx     # Context de temas de color (5 paletas)
│   ├── components/
│   │   ├── Layout.tsx           # Wrapper con sidebar
│   │   ├── Layout.module.css
│   │   ├── Sidebar.tsx          # Navegación lateral + selector de tema
│   │   ├── Sidebar.module.css
│   │   ├── UI.tsx               # Componentes reutilizables
│   │   └── UI.module.css
│   ├── graphql/
│   │   └── operations.ts        # Todas las queries y mutations
│   ├── pages/
│   │   ├── Login.tsx            # Pantalla de login (split-screen)
│   │   ├── Registro.tsx         # Registro público de estudiante
│   │   ├── Dashboard.tsx        # Bienvenida adaptada al rol
│   │   ├── admin/
│   │   │   └── RegistrarPsicologo.tsx
│   │   ├── estudiante/
│   │   │   ├── Psicologos.tsx   # Catálogo + agendar cita
│   │   │   └── MisCitas.tsx     # Historial de citas del estudiante
│   │   └── psicologo/
│   │       ├── Agenda.tsx       # Agenda + registrar sesiones
│   │       └── Horarios.tsx     # Gestión de disponibilidad
│   ├── App.tsx                  # Rutas y providers
│   ├── main.tsx                 # Entry point
│   └── index.css                # Variables CSS + tipografías + keyframes
├── vite.config.ts               # Config de Vite con optimizeDeps para Apollo
└── package.json
```

---

## ⚙️ Instalación

### Requisitos previos
- Node.js 18+
- Backend de UniMente corriendo en `http://localhost:3000`

### Instalar dependencias

> ⚠️ El proyecto usa React 19. Todos los paquetes requieren `--legacy-peer-deps`.

**Windows (PowerShell) / Linux / macOS**
```bash
npm install --legacy-peer-deps
```

### Instalar una dependencia nueva

**Windows (PowerShell)**
```powershell
npm install <paquete> --legacy-peer-deps
```

**Linux / macOS**
```bash
npm install <paquete> --legacy-peer-deps
```

### Configurar npm para no requerir el flag manualmente (solo este proyecto)

**Windows (PowerShell)**
```powershell
npm config set legacy-peer-deps true --location project
```

**Linux / macOS**
```bash
npm config set legacy-peer-deps true --location project
```

---

## 🚀 Ejecución

### Modo desarrollo (hot reload)

```bash
npm run dev
```

Abre: `http://localhost:5173`

### Compilar para producción

```bash
npm run build
```

### Vista previa del build de producción

**Windows (PowerShell)**
```powershell
npm run preview
```

**Linux / macOS**
```bash
npm run preview
```

### Limpiar caché de Vite

**Windows (PowerShell)**
```powershell
Remove-Item -Recurse -Force node_modules\.vite
```

**Linux / macOS**
```bash
rm -rf node_modules/.vite
```

---

## 📦 Dependencias principales

| Paquete | Versión | Uso |
|---|---|---|
| `react` | 19 | UI library |
| `react-dom` | 19 | Renderizado web |
| `react-router-dom` | 7 | Navegación SPA |
| `@apollo/client` | 3.x | Cliente GraphQL + cache |
| `graphql` | — | Parser GraphQL |
| `lucide-react` | — | Iconografía SVG |

---

## 🗺️ Rutas de la aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/login` | `Login` | Público |
| `/registro` | `Registro` | Público |
| `/dashboard` | `Dashboard` | Todos los roles |
| `/psicologos` | `Psicologos` | Todos los roles |
| `/mis-citas` | `MisCitas` | Solo estudiante |
| `/agenda` | `Agenda` | Solo psicólogo |
| `/horarios` | `Horarios` | Solo psicólogo |
| `/registrar-psicologo` | `RegistrarPsicologo` | Solo administrador |

---

## 🎨 Sistema de diseño

### Tipografías

| Fuente | Uso |
|---|---|
| **Playfair Display** | Títulos, headers, nombres de sección |
| **Outfit** | Cuerpo, UI, labels, botones |

Cargadas desde Google Fonts en `index.css`.

### Variables CSS principales

```css
--navy        /* Fondo base */
--navy-light  /* Sidebar y paneles */
--navy-card   /* Cards y modales */
--navy-hover  /* Estados hover */
--teal        /* Color de acento (cambia con el tema) */
--teal-glow   /* Fondo semitransparente del acento */
--cream       /* Texto principal */
--cream-dim   /* Texto secundario */
--border      /* Bordes sutiles */
--radius      /* Border radius estándar: 12px */
--radius-lg   /* Border radius grande: 18px */
--transition  /* Curva de transición global */
```

### Paletas de color disponibles

El sidebar incluye un botón **"Paleta"** que permite cambiar el tema en tiempo real. El tema se guarda en `localStorage` y persiste entre sesiones.

| ID | Nombre | Base | Acento |
|---|---|---|---|
| `navy` | Océano | `#0d1b2a` | `#0ab5a8` (teal) |
| `forest` | Bosque | `#0d1f16` | `#3ecf8e` (esmeralda) |
| `violet` | Violeta | `#130d2a` | `#a78bfa` (lavanda) |
| `crimson` | Rubí | `#1a0d0d` | `#f87171` (coral) |
| `amber` | Ámbar | `#1a1208` | `#fbbf24` (dorado) |

Para agregar un nuevo tema, añade una entrada en el array `THEMES` y en el objeto `THEME_VARS` dentro de `src/auth/ThemeContext.tsx`.

---

## 🧩 Componentes reutilizables (`UI.tsx`)

| Componente | Props | Descripción |
|---|---|---|
| `<Button>` | `variant`, `size`, `loading`, `icon` | Botón con estados de carga e iconos |
| `<Card>` | `hoverable`, `className` | Contenedor con borde y fondo |
| `<PageHeader>` | `title`, `subtitle`, `action` | Encabezado de página con acción opcional |
| `<Badge>` | `label`, `variant` | Etiqueta de estado (teal/yellow/green/red/gray) |
| `<Spinner>` | `size` | Ícono de carga animado |
| `<EmptyState>` | `icon`, `title`, `description` | Estado vacío con ícono y mensaje |
| `<Field>` | `label`, `error` | Wrapper de input con label y error |
| `<Alert>` | `message`, `type` | Alerta de éxito o error |
| `<Modal>` | `open`, `onClose`, `title` | Modal con backdrop blur |
| `<StatCard>` | `icon`, `label`, `value` | Tarjeta de métrica |

---

## 🔐 Autenticación

El contexto `AuthContext` guarda en `localStorage`:

```
token  → JWT Bearer para las requests de Apollo
user   → { nombre, rol, token }
theme  → ID del tema activo
```

El `ApolloClient` en `client.ts` inyecta automáticamente el token en cada request:

```ts
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return { headers: { ...headers, authorization: token ? `Bearer ${token}` : '' } };
});
```

Si el servidor responde con `Unauthorized`, el `errorLink` limpia la sesión y redirige a `/login` automáticamente.

---

## 📝 Notas de desarrollo

### IDs de perfil en localStorage

Algunas páginas requieren el `id_estudiante` o `id_psicologo` del usuario actual. Por ahora se guardan manualmente en `localStorage` tras el login. En la siguiente versión esto se resuelve decodificando el JWT o con una query `me`.

```
id_estudiante → usado en MisCitas.tsx
id_psicologo  → usado en Agenda.tsx y Horarios.tsx
```

### Módulos de Apollo disponibles sin instalar paquetes extra

`@apollo/client` ya incluye internamente:
- `@apollo/client/link/error` → `onError`
- `@apollo/client/link/context` → `setContext`
- `@apollo/client/react` → hooks (`useQuery`, `useMutation`, etc.)

---

## 🔮 Próximas funcionalidades sugeridas

- Query `me` para obtener el perfil completo al hacer login (eliminar dependencia de `localStorage` para IDs)
- Panel de estadísticas para el administrador
- Notificaciones en tiempo real con WebSockets
- Modo oscuro / claro por tema
- Vista de expediente completo para psicólogos
- Exportar historial clínico a PDF
