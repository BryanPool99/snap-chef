import { Injectable, inject } from '@angular/core';
import { ContentListUnion, GoogleGenAI, Schema, Type } from '@google/genai';
import { appEnv } from '../config/app-env.config';
import { CapturedImage } from '../models/captured-image.model';
import { Recipe } from '../models/recipe.model';

/** Shape del JSON que devuelve Gemini al detectar ingredientes. */
interface DetectionResult {
  ingredients: string[];
}

/** Log de trazabilidad solo en desarrollo (en producción no ensucia la consola). */
function trace(message: string, extra?: unknown): void {
  if (import.meta.env.NG_APP_ENV !== 'production') {
    if (extra !== undefined) {
      console.log(`[Gemini] ${message}`, extra);
    } else {
      console.log(`[Gemini] ${message}`);
    }
  }
}

/** Máximo de intentos por llamada (1 inicial + 3 reintentos para errores transitorios). */
const MAX_ATTEMPTS = 4;
/** Espera base entre reintentos; se duplica en cada intento (backoff exponencial). */
const BASE_RETRY_DELAY_MS = 800;

/** Espera indicada en ms (para el backoff entre reintentos). */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Detecta errores TRANSITORIOS del servidor (sobrecarga/cuota) que vale la pena reintentar. */
function isTransientError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|high demand|try again later|rate limit/i.test(
    message,
  );
}

/** Error tipado del servicio de IA, con un mensaje listo para la UI. */
export class GeminiError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = 'GeminiError';
  }
}

/** Schema forzado: la respuesta de detección SIEMPRE será `{ ingredients: string[] }`. */
const DETECTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Nombres de ingredientes comestibles detectados en la foto, en minúsculas y sin cantidades (ej. "tomate", "huevos").',
    },
  },
  required: ['ingredients'],
  propertyOrdering: ['ingredients'],
};

/** Schema forzado: la receta SIEMPRE tendrá esta estructura. */
const RECIPE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Título corto y apetitoso de la receta.' },
    description: { type: Type.STRING, description: 'Una o dos frases describiendo el plato.' },
    servings: { type: Type.INTEGER, description: 'Número de porciones.' },
    prepTimeMinutes: { type: Type.INTEGER, description: 'Minutos de preparación.' },
    cookTimeMinutes: { type: Type.INTEGER, description: 'Minutos de cocción.' },
    difficulty: {
      type: Type.STRING,
      description: 'Dificultad de la receta.',
      enum: ['Fácil', 'Media', 'Difícil'],
    },
    ingredients: {
      type: Type.ARRAY,
      description: 'Todos los ingredientes necesarios, incluyendo los detectados y los complementarios básicos (sal, aceite, agua).',
      items: {
        type: Type.OBJECT,
        properties: {
          quantity: { type: Type.STRING, description: 'Cantidad escrita, ej. "2", "1/2", "al gusto".' },
          unit: { type: Type.STRING, description: 'Unidad, ej. "tazas", "gramos", "" si no aplica.' },
          name: { type: Type.STRING, description: 'Nombre del ingrediente.' },
        },
        required: ['quantity', 'unit', 'name'],
        propertyOrdering: ['quantity', 'unit', 'name'],
      },
    },
    steps: {
      type: Type.ARRAY,
      description: 'Pasos de preparación en orden cronológico, claros y numerables.',
      items: {
        type: Type.OBJECT,
        properties: {
          instruction: { type: Type.STRING, description: 'Instrucción del paso.' },
          durationMinutes: {
            type: Type.INTEGER,
            nullable: true,
            description: 'Duración estimada del paso en minutos, o null si no aplica.',
          },
        },
        required: ['instruction', 'durationMinutes'],
        propertyOrdering: ['instruction', 'durationMinutes'],
      },
    },
    tips: {
      type: Type.ARRAY,
      description: 'Consejos útiles para el éxito de la receta.',
      items: { type: Type.STRING },
    },
  },
  required: ['title', 'description', 'servings', 'prepTimeMinutes', 'cookTimeMinutes', 'difficulty', 'ingredients', 'steps', 'tips'],
  propertyOrdering: [
    'title',
    'description',
    'servings',
    'prepTimeMinutes',
    'cookTimeMinutes',
    'difficulty',
    'ingredients',
    'steps',
    'tips',
  ],
};

/** Prompt de sistema para la detección de ingredientes. */
const DETECTION_SYSTEM_PROMPT = `Eres un visor experto de alimentos. Analiza la imagen y detecta los ingredientes comestibles visibles.
Reglas:
- Solo incluye ingredientes comestibles reales (ignora vajilla, utensilios, decoración).
- Usa nombres genéricos en minúsculas y sin cantidades (ej. "tomate", "huevo", "queso").
- Si un ingrediente está parcialmente oculto pero es identificable, inclúyelo.
- Si no hay ningún ingrediente claro, devuelve la lista vacía.`;

/**
 * Integración con Google Gemini: detección de ingredientes por visión
 * y generación de recetas, ambas con JSON forzado vía responseSchema.
 */
@Injectable({ providedIn: 'root' })
export class GeminiService {
  /** Cliente SDK, inicializado en perezoso para no romper el bootstrap si falta la key. */
  private ai: GoogleGenAI | null = null;

  /** Devuelve el cliente, validando antes que la API key esté configurada. */
  private get client(): GoogleGenAI {
    if (!this.ai) {
      this.assertConfigured();
      trace(`creando cliente (model=${appEnv.geminiModel})`);
      this.ai = new GoogleGenAI({ apiKey: appEnv.geminiApiKey });
    }
    return this.ai;
  }

  /** Detecta ingredientes en una imagen usando Gemini Vision y devuelve sus nombres. */
  async detectIngredients(image: CapturedImage): Promise<string[]> {
    const response = await this.generate({
      contents: [
        { inlineData: { data: image.base64, mimeType: image.mimeType } },
        { text: 'Detecta los ingredientes comestibles de esta foto.' },
      ],
      config: {
        responseSchema: DETECTION_SCHEMA,
        temperature: 0.2,
      },
    });

    const parsed = this.parse<DetectionResult>(response);
    return parsed.ingredients ?? [];
  }

  /** Genera una receta a partir de los ingredientes finales y el "mood" elegido. */
  async generateRecipe(ingredients: string[], systemPrompt: string): Promise<Recipe> {
    const response = await this.generate({
      contents: [
        {
          text: `Ingredientes disponibles: ${ingredients.join(', ')}.
El usuario eligió este estado de ánimo culinario. Genera una receta que encaje con él usando esos ingredientes como base.`,
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseSchema: RECIPE_SCHEMA,
        temperature: 0.8,
      },
    });

    return this.parse<Recipe>(response);
  }

  /** Lanza un error claro si la API key no está configurada. */
  assertConfigured(): void {
    if (!appEnv.geminiApiKey) {
      throw new GeminiError(
        'Falta la API key de Gemini. Copia `.env.example` a `.env` y define NG_APP_GEMINI_API_KEY.',
      );
    }
  }

  /** Envuelve generateContent con manejo de errores tipado. */
  private async generate(params: {
    contents: ContentListUnion;
    config: { responseSchema: Schema; temperature: number; systemInstruction?: string };
  }): Promise<string> {
    this.assertConfigured();

    trace(`generateContent → model=${appEnv.geminiModel}, temp=${params.config.temperature}`);

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: appEnv.geminiModel,
          contents: params.contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: params.config.responseSchema,
            temperature: params.config.temperature,
            ...(params.config.systemInstruction ? { systemInstruction: params.config.systemInstruction } : {}),
          },
        });

        const text = response.text;
        if (!text) {
          throw new GeminiError('Gemini devolvió una respuesta vacía. Intenta de nuevo.');
        }
        trace(`generateContent ← OK (${text.length} chars)${attempt > 1 ? ` [intento ${attempt}]` : ''}`);
        return text;
      } catch (err) {
        lastError = err;

        // Un GeminiError propio (JSON vacío, etc.) no es transitorio: no reintentar.
        if (err instanceof GeminiError) {
          throw err;
        }

        // Error transitorio (p.ej. 503 por alta demanda) → reintenta con backoff.
        if (attempt < MAX_ATTEMPTS && isTransientError(err)) {
          const wait = Math.round(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1) * (0.8 + Math.random() * 0.4));
          trace(`generateContent ⚠ transitorio (intento ${attempt}/${MAX_ATTEMPTS}), reintento en ${wait}ms`, err);
          await delay(wait);
          continue;
        }

        break; // Error no transitorio o agotados los reintentos.
      }
    }

    trace('generateContent ← ERROR (fin de reintentos)', lastError);
    throw new GeminiError(this.mapErrorMessage(lastError), lastError);
  }

  /** Convierte el texto JSON forzado en un objeto tipado, validando lo mínimo. */
  private parse<T>(text: string): T {
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GeminiError('Gemini devolvió un JSON inválido. Intenta de nuevo.');
    }
  }

  /** Traduce errores del SDK/HTTP a mensajes amigables en español. */
  private mapErrorMessage(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);

    if (/api key|API_KEY_INVALID|API key not valid/i.test(message)) {
      return 'La API key de Gemini no es válida. Revísala en tu archivo .env.';
    }
    if (/quota|429|RESOURCE_EXHAUSTED/i.test(message)) {
      return 'Se agotó la cuota de Gemini. Espera un momento y reintenta.';
    }
    if (/\b(500|502|503|504)\b|UNAVAILABLE|overloaded|high demand|try again later/i.test(message)) {
      return 'Gemini está saturado ahora mismo (sobrecarga temporal). Se reintentó sin éxito; espera unos segundos y prueba otra vez.';
    }
    if (/fetch|network|Failed to fetch|ENOTFOUND/i.test(message)) {
      return 'Sin conexión con Gemini. Revisa tu internet e inténtalo de nuevo.';
    }
    if (/404|NOT_FOUND|is not found/i.test(message)) {
      return `El modelo "${appEnv.geminiModel}" no está disponible. Verifica NG_APP_GEMINI_MODEL.`;
    }
    return `Error al contactar con Gemini: ${message}`;
  }
}
