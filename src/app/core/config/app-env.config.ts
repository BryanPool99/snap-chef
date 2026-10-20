/**
 * Configuración central de la aplicación.
 * Lee las variables de entorno inyectadas por @ngx-env/builder en build time.
 *
 * Localmente provienen de `.env` (gitignored).
 * En Vercel provienen de Settings > Environment Variables.
 *
 * IMPORTANTE (trampa de @ngx-env/builder): el builder inyecta mediante
 * esbuild `define` con las claves en NOTACIÓN DE PUNTOS
 * (`import.meta.env.NG_APP_*`). Hay que acceder con notación de puntos y SIN
 * un alias intermedio (`const env = import.meta.env`), o esbuild no reemplaza
 * la expresión y la variable queda `undefined` en runtime.
 *
 * NOTA DE SEGURIDAD: al ser una app 100% frontend, estas variables quedan
 * embebidas en el bundle JS. La protección real se configura en Google AI Studio
 * restringiendo la key por HTTP Referrer y fijando una cuota diaria de uso.
 */

/** Log de trazabilidad solo en desarrollo (en producción no ensucia la consola). */
function trace(message: string): void {
  if (import.meta.env.NG_APP_ENV !== 'production') {
    console.log(`[Env] ${message}`);
  }
}

export const appEnv = {
  /** Clave de la API de Google Gemini. */
  geminiApiKey: import.meta.env.NG_APP_GEMINI_API_KEY ?? '',

  /** Modelo de Gemini a usar (configurable sin tocar código). */
  geminiModel: import.meta.env.NG_APP_GEMINI_MODEL || 'gemini-3.8-flash',

  /** Lado máximo (px) al que se escala la imagen capturada antes de enviarla a la IA. */
  imageMaxSize: 1024,

  /** Calidad de compresión JPEG del canvas (0 - 1). */
  imageQuality: 0.7,
} as const;

// Confirma en consola si la key se inyectó en build time (nunca imprime el valor).
trace(
  appEnv.geminiApiKey
    ? `NG_APP_GEMINI_API_KEY inyectada (${appEnv.geminiApiKey.length} chars) | model=${appEnv.geminiModel}`
    : 'NG_APP_GEMINI_API_KEY VACÍA ❌ — revisa tu .env y reinicia el servidor',
);
