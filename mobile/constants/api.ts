import Constants from 'expo-constants';

/**
 * Production: usa las URLs del app.json → extra → API_URL / API_REST_URL
 * Desarrollo: detecta la IP de la PC desde el Metro Bundler (Expo Go en WiFi)
 */
const extra = Constants.expoConfig?.extra ?? {};

function resolveUrls(): { API_URL: string; API_REST_URL: string } {
  // Si hay URLs configuradas en app.json (producción / EAS Build)
  if (extra.API_URL && extra.API_REST_URL) {
    return {
      API_URL:      extra.API_URL as string,
      API_REST_URL: extra.API_REST_URL as string,
    };
  }

  // Desarrollo local — extraer IP de hostUri de Metro
  // hostUri tiene el formato "192.168.x.x:8081"
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const ip      = hostUri.split(':')[0];
  const base    = ip && ip !== 'localhost' ? `http://${ip}:3000` : 'http://localhost:3000';

  return {
    API_URL:      `${base}/graphql`,
    API_REST_URL: base,
  };
}

const { API_URL, API_REST_URL } = resolveUrls();

export { API_URL, API_REST_URL };
