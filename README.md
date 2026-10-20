# 🍳 SnapChef — Chef de Nevera

Aplicación web que usa la cámara del dispositivo para escanear ingredientes, detectarlos mediante IA (Google Gemini) y generar recetas personalizadas según el **"mood"** o intención culinaria que elijas.

## Stack

- **Angular 22** — Standalone Components, Signals, nuevo Control Flow (`@if`/`@for`), `inject()`. Sin NgModules.
- **Tailwind CSS 4** — estilos utilitarios.
- **WebRTC + Canvas** — captura de imagen con compresión (máx. 1024px, calidad 0.7).
- **Google Gemini** (`@google/genai`) — visión + texto, respuestas JSON forzadas.
- **@ngx-env/builder** — variables de entorno vía `.env`.

## Estructura

```
src/app/
├── core/
│   ├── config/        # app-env.config.ts (lectura de variables de entorno)
│   ├── models/        # interfaces de dominio
│   └── services/      # CameraService, GeminiService, MoodService
├── features/
│   ├── mood-selector/     # elección del estado de ánimo
│   ├── camera-capture/    # cámara + compresión de imagen
│   ├── ingredient-editor/ # edición manual de ingredientes
│   └── recipe-view/       # receta + modo cocina
└── shared/            # componentes/pipes reutilizables
```

## Setup local

```bash
npm install
cp .env.example .env      # y rellena tu API key
npm start                 # http://localhost:4200
```

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `NG_APP_GEMINI_API_KEY` | Clave de Google Gemini API | — |
| `NG_APP_GEMINI_MODEL` | Modelo a usar | `gemini-3.8-flash` |

Localmente se leen de `.env` (gitignored). La plantilla `.env.example` se commitea.

## 🔐 Seguridad de la API key (importante)

Al ser una app **100% frontend sin backend**, la API key queda embebida en el bundle JS y es visible para quien abra DevTools. **Esto es esperado** para uso con Gemini desde el browser, pero debes mitigarlo en [Google AI Studio](https://aistudio.google.com/apikey):

1. **Restringir por HTTP Referrer** → solo funcionará en tu dominio (ej. `https://tu-app.vercel.app/*`) y `http://localhost:4200/*`.
2. **Fijar cuota diaria** de uso para limitar el consumo no autorizado.

## 🚀 Deploy en Vercel

1. Conecta el repo en [vercel.com/new](https://vercel.com/new) (framework detectado: Angular).
2. En **Settings → Environment Variables** define:
   - `NG_APP_GEMINI_API_KEY` = tu clave
   - `NG_APP_GEMINI_MODEL` = `gemini-3.8-flash` (o el que prefieras)
3. Deploy. Las variables se inyectan en build time automáticamente.

## Gitflow

- `main` → producción (solo merges desde `release/*`).
- `develop` → integración.
- `feature/*` → cada paso/pull request.
- `release/vX.Y` → preparación de release; `hotfix/*` → arreglos urgentes en producción.
