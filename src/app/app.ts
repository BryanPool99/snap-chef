import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MoodSelector } from './features/mood-selector/mood-selector';
import { CameraCapture } from './features/camera-capture/camera-capture';
import { IngredientEditor } from './features/ingredient-editor/ingredient-editor';
import { RecipeView } from './features/recipe-view/recipe-view';
import { MOODS } from './core/config/moods';
import { GeminiService } from './core/services/gemini';
import { Mood } from './core/models/mood.model';
import { CapturedImage } from './core/models/captured-image.model';
import { Recipe } from './core/models/recipe.model';

/** Estados del flujo de usuario. */
type FlowStep = 'mood' | 'camera' | 'detecting' | 'editing' | 'generating' | 'recipe';

/** Etapas que muestran una pantalla de carga. */
const BUSY_STEPS: readonly FlowStep[] = ['detecting', 'generating'];

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoodSelector, CameraCapture, IngredientEditor, RecipeView],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly gemini = inject(GeminiService);

  protected readonly moods = MOODS;

  protected readonly step = signal<FlowStep>('mood');
  protected readonly selectedMood = signal<Mood | null>(null);
  protected readonly capturedImage = signal<CapturedImage | null>(null);
  protected readonly detectedIngredients = signal<readonly string[]>([]);
  protected readonly recipe = signal<Recipe | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  /** Pasos que se resuelven con una llamada a la IA. */
  protected readonly isBusy = () => BUSY_STEPS.includes(this.step());

  constructor() {
    // Al cambiar de paso, vuelve al inicio de la vista.
    effect(() => {
      this.step();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0 });
      }
    });
  }

  /** 1. Mood elegido → abre la cámara. */
  protected onMoodSelected(mood: Mood): void {
    this.selectedMood.set(mood);
    this.step.set('camera');
  }

  /** 2. Foto tomada → detecta ingredientes con Gemini Vision. */
  protected async onPhotoTaken(image: CapturedImage): Promise<void> {
    this.capturedImage.set(image);
    await this.detect(image);
  }

  /** 3. Ingredientes confirmados → genera la receta con el mood elegido. */
  protected async onIngredientsConfirmed(list: readonly string[]): Promise<void> {
    const mood = this.selectedMood();
    if (!mood) {
      return;
    }
    await this.generate(list, mood);
  }

  /** Reintenta la última llamada a la IA que falló. */
  protected retry(): void {
    const image = this.capturedImage();
    if (this.step() === 'detecting' && image) {
      void this.detect(image);
    } else if (this.step() === 'generating') {
      const mood = this.selectedMood();
      if (mood && image) {
        void this.generate(this.detectedIngredients(), mood);
      }
    }
  }

  /** Reinicia el flujo completo desde el principio. */
  protected restart(): void {
    this.selectedMood.set(null);
    this.capturedImage.set(null);
    this.detectedIngredients.set([]);
    this.recipe.set(null);
    this.errorMessage.set(null);
    this.step.set('mood');
  }

  private async detect(image: CapturedImage): Promise<void> {
    this.errorMessage.set(null);
    this.step.set('detecting');
    try {
      this.detectedIngredients.set(await this.gemini.detectIngredients(image));
      this.step.set('editing');
    } catch (err) {
      this.errorMessage.set(this.toMessage(err, 'No se pudieron detectar los ingredientes.'));
    }
  }

  private async generate(list: readonly string[], mood: Mood): Promise<void> {
    this.errorMessage.set(null);
    this.step.set('generating');
    try {
      this.recipe.set(await this.gemini.generateRecipe([...list], mood.systemPrompt));
      this.step.set('recipe');
    } catch (err) {
      this.errorMessage.set(this.toMessage(err, 'No se pudo generar la receta.'));
    }
  }

  private toMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }
}
