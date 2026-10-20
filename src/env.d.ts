// Tipado de las variables de entorno inyectadas por @ngx-env/builder.
declare interface Env {
  readonly NODE_ENV: string;
  /** Entorno activo: 'development' | 'production' (la define @ngx-env/builder). */
  readonly NG_APP_ENV: string;
  /** Clave de la API de Google Gemini. En producción se define en Vercel. */
  readonly NG_APP_GEMINI_API_KEY: string;
  /** Modelo de Gemini a utilizar (ej. gemini-3.8-flash). */
  readonly NG_APP_GEMINI_MODEL: string;
  [key: string]: any;
}

// Uso: import.meta.env.NG_APP_GEMINI_API_KEY
declare interface ImportMeta {
  readonly env: Env;
}
