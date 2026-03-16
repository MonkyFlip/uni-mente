import Constants from 'expo-constants';

/**
 * Detecta automáticamente la IP del servidor.
 *
 * Expo expone la IP de la PC en Constants.expoConfig.hostUri
 * con el formato "192.168.x.x:8081" (Metro Bundler).
 * Extraemos solo la IP y apuntamos al puerto 3000 del backend.
 *
 * Esto funciona para todos los integrantes sin importar la red WiFi.
 */
function getServerIP(): string {
  // hostUri viene como "192.168.x.x:8081" en Expo Go
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const ip = hostUri.split(':')[0];

  // Fallback por si corre en emulador o web
  if (!ip || ip === 'localhost') return 'localhost';
  return ip;
}

const SERVER_IP = getServerIP();

export const API_URL      = `http://${SERVER_IP}:3000/graphql`;
export const API_REST_URL = `http://${SERVER_IP}:3000`;