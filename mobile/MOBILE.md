# UniMente — App Móvil

Aplicación móvil del Portal de Bienestar Universitario.  
Stack: **React Native · Expo · Expo Router · Apollo Client · TypeScript**.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación](#2-instalación)
3. [Conectar con el backend](#3-conectar-con-el-backend)
4. [Iniciar la aplicación](#4-iniciar-la-aplicación)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Pantallas y navegación](#6-pantallas-y-navegación)
7. [Autenticación](#7-autenticación)
8. [Componentes reutilizables](#8-componentes-reutilizables)
9. [Módulo MFA](#9-módulo-mfa)
10. [Módulo de respaldos](#10-módulo-de-respaldos)
11. [Restauración de emergencia](#11-restauración-de-emergencia)
12. [Decisiones técnicas](#12-decisiones-técnicas)

---

## 1. Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| Expo CLI | `npm install -g expo-cli` |
| Expo Go (dispositivo) | App Store / Play Store |
| Backend UniMente | Corriendo (ver README.md) |

Para compilar para iOS se necesita macOS + Xcode.  
Para compilar para Android se necesita Android Studio + SDK.

---

## 2. Instalación

```bash
cd uni-mente/mobile
npm install
```

Paquetes clave instalados:

| Paquete | Uso |
|---|---|
| `expo-router` | Navegación basada en archivos (como Next.js) |
| `@apollo/client` | Comunicación GraphQL |
| `@react-native-async-storage/async-storage` | Persistencia del token JWT |
| `lucide-react-native` | Iconos (mismo set que la web) |
| `expo-image` | Renderizar QR del MFA |
| `expo-clipboard` | Copiar secreto TOTP |
| `expo-file-system` + `expo-sharing` | Descargar y compartir backups |
| `react-native-safe-area-context` | Márgenes seguros en notch/island |

---

## 3. Conectar con el backend

Edita `constants/api.ts`:

```typescript
// iOS Simulator — usar localhost directamente
export const API_URL      = 'http://localhost:3000/graphql';
export const API_REST_URL = 'http://localhost:3000';

// Android Emulator — el emulador usa 10.0.2.2 para referirse al host
export const API_URL      = 'http://10.0.2.2:3000/graphql';
export const API_REST_URL = 'http://10.0.2.2:3000';

// Dispositivo físico en la misma red WiFi
export const API_URL      = 'http://192.168.x.x:3000/graphql';
export const API_REST_URL = 'http://192.168.x.x:3000';
```

---

## 4. Iniciar la aplicación

```bash
# En el dispositivo con Expo Go (escanea el QR)
npm start

# Solo Android
npm run android

# Solo iOS (requiere macOS)
npm run ios
```

Expo Go: https://expo.dev/go

---

## 5. Estructura del proyecto

```
mobile/
├── app/
│   ├── _layout.tsx              # Root: ApolloProvider + AuthProvider + SafeAreaProvider
│   ├── index.tsx                # Redirect según rol y estado de auth
│   ├── emergency-restore.tsx    # Pantalla pública — restauración sin login
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx            # Login + modal cambio de contraseña con MFA
│   │   └── registro.tsx         # Registro de estudiante
│   │
│   ├── (tabs)/                  # Estudiante y Psicólogo
│   │   ├── _layout.tsx          # Tab bar inferior
│   │   ├── dashboard.tsx        # Stats en tiempo real
│   │   ├── psicologos.tsx       # Buscar + agendar cita
│   │   ├── mis-citas.tsx        # Citas con filtros (solo estudiante)
│   │   ├── agenda.tsx           # Agenda + sesiones (solo psicólogo)
│   │   └── horarios.tsx         # CRUD horarios (solo psicólogo)
│   │
│   └── (admin)/                 # Solo administrador
│       ├── _layout.tsx          # Tab bar inferior
│       ├── dashboard.tsx        # Stats + acciones rápidas
│       ├── psicologos.tsx       # CRUD psicólogos
│       ├── backup.tsx           # Respaldos con MFA
│       └── mfa.tsx              # Configurar TOTP
│
├── components/
│   └── UI.tsx                   # Button, Card, Alert, Badge, Modal, Input, etc.
│
├── constants/
│   ├── colors.ts                # Tokens de diseño (mismos que la web)
│   └── api.ts                   # URL del backend
│
├── contexts/
│   └── AuthContext.tsx          # Usuario + AsyncStorage
│
├── graphql/
│   ├── client.ts                # Apollo Client con authLink + errorLink
│   └── operations.ts            # Todas las queries y mutations
│
├── package.json
└── MOBILE.md
```

---

## 6. Pantallas y navegación

Expo Router usa el sistema de archivos como rutas — igual que Next.js pero para móvil.

### Flujo de navegación

```
app/index.tsx
├── Sin usuario → /(auth)/login
├── Rol admin   → /(admin)/dashboard
└── Otro rol    → /(tabs)/dashboard
```

### Grupos de rutas

| Grupo | Pantallas | Acceso |
|---|---|---|
| `(auth)` | login, registro | Público |
| `(tabs)` | dashboard, psicologos, mis-citas, agenda, horarios | Estudiante / Psicólogo |
| `(admin)` | dashboard, psicologos, backup, mfa | Solo administrador |
| Raíz | emergency-restore | Público |

### Tabs por rol

**Estudiante:**
```
Inicio | Psicólogos | Mis Citas
```

**Psicólogo:**
```
Inicio | Psicólogos | Agenda | Horarios
```

**Administrador:**
```
Inicio | Psicólogos | Respaldos | Seguridad
```

---

## 7. Autenticación

El token JWT se persiste en `AsyncStorage` con la clave `auth_user`:

```typescript
interface AuthUser {
  token:     string;
  rol:       'administrador' | 'psicologo' | 'estudiante';
  nombre:    string;
  correo:    string;
  id_perfil?: number;
}
```

Apollo Client adjunta el token en cada request:

```typescript
const authLink = setContext(async (_, { headers }) => {
  const raw   = await AsyncStorage.getItem('auth_user');
  const token = raw ? JSON.parse(raw).token : null;
  return { headers: { ...headers, authorization: token ? `Bearer ${token}` : '' } };
});
```

### Cambio de contraseña

Botón en la pantalla de login → modal que solicita:

1. Correo de la cuenta
2. Contraseña actual
3. Nueva contraseña (mínimo 8 caracteres)
4. **Código MFA de 6 dígitos — siempre obligatorio**

---

## 8. Componentes reutilizables

Todos en `components/UI.tsx`. Diseñados para React Native con los mismos tokens de color que la versión web.

| Componente | Props principales |
|---|---|
| `Button` | `onPress`, `variant`, `loading`, `disabled`, `icon`, `size` |
| `Card` | `children`, `style` |
| `Alert` | `message`, `type` (error/success/warning) |
| `Badge` | `label`, `variant` (teal/gray/yellow/green/red) |
| `Spinner` | `size` |
| `EmptyState` | `icon`, `title`, `description` |
| `Field` | `label`, `error`, `children` |
| `Input` | Todos los props de `TextInput` + estilos base |
| `Modal` | `open`, `onClose`, `title`, `children` |
| `SectionHeader` | `title`, `count` |
| `PageHeader` | `title`, `subtitle` |
| `StatCard` | `icon`, `label`, `value` |

---

## 9. Módulo MFA

Pantalla `(admin)/mfa.tsx`. Misma funcionalidad que la web.

### Activar MFA

```
1. Toca "Activar MFA"
2. Backend genera secreto TOTP + QR (PNG base64)
3. expo-image renderiza el QR
4. Usuario escanea con Google/Microsoft Authenticator
5. Ingresa código de 6 dígitos para confirmar
6. MFA activo
```

El secreto base32 se puede copiar al portapapeles con `expo-clipboard` para ingreso manual en la app autenticadora.

### Código MFA en backups

El modal de confirmación de backup tiene el campo MFA visible y obligatorio. El botón "Crear respaldo" permanece deshabilitado hasta que haya exactamente 6 dígitos. El error local se limpia al escribir en el campo.

---

## 10. Módulo de respaldos

Pantalla `(admin)/backup.tsx`.

### Crear backup

1. Seleccionar tipo (COMPLETO / DIFERENCIAL / INCREMENTAL)
2. Seleccionar formato (SQL / JSON / EXCEL / CSV)
3. Tocar "Crear respaldo" → modal de confirmación con código MFA
4. Ingresar 6 dígitos → confirmar

### Descargar backup

Botón de descarga en cada fila. Usa `expo-file-system` para descargar el archivo con el JWT en el header y `expo-sharing` para abrir el menú de compartir nativo del dispositivo (guardar, enviar por correo, etc.).

```typescript
const dl = await FileSystem.downloadAsync(url, dest, {
  headers: { Authorization: `Bearer ${token}` },
});
await Sharing.shareAsync(dl.uri);
```

### Restaurar backup

Modal de confirmación con código MFA de 6 dígitos obligatorio.

### Backup automático

La configuración del backup automático se realiza desde la versión web (`/admin/backup`). La app móvil muestra el estado de la configuración pero no permite modificarla.

---

## 11. Restauración de emergencia

Pantalla pública `app/emergency-restore.tsx`. Accesible desde el botón en la pantalla de login.

### Protocolo

```
1. Tocar "Restauración de emergencia" en el login
2. Ver la lista de backups disponibles (cargada automáticamente)
3. Seleccionar el backup a restaurar
4. Ingresar RESTORE_SECRET del .env del servidor
5. Confirmar → backend ejecuta init.sql + restaura
6. Redirección automática a /login tras 2.5 segundos
```

### Condiciones de activación

Igual que en la web — solo funciona cuando `Usuario` tiene 0 registros y la clave coincide con `RESTORE_SECRET` en el `.env` del servidor.

---

## 12. Decisiones técnicas

### Expo Router vs React Navigation

Expo Router (basado en React Navigation) permite definir rutas por archivos como Next.js. Cada archivo en `app/` es una ruta automáticamente. Los grupos `(auth)`, `(tabs)` y `(admin)` agrupan pantallas sin afectar la URL.

### AsyncStorage en lugar de localStorage

React Native no tiene `localStorage`. Se usa `@react-native-async-storage/async-storage` que es asíncrono — por eso `AuthContext` tiene un estado `loading: true` inicial mientras lee el storage.

### expo-image para el QR

`expo-image` es más eficiente que `<Image>` de React Native para renderizar imágenes base64 (el QR del MFA viene como PNG en base64 del backend).

### expo-file-system + expo-sharing para descargas

Los navegadores pueden hacer `URL.createObjectURL(blob)` pero React Native no tiene DOM. La alternativa nativa es descargar el archivo a `FileSystem.documentDirectory` y luego abrir el menú de compartir con `Sharing.shareAsync()` — permite al usuario guardarlo en Archivos, enviarlo por correo, etc.

### Navegación condicional por rol en tabs

El layout de `(tabs)` oculta las tabs que no corresponden al rol actual usando `href: null`. La tab "Mis Citas" solo se muestra a estudiantes; "Agenda" y "Horarios" solo a psicólogos.

### Iconos: lucide-react-native

Mismo paquete de iconos que la web (`lucide-react`) pero con el sufijo `-native` para React Native. La API es idéntica — mismos nombres de componentes, mismas props `size`, `color`, `strokeWidth`.