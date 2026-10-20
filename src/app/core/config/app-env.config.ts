/**
 * Configuración central de la aplicación.
 * Lee las variables de entorno inyectadas por @ngx-env/builder en build time.
 *
 * Localmente provienen de `.env` (gitignored).
 * En Vercel provienen de Settings > Environment Variables.
 *
 * NOTA DE SEGURIDAD: al ser una app 100% frontend, estas variables quedan
 * embebidas en el bundle JS. La protección real se configura en Google AI Studio
 * restringiendo la key por HTTP Referrer y fijando una cuota diaria de uso.
 */
const env = import.meta.env;

export const appEnv = {
  /** Clave de la API de Google Gemini. */
  geminiApiKey: env['NG_APP_GEMINI_API_KEY'] ?? '',

  /** Modelo de Gemini a usar (configurable sin tocar código). */
  geminiModel: env['NG_APP_GEMINI_MODEL'] || 'gemini-2.5-flash',

  /** Lado máximo (px) al que se escala la imagen capturada antes de enviarla a la IA. */
  imageMaxSize: 1024,

  /** Calidad de compresión JPEG del canvas (0 - 1). */
  imageQuality: 0.7,
} as const;
