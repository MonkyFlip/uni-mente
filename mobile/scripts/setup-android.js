/**
 * setup-android.js
 *
 * Detecta automaticamente la ruta del Android SDK y escribe
 * android/local.properties antes de compilar.
 *
 * Funciona en Windows, macOS y Linux.
 * Usa ANDROID_HOME si esta definida; si no, busca en las rutas por defecto.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── 1. Determinar la ruta del SDK ─────────────────────────────────

function findSdkPath() {
  // Primero: variable de entorno (la mas confiable)
  if (process.env.ANDROID_HOME) {
    return process.env.ANDROID_HOME;
  }
  if (process.env.ANDROID_SDK_ROOT) {
    return process.env.ANDROID_SDK_ROOT;
  }

  // Segundo: rutas por defecto segun sistema operativo
  const platform = os.platform();
  const home     = os.homedir();

  const candidates = {
    win32:  [
      path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
      path.join(home, 'AppData', 'Local', 'Android', 'Sdk'),
    ],
    darwin: [
      path.join(home, 'Library', 'Android', 'sdk'),
      '/usr/local/share/android-sdk',
    ],
    linux: [
      path.join(home, 'Android', 'Sdk'),
      path.join(home, 'android-sdk'),
      '/usr/lib/android-sdk',
    ],
  };

  const paths = candidates[platform] ?? [];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

// ── 2. Escribir local.properties ──────────────────────────────────

const sdkPath = findSdkPath();

if (!sdkPath) {
  console.error('\n[setup-android] ERROR: No se encontro el Android SDK.');
  console.error('Define la variable de entorno ANDROID_HOME con la ruta del SDK.');
  console.error('Ejemplo Windows: $env:ANDROID_HOME = "C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk"\n');
  process.exit(1);
}

// Gradle necesita que las barras invertidas de Windows vayan escapadas
const sdkEscaped = sdkPath.replace(/\\/g, '\\\\');

const androidDir  = path.join(__dirname, '..', 'android');
const propsPath   = path.join(androidDir, 'local.properties');

if (!fs.existsSync(androidDir)) {
  console.error('\n[setup-android] ERROR: La carpeta android/ no existe.');
  console.error('Ejecuta primero: npx expo prebuild --platform android\n');
  process.exit(1);
}

const content = `# Generado automaticamente por scripts/setup-android.js
# No editar manualmente — se regenera con cada build
sdk.dir=${sdkEscaped}
`;

fs.writeFileSync(propsPath, content, 'utf8');

console.log(`[setup-android] local.properties escrito:`);
console.log(`  sdk.dir=${sdkPath}\n`);