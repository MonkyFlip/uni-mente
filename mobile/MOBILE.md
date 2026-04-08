# UniMente — App Móvil

Aplicación móvil del Portal de Bienestar Universitario.
Stack: **React Native 0.81 · Expo SDK 54 · Expo Router · Apollo Client · TypeScript**.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación](#2-instalación)
3. [Conectar con el backend](#3-conectar-con-el-backend)
4. [Iniciar en desarrollo](#4-iniciar-en-desarrollo)
5. [Generar APK de prueba](#5-generar-apk-de-prueba)
6. [Publicar en Google Play (AAB)](#6-publicar-en-google-play-aab)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Pantallas y navegación](#8-pantallas-y-navegación)
9. [Autenticación](#9-autenticación)
10. [Componentes reutilizables](#10-componentes-reutilizables)
11. [Módulo MFA](#11-módulo-mfa)
12. [Módulo de respaldos](#12-módulo-de-respaldos)
13. [Módulo de estadísticas](#13-módulo-de-estadísticas)
14. [Navegación por Drawer](#14-navegación-por-drawer)
15. [Paginación y tiempo real](#15-paginación-y-tiempo-real)
16. [Decisiones técnicas](#16-decisiones-técnicas)

---

## 1. Requisitos

| Herramienta | Versión requerida |
|---|---|
| Node.js | 18 LTS o superior |
| npm | 9 o superior |
| Expo Go (dispositivo) | SDK 54 — App Store / Play Store |
| Android Studio | Para generar APK/AAB |
| JDK | 17 o superior (requerido por Gradle) |

---

## 2. Instalación

```bash
cd mobile
npm install --legacy-peer-deps
```

### Dependencias clave

| Paquete | Versión | Uso |
|---|---|---|
| `expo` | ~54.0.33 | SDK base |
| `expo-router` | ~6.0.23 | Navegación por archivos |
| `@apollo/client` | ^3.12.8 | Comunicación GraphQL |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persistencia JWT |
| `react-native-reanimated` | ~4.1.1 | Animaciones (Nueva Arquitectura) |
| `react-native-worklets` | ~0.5.1 | Requerido por reanimated 4.x |
| `lucide-react-native` | ^0.447.0 | Iconos |
| `react-native-svg` | 15.12.1 | SVG para iconos y gráficas |
| `react-native-chart-kit` | latest | Gráficas de estadísticas |
| `expo-image` | ~3.0.11 | QR del MFA |
| `expo-file-system` | ~19.0.21 | Descarga de backups |
| `expo-sharing` | ~14.0.8 | Compartir backups descargados |
| `expo-clipboard` | ~8.0.8 | Copiar secreto TOTP |
| `expo-print` | ~55.0.11 | Exportar PDF historial clínico |

### Notas importantes

El proyecto fuerza `ajv@8` para evitar el error `Cannot find module 'ajv/dist/compile/codegen'`:

```json
"overrides": {
  "ajv": "^8.17.1"
}
```

`reanimated 4.x` no necesita plugin en `babel.config.js`. La configuración correcta es mínima:

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

`expo-file-system` versión 19+ usa una nueva API. Para usar los métodos legacy (`downloadAsync`, `moveAsync`) importar desde el submódulo:

```typescript
import * as FileSystem from 'expo-file-system/legacy';
```

---

## 3. Conectar con el backend

`constants/api.ts` funciona en dos modos automáticamente:

**Desarrollo (Expo Go en WiFi):** detecta la IP de la PC desde el Metro Bundler — todos los integrantes pueden usarlo sin configuración manual.

**Producción (APK/AAB):** lee las URLs del campo `extra` en `app.json`:

```json
"extra": {
  "API_URL":      "https://unimente.duckdns.org/graphql",
  "API_REST_URL": "https://unimente.duckdns.org"
}
```

---

## 4. Iniciar en desarrollo

```powershell
npm start
```

Escanea el QR con **Expo Go SDK 54**. El teléfono y la PC deben estar en la misma red WiFi.

---

## 5. Generar APK de prueba

Útil para probar en dispositivo antes de subir a Play Store.

```powershell
cd mobile
npx expo prebuild --platform android --clean
npm run setup:android
```

Edita `android/app/build.gradle` — agrega el bloque `release` dentro de `signingConfigs` y corrige `buildTypes`:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file("../../unimente-release.keystore")
        storePassword "TU_PASSWORD"
        keyAlias "unimente"
        keyPassword "TU_PASSWORD"
    }
}
buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release
        ...
    }
}
```

```powershell
cd android
.\gradlew assembleRelease
```

APK generado en:
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## 6. Publicar en Google Play (AAB)

### Keystore de producción

El keystore de firma está en:
```
mobile/unimente-release.keystore
```

**CRÍTICO:** nunca borrar ni reemplazar este archivo. Sin él es imposible actualizar la app en Play Store. Mantener una copia de seguridad en lugar seguro (Google Drive, USB cifrado).

Verificar la huella del keystore:
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v `
  -keystore "C:\mai\UniMente\mobile\unimente-release.keystore" `
  -alias unimente
```

La huella SHA1 esperada por Play Console es:
```
8C:8E:5F:4A:2C:0D:89:15:64:75:9F:A7:AC:96:55:0A:59:53:FD:A4
```

### Pasos para publicar una nueva versión

**Paso 1 — Incrementar la versión en `app.json`:**

```json
{
  "expo": {
    "version": "1.2.0",
    "android": {
      "versionCode": 3
    }
  }
}
```

`versionCode` debe incrementarse en 1 con cada versión subida a Play Store. `version` es el número visible al usuario.

**Paso 2 — Prebuild limpio:**

```powershell
cd C:\mai\UniMente\mobile
npx expo prebuild --platform android --clean
npm run setup:android
```

**Paso 3 — Restaurar la firma en `build.gradle`:**

> **IMPORTANTE:** `expo prebuild --clean` regenera el directorio `android/` completo y borra la configuración de firma. Hay que editarla manualmente después de cada prebuild.

Abre `android/app/build.gradle` y asegúrate de que el bloque `signingConfigs` tenga el release configurado y que `buildTypes > release` use `signingConfigs.release`:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file("../../unimente-release.keystore")
        storePassword "TU_PASSWORD"
        keyAlias "unimente"
        keyPassword "TU_PASSWORD"
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        ...
    }
}
```

**Paso 4 — Generar el AAB:**

```powershell
cd android
.\gradlew bundleRelease
```

AAB generado en:
```
android\app\build\outputs\bundle\release\app-release.aab
```

**Paso 5 — Subir a Play Console:**

1. Ir a [Google Play Console](https://play.google.com/console)
2. Seleccionar la app UniMente
3. Prueba y lanza → Prueba interna → Crear nueva versión
4. Subir el `app-release.aab`
5. Completar los detalles de la versión:

| Campo | Ejemplo |
|---|---|
| Nombre de la versión | `1.2.0` |
| Notas de la versión | Describir los cambios en español |

6. Guardar → Revisar versión → Iniciar lanzamiento

### Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `Keystore not found` | Ruta incorrecta en `build.gradle` | Verificar que `storeFile` apunte a `../../unimente-release.keystore` |
| `Signed with wrong key` | Se usó un keystore diferente al original | Usar siempre `mobile/unimente-release.keystore` |
| `Filename longer than 260 characters` | Ruta del proyecto demasiado larga en Windows | Mover el proyecto a `C:\mai\UniMente\` |
| `versionCode already used` | El `versionCode` en `app.json` ya fue subido | Incrementar `versionCode` en 1 |

---

## 7. Estructura del proyecto

```
mobile/
├── app/
│   ├── _layout.tsx              # Root: Apollo + Auth + SafeArea + Theme + Tour + Drawer
│   ├── index.tsx                # Redirect según rol y estado de auth
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx            # Login + modal cambio de contraseña con MFA
│   │   └── registro.tsx         # Registro de estudiante
│   │
│   ├── (tabs)/                  # Estudiante y Psicólogo
│   │   ├── _layout.tsx          # tabBarStyle: display none — navegación por Drawer
│   │   ├── dashboard.tsx
│   │   ├── psicologos.tsx       # Búsqueda + calendario + agendar
│   │   ├── mis-citas.tsx        # Citas con filtros y paginación (estudiante)
│   │   ├── agenda.tsx           # Agenda + sesiones clínicas (psicólogo)
│   │   ├── mis-pacientes.tsx    # Historial clínico + PDF (psicólogo)
│   │   ├── horarios.tsx         # CRUD horarios (psicólogo)
│   │   └── mfa.tsx              # MFA para estudiante y psicólogo
│   │
│   └── (admin)/
│       ├── _layout.tsx          # tabBarStyle: display none — navegación por Drawer
│       ├── dashboard.tsx        # Stats + acciones rápidas
│       ├── psicologos.tsx       # CRUD psicólogos con toggle activo/inactivo
│       ├── estudiantes.tsx      # Lista de estudiantes
│       ├── estadisticas.tsx     # Gráficas: citas por mes, por estado, top psicólogos, top carreras
│       ├── backup.tsx           # Respaldos con MFA + descarga
│       └── mfa.tsx              # Configurar TOTP con QR
│
├── components/
│   ├── UI.tsx                   # Todos los componentes compartidos
│   └── Drawer.tsx               # Menú lateral con navegación por rol + MenuButton
│
├── contexts/
│   ├── AuthContext.tsx          # JWT en AsyncStorage
│   ├── ThemeContext.tsx         # 5 paletas de color con AsyncStorage
│   └── TourContext.tsx          # Tour guiado de bienvenida por rol
│
├── constants/
│   ├── colors.ts                # Tokens de diseño base
│   └── api.ts                   # Auto-detección de URL (dev/prod)
│
├── graphql/
│   ├── client.ts                # Apollo Client
│   └── operations.ts            # Queries y mutations
│
├── utils/
│   └── pdfUtils.ts              # Exportar historial clínico a PDF (expo-print)
│
├── assets/images/               # Iconos de la app (1024x1024)
├── scripts/setup-android.js     # Detecta SDK y escribe local.properties
├── app.json                     # Config Expo SDK 54
├── babel.config.js              # Mínimo — solo babel-preset-expo
├── unimente-release.keystore    # Keystore de firma — NO subir al repo
└── package.json                 # Con overrides: ajv@8
```

---

## 8. Pantallas y navegación

### Flujo principal

```
app/index.tsx
├── Sin sesión    → /(auth)/login
├── Administrador → /(admin)/dashboard
└── Otro rol      → /(tabs)/dashboard
```

### Navegación por Drawer

La barra de tabs está oculta en todos los grupos (`tabBarStyle: { display: 'none' }`). La navegación se realiza exclusivamente a través del **Drawer lateral**, que se abre con el botón `MenuButton` en la esquina superior derecha de cada pantalla.

El Drawer muestra las rutas disponibles según el rol del usuario autenticado:

| Rol | Pantallas |
|---|---|
| Estudiante | Inicio, Psicólogos, Mis Citas, Seguridad MFA |
| Psicólogo | Inicio, Agenda, Mis Pacientes, Mis Horarios, Seguridad MFA |
| Administrador | Inicio, Psicólogos, Estadísticas, Respaldos, Seguridad MFA |

El Drawer también incluye el selector de paleta de colores y el botón de cerrar sesión.

### Calendario personalizado

La pantalla de psicólogos incluye un componente `InlineCalendar` que solo habilita los días que coinciden con el horario seleccionado.

---

## 9. Autenticación

Token JWT persistido en `AsyncStorage` con la clave `auth_user`.

El cambio de contraseña es accesible desde el botón en la pantalla de login y siempre requiere código MFA de 6 dígitos.

---

## 10. Componentes reutilizables

Todos en `components/UI.tsx`:

| Componente | Descripción |
|---|---|
| `Button` | Variantes: primary / secondary / danger. Props: loading, icon, size, disabled |
| `Card` | Contenedor con borde y fondo oscuro |
| `Alert` | Mensajes de error / éxito / advertencia |
| `Badge` | Etiquetas: teal / gray / yellow / green / red |
| `Spinner` | Indicador de carga |
| `EmptyState` | Estado vacío con icono y descripción |
| `Field` | Wrapper de input con label |
| `Input` | TextInput estilizado |
| `Modal` | Modal con overlay y scroll interno |
| `PageHeader` | Título y subtítulo de pantalla |
| `StatCard` | Tarjeta de estadística con icono y valor |
| `Pagination` | Paginación con conteo |
| `usePagination` | Hook: page, setPage, slice, total, totalPages |

---

## 11. Módulo MFA

### Activar MFA

```
1. Tocar "Activar MFA"
2. Backend genera secreto TOTP + QR (PNG base64)
3. expo-image renderiza el QR
4. Escanear con Google/Microsoft Authenticator
5. Ingresar código de 6 dígitos para confirmar
```

El secreto puede copiarse al portapapeles con `expo-clipboard` para ingreso manual.

El código MFA es obligatorio para: crear backups, restaurar backups y cambiar contraseña.

---

## 12. Módulo de respaldos

### Crear backup

1. Seleccionar tipo: COMPLETO / DIFERENCIAL / INCREMENTAL
2. Seleccionar formato: SQL / JSON / EXCEL / CSV
3. Modal de confirmación con código MFA obligatorio

### Descargar backup

`expo-file-system/legacy` descarga el archivo con JWT en el header. `expo-sharing` abre el menú nativo para guardar o compartir.

### Restaurar backup

Modal de confirmación con código MFA obligatorio.

---

## 13. Módulo de estadísticas

Disponible para el rol **administrador** en `/(admin)/estadisticas`.

Conecta con la query GraphQL `estadisticasAdmin` del backend.

### Métricas mostradas

| Métrica | Visualización |
|---|---|
| Total de citas | KPI |
| Tasa de asistencia | KPI (%) |
| Total de psicólogos | KPI |
| Total de estudiantes | KPI |
| Citas por mes (últimos 6 meses) | BarChart (`react-native-chart-kit`) |
| Distribución por estado | PieChart + leyenda manual |
| Top 5 psicólogos más solicitados | Barras horizontales manuales |
| Top 5 carreras con más citas | Barras horizontales manuales |

Las barras horizontales para top psicólogos y carreras se implementan con `View` de ancho dinámico (sin dependencia extra) para mayor compatibilidad.

---

## 14. Navegación por Drawer

### Componentes

**`components/Drawer.tsx`** — contiene:
- `DrawerProvider`: contexto que controla si el drawer está abierto
- `Drawer`: el panel lateral con navegación, paleta y logout
- `MenuButton`: botón flotante que abre el drawer, debe incluirse en el header de cada pantalla

### Agregar MenuButton a una pantalla

```tsx
import { MenuButton } from '../../components/Drawer';

// En el JSX, al inicio del ScrollView:
<View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
  <PageHeader title="Mi Pantalla" subtitle="Descripción" />
  <MenuButton />
</View>
```

### Temas de color

`contexts/ThemeContext.tsx` provee 5 paletas:

| ID | Nombre |
|---|---|
| `teal-navy` | Teal & Navy (default) |
| `purple-dark` | Púrpura oscuro |
| `amber-dark` | Ámbar oscuro |
| `rose-dark` | Rosa oscuro |
| `green-dark` | Verde oscuro |

La paleta seleccionada persiste en `AsyncStorage` entre sesiones.

---

## 15. Paginación y tiempo real

### Paginación por pantalla

| Pantalla | Registros por página |
|---|---|
| Admin Psicólogos | 9 |
| Estudiante Psicólogos | 6 |
| Mis Citas | 10 |
| Agenda | 10 |
| Mis Pacientes | 8 |

### Refresco en tiempo real

`useFocusEffect` ejecuta `refetch()` cada vez que la pantalla entra en foco:

```typescript
useFocusEffect(useCallback(() => { refetch(); }, []));
```

---

## 16. Decisiones técnicas

### expo-file-system legacy

Expo SDK 54 introduce una nueva API de sistema de archivos basada en clases. Para mantener compatibilidad con el código existente se importa desde el submódulo legacy:

```typescript
import * as FileSystem from 'expo-file-system/legacy';
```

### Estados de citas en mayúsculas

El enum `EstadoCita` del backend requiere valores en mayúsculas. Todas las mutations envían `'ASISTIDA'`, `'CANCELADA'`, `'PENDIENTE'` — nunca en minúsculas.

### tabBarStyle: display none

Ambos grupos `(tabs)` y `(admin)` ocultan la barra inferior. Cada screen sigue declarada en `_layout.tsx` para que Expo Router la registre, pero la navegación es exclusivamente por Drawer.

### useTheme en todas las pantallas admin

Todas las pantallas del grupo `(admin)` usan `useTheme()` en lugar de `Colors` estáticos, lo que permite que la paleta de color seleccionada por el usuario se aplique correctamente.

### SDK 54 con React Compiler desactivado

```json
"experiments": {
  "reactCompiler": false
}
```

### Nueva Arquitectura activa por defecto en SDK 54

`reanimated 4.x` está diseñado para la Nueva Arquitectura. No necesita configuración en `babel.config.js`.

### Detección automática de IP en desarrollo

```typescript
const hostUri = Constants.expoConfig?.hostUri ?? '';
const ip      = hostUri.split(':')[0];
```

Todos los integrantes del equipo pueden desarrollar en su propia red sin modificar ningún archivo.