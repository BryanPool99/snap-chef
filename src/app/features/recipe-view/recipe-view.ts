import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Recipe } from '../../core/models/recipe.model';

/**
 * Muestra la receta generada e incluye el "Modo Cocina":
 * vista paso a paso con controles grandes y navegación clara.
 */
@Component({
  selector: 'app-recipe-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-view.html',
  styleUrl: './recipe-view.css',
})
export class RecipeView {
  /** Receta a mostrar. */
  readonly recipe = input.required<Recipe>();

  protected readonly cookingMode = signal(false);
  protected readonly stepIndex = signal(0);

  protected readonly totalSteps = computed(() => this.recipe().steps.length);
  protected readonly currentStep = computed(() => this.recipe().steps[this.stepIndex()]);
  protected readonly isFirst = computed(() => this.stepIndex() === 0);
  protected readonly isLast = computed(() => this.stepIndex() === this.totalSteps() - 1);
  protected readonly progress = computed(() => ((this.stepIndex() + 1) / this.totalSteps()) * 100);

  protected enterCooking(): void {
    this.stepIndex.set(0);
    this.cookingMode.set(true);
  }

  protected exitCooking(): void {
    this.cookingMode.set(false);
  }

  protected next(): void {
    this.stepIndex.update((i) => Math.min(i + 1, this.totalSteps() - 1));
  }

  protected prev(): void {
    this.stepIndex.update((i) => Math.max(i - 1, 0));
  }

  /** Minutos totales (preparación + cocción). */
  protected get totalTime(): number {
    return this.recipe().prepTimeMinutes + this.recipe().cookTimeMinutes;
  }
}
