/**
 * Modelo de receta devuelto por Gemini (JSON forzado vía responseSchema).
 */

/** Ingrediente con cantidad, unidad y nombre. */
export interface RecipeIngredient {
  /** Cantidad escrita (ej. "2", "1/2", "al gusto"). */
  readonly quantity: string;
  /** Unidad de medida (ej. "tazas", "gramos"). */
  readonly unit: string;
  /** Nombre del ingrediente. */
  readonly name: string;
}

/** Paso de preparación con instrucción y, si aplica, duración. */
export interface RecipeStep {
  /** Instrucción del paso. */
  readonly instruction: string;
  /** Duración estimada en minutos, si corresponde. */
  readonly durationMinutes?: number;
}

/** Dificultad de la receta. */
export type RecipeDifficulty = 'Fácil' | 'Media' | 'Difícil';

/** Receta completa generada por la IA. */
export interface Recipe {
  /** Título atractivo de la receta. */
  readonly title: string;
  /** Breve descripción. */
  readonly description: string;
  /** Número de porciones. */
  readonly servings: number;
  /** Tiempo de preparación en minutos. */
  readonly prepTimeMinutes: number;
  /** Tiempo de cocción en minutos. */
  readonly cookTimeMinutes: number;
  /** Dificultad. */
  readonly difficulty: RecipeDifficulty;
  /** Lista de ingredientes (los escaneados + los complementarios). */
  readonly ingredients: RecipeIngredient[];
  /** Pasos de preparación en orden. */
  readonly steps: RecipeStep[];
  /** Consejos útiles. */
  readonly tips: string[];
}
