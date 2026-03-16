# UniMente — App Movil

Aplicacion movil del Portal de Bienestar Universitario.
Stack: **React Native 0.81 · Expo SDK 54 · Expo Router · Apollo Client · TypeScript**.

---

## Indice

1. [Requisitos](#1-requisitos)
2. [Instalacion](#2-instalacion)
3. [Conectar con el backend](#3-conectar-con-el-backend)
4. [Iniciar en desarrollo](#4-iniciar-en-desarrollo)
5. [Generar APK](#5-generar-apk)
6. [Estructura del proyecto](#6-estructura-del-proyecto)
7. [Pantallas y navegacion](#7-pantallas-y-navegacion)
8. [Autenticacion](#8-autenticacion)
9. [Componentes reutilizables](#9-componentes-reutilizables)
10. [Modulo MFA](#10-modulo-mfa)
11. [Modulo de respaldos](#11-modulo-de-respaldos)
12. [Paginacion y tiempo real](#12-paginacion-y-tiempo-real)
13. [Decisiones tecnicas](#13-decisiones-tecnicas)

---

## 1. Requisitos

| Herramienta | Version requerida |
|---|---|
| Node.js | 18 LTS o superior |
| npm | 9 o superior |
| Expo Go (dispositivo) | SDK 54 — App Store / Play Store |
| Android Studio | Para generar APK |
| JDK | 17 (requerido por Gradle) |

---

## 2. Instalacion

```bash
# Crear proyecto limpio
npx create-expo-app mobile
cd mobile

# Borrar el contenido generado por defecto
# Copiar todos los archivos del proyecto UniMente sobre el directorio mobile/

# Instalar dependencias
npm install --legacy-peer-deps
```

### Dependencias clave

| Paquete | Version | Uso |
|---|---|---|
| `expo` | ~54.0.33 | SDK base |
| `expo-router` | ~6.0.23 | Navegacion por archivos |
| `@apollo/client` | ^3.12.8 | Comunicacion GraphQL |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persistencia JWT |
| `react-native-reanimated` | ~4.1.1 | Animaciones (Nueva Arquitectura) |
| `react-native-worklets` | ~0.5.1 | Requerido por reanimated 4.x |
| `lucide-react-native` | ^0.447.0 | Iconos |
| `react-native-svg` | 15.12.1 | Renderizado SVG para iconos |
| `expo-image` | ~3.0.11 | QR del MFA |
| `expo-file-system` | ~19.0.21 | Descarga de backups |
| `expo-sharing` | ~14.0.8 | Compartir backups descargados |
| `expo-clipboard` | ~8.0.8 | Copiar secreto TOTP |

### Notas importantes

El proyecto fuerza `ajv@8` para evitar el error `Cannot find module 'ajv/dist/compile/codegen'`:

```json
"overrides": {
  "ajv": "^8.17.1"
}
```

`reanimated 4.x` no necesita plugin en `babel.config.js`. La configuracion correcta es minima:

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

---

## 3. Conectar con el backend

`constants/api.ts` funciona en dos modos automaticamente:

**Desarrollo (Expo Go en WiFi):** detecta la IP de la PC desde el Metro Bundler — todos los integrantes pueden usarlo sin configuracion manual.

**Produccion (APK):** lee las URLs del campo `extra` en `app.json`:

```json
"extra": {
  "API_URL":      "https://tu-backend.com/graphql",
  "API_REST_URL": "https://tu-backend.com"
}
```

Actualiza estas URLs antes de generar el APK.

---

## 4. Iniciar en desarrollo

```powershell
npm start
```

Escanea el QR con **Expo Go SDK 54**. El telefono y la PC deben estar en la misma red WiFi.

---

## 5. Generar APK

### Prerrequisitos

**1. Android Studio** — https://developer.android.com/studio
Abre `Tools -> SDK Manager` y verifica que tengas Android SDK Build-Tools y Platform-Tools.

**2. JDK 17:**
```powershell
winget install Microsoft.OpenJDK.17
```

**3. Variables de entorno** (PowerShell como administrador, una sola vez):
```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[System.Environment]::SetEnvironmentVariable("Path", "$env:Path;$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")
```
Cierra y vuelve a abrir PowerShell.

### Scripts disponibles

| Comando | Descripcion |
|---|---|
| `npm run setup:android` | Detecta el SDK y escribe `android/local.properties` |
| `npm run prebuild:android` | Ejecuta `expo prebuild` sin limpiar (rapido) |
| `npm run prebuild:clean` | Ejecuta `expo prebuild --clean` + escribe `local.properties` |
| `npm run build:android` | Escribe `local.properties` + compila el APK |
| `npm run build:full` | Prebuild limpio + `local.properties` + compila |

### Paso 1 — URLs de produccion

Edita `app.json` con las URLs reales:

```json
"extra": {
  "API_URL":      "https://tu-backend-real.com/graphql",
  "API_REST_URL": "https://tu-backend-real.com"
}
```

### Paso 2 — Iconos

El icono de la app es `assets/images/icon.png` (1024x1024 px).
Copia el mismo icono como adaptive-icon para Android:

```powershell
Copy-Item assets\images\icon.png assets\images\adaptive-icon.png
```

Archivos requeridos en `assets/images/`:

| Archivo | Tamano |
|---|---|
| `icon.png` | 1024x1024 px |
| `adaptive-icon.png` | 1024x1024 px |
| `splash-icon.png` | 512x512 px o mayor |
| `favicon.png` | 64x64 px |

### Paso 3 — Generar proyecto Android nativo

```powershell
cd C:\ruta\del\proyecto\mobile
npx expo prebuild --platform android --clean
```

### Paso 4 — Renombrar el APK (opcional)

Abre `android\app\build.gradle` y agrega esto dentro de `android { }`, antes de `buildTypes`:

```gradle
applicationVariants.all { variant ->
    variant.outputs.all {
        outputFileName = "unimente-${variant.buildType.name}.apk"
    }
}
```

### Paso 5 — Compilar (automatizado)

El proyecto incluye el script `scripts/setup-android.js` que detecta la ruta del SDK automaticamente y escribe `local.properties` antes de compilar. Funciona en Windows, macOS y Linux sin configuracion manual.

**Primera vez o cuando se agregaron nuevos paquetes nativos:**

```powershell
npm run prebuild:clean
npm run build:android
```

**Cuando solo cambiaste codigo (.tsx, .ts, app.json):**

```powershell
npm run build:android
```

**Todo en un solo comando (prebuild limpio + compilar):**

```powershell
npm run build:full
```

Si prefieres los comandos paso a paso:

```powershell
# Solo escribe local.properties
npm run setup:android

# Compilar desde la carpeta android/
cd android
.\gradlew assembleRelease
```

La primera compilacion descarga dependencias y tarda entre 10 y 20 minutos. Las siguientes son mas rapidas porque Gradle usa cache.

### Resumen rapido — comandos del dia a dia

| Situacion | Comando |
|---|---|
| Cambiaste codigo, iconos o URLs | `npm run build:android` |
| Instalaste un paquete nuevo | `npm run build:full` |

El APK siempre queda en:
```
android\app\build\outputs\apk\release\unimente-release.apk
```

### Resultado

El APK queda en:
```
android\app\build\outputs\apk\release\unimente-release.apk
```

### Instalar en el telefono

1. Copia el APK al telefono (USB, Google Drive, WhatsApp, etc.)
2. En el telefono: **Ajustes -> Seguridad -> Instalar apps de fuentes desconocidas** (activar)
3. Abre el APK desde el administrador de archivos y toca **Instalar**

La app aparece en pantalla de inicio con el nombre **UniMente**.

---

## 6. Estructura del proyecto

```
mobile/
├── app/
│   ├── _layout.tsx              # Root: ApolloProvider + AuthProvider + SafeAreaProvider
│   ├── index.tsx                # Redirect segun rol y estado de auth
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx            # Login + modal cambio de contrasena con MFA
│   │   └── registro.tsx         # Registro de estudiante
│   │
│   ├── (tabs)/                  # Estudiante y Psicologo
│   │   ├── _layout.tsx          # Tab bar con tabs por rol (href: null para ocultar)
│   │   ├── dashboard.tsx        # Stats en tiempo real
│   │   ├── psicologos.tsx       # Buscar + calendario personalizado + agendar
│   │   ├── mis-citas.tsx        # Citas con filtros y paginacion (estudiante)
│   │   ├── agenda.tsx           # Agenda + sesiones clinicas (psicologo)
│   │   └── horarios.tsx         # CRUD horarios (psicologo)
│   │
│   └── (admin)/
│       ├── _layout.tsx          # Tab bar del admin
│       ├── dashboard.tsx        # Stats + acciones rapidas
│       ├── psicologos.tsx       # CRUD psicologos
│       ├── backup.tsx           # Respaldos con MFA + descarga
│       └── mfa.tsx              # Configurar TOTP con QR
│
├── components/UI.tsx            # Todos los componentes compartidos
├── constants/
│   ├── colors.ts                # Tokens de diseno
│   └── api.ts                   # Auto-deteccion de URL (dev/prod)
├── contexts/AuthContext.tsx     # JWT en AsyncStorage
├── graphql/
│   ├── client.ts                # Apollo Client
│   └── operations.ts            # Queries y mutations
├── assets/images/               # Iconos de la app
├── app.json                     # Config Expo SDK 54
├── babel.config.js              # Minimo — solo babel-preset-expo
└── package.json                 # Con overrides: ajv@8
```

---

## 7. Pantallas y navegacion

### Flujo

```
app/index.tsx
├── Sin sesion    → /(auth)/login
├── Administrador → /(admin)/dashboard
└── Otro rol      → /(tabs)/dashboard
```

### Tabs por rol

Expo Router no soporta JSX condicional entre `<Tabs.Screen>`. Se usa `href: null` para ocultar screens:

| Rol | Tabs visibles |
|---|---|
| Estudiante | Inicio, Psicologos, Mis Citas |
| Psicologo | Inicio, Psicologos, Agenda, Horarios |
| Administrador | Inicio, Psicologos, Respaldos, Seguridad |

### Calendario personalizado

La pantalla de psicologos incluye un componente `InlineCalendar` que solo habilita los dias que coinciden con el horario seleccionado. El calendario navega por meses y salta al mes de la proxima fecha valida al seleccionar un horario.

### Orden de citas

- **Mis Citas (estudiante):** ascendente — la mas proxima aparece primero
- **Agenda — Proximas (psicologo):** ascendente — la mas cercana primero
- **Agenda — Historial (psicologo):** descendente — la mas reciente primero

---

## 8. Autenticacion

Token JWT persistido en `AsyncStorage` con la clave `auth_user`.

### Cambio de contrasena

Accesible desde el boton en la pantalla de login. Siempre requiere codigo MFA de 6 digitos.

---

## 9. Componentes reutilizables

Todos en `components/UI.tsx`:

| Componente | Descripcion |
|---|---|
| `Button` | Variantes: primary / secondary / danger. Props: loading, icon, size, disabled |
| `Card` | Contenedor con borde y fondo oscuro |
| `Alert` | Mensajes de error / exito / advertencia |
| `Badge` | Etiquetas de color: teal / gray / yellow / green / red |
| `Spinner` | Indicador de carga |
| `EmptyState` | Estado vacio con icono y descripcion |
| `Field` | Wrapper de input con label y mensaje de error |
| `Input` | TextInput estilizado |
| `Modal` | Modal con overlay y scroll interno |
| `SectionHeader` | Titulo de seccion con contador opcional |
| `PageHeader` | Titulo y subtitulo de pantalla |
| `StatCard` | Tarjeta de estadistica con icono y valor |
| `Pagination` | Paginacion con ellipsis y conteo |
| `usePagination` | Hook que devuelve page, setPage, slice, total, totalPages |

---

## 10. Modulo MFA

### Activar MFA

```
1. Tocar "Activar MFA"
2. Backend genera secreto TOTP + QR (PNG base64)
3. expo-image renderiza el QR
4. Escanear con Google/Microsoft Authenticator
5. Ingresar codigo de 6 digitos para confirmar
```

El secreto puede copiarse al portapapeles con `expo-clipboard` para ingreso manual.

El codigo MFA es obligatorio para: crear backups, restaurar backups y cambiar contrasena.

---

## 11. Modulo de respaldos

### Crear backup

1. Tipo: COMPLETO / DIFERENCIAL / INCREMENTAL
2. Formato: SQL / JSON / EXCEL / CSV
3. Modal de confirmacion con codigo MFA obligatorio

### Descargar backup

`expo-file-system` descarga el archivo con JWT en el header. `expo-sharing` abre el menu nativo para guardar o compartir.

### Restaurar backup

Modal de confirmacion con codigo MFA obligatorio.

---

## 12. Paginacion y tiempo real

### Paginacion por pantalla

| Pantalla | Registros por pagina |
|---|---|
| Admin Psicologos | 9 |
| Estudiante Psicologos | 6 |
| Mis Citas | 10 |
| Agenda — Proximas | 8 |
| Agenda — Historial | 10 |

La paginacion se resetea al buscar o cambiar filtros.

### Refresco en tiempo real

`useFocusEffect` ejecuta `refetch()` cada vez que la pantalla entra en foco:

```typescript
useFocusEffect(useCallback(() => { refetch(); }, []));
```

Todas las pantallas con datos lo implementan — al volver de otra pestaña los datos siempre estan actualizados.

---

## 13. Decisiones tecnicas

### SDK 54 con React Compiler desactivado

```json
"experiments": {
  "reactCompiler": false
}
```

Evita problemas de compatibilidad con el compilador experimental.

### Nueva Arquitectura

Expo Go SDK 54 fuerza la Nueva Arquitectura. El flag `newArchEnabled` en `app.json` no se define (activa por defecto en SDK 54).

### reanimated 4.x

Disenado para Nueva Arquitectura. Requiere `react-native-worklets` como dependencia separada. No necesita plugin en `babel.config.js`.

### filter(Boolean) en .map()

Previene crashes cuando Apollo devuelve `null` en la cache durante la carga:

```typescript
{lista.filter(Boolean).map((item: any) => (...))}
```

### Optional chaining generalizado

Todos los accesos a propiedades de objetos de la API usan `?.` para evitar crashes cuando los datos llegan parcialmente.

### Deteccion automatica de IP

```typescript
const hostUri = Constants.expoConfig?.hostUri ?? '';
const ip      = hostUri.split(':')[0];
```

Todos los integrantes del equipo pueden desarrollar en su propia red sin modificar ningun archivo.