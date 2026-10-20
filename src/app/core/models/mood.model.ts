/**
 * "Mood" o intención culinaria que elige el usuario antes de escanear.
 * El `systemPrompt` oculta las instrucciones que guían el estilo de la receta.
 */
export interface Mood {
  /** Identificador estable. */
  readonly id: string;
  /** Emoji representativo. */
  readonly emoji: string;
  /** Título visible para el usuario. */
  readonly label: string;
  /** Breve descripción de la intención. */
  readonly description: string;
  /** Prompt de sistema oculto que se envía a Gemini. No se muestra al usuario. */
  readonly systemPrompt: string;
}
