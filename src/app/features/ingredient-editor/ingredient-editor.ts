import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';

/**
 * Editor manual de la lista de ingredientes.
 * Parte de los detectados por la IA y permite añadir/quitar antes de generar la receta.
 */
@Component({
  selector: 'app-ingredient-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ingredient-editor.html',
  styleUrl: './ingredient-editor.css',
})
export class IngredientEditor {
  /** Ingredientes detectados por la IA (solo la primera vez). */
  readonly detected = input.required<readonly string[]>();

  /** Emite la lista final cuando el usuario confirma. */
  readonly confirmed = output<readonly string[]>();

  /** Lista editable; se reinicia si cambian los detectados. */
  protected readonly items = linkedSignal<string[]>(() => [...this.detected()]);

  protected readonly newIngredient = signal('');
  protected readonly canAdd = computed(() => this.newIngredient().trim().length > 0);

  protected add(): void {
    const value = this.newIngredient().trim().toLowerCase();
    if (!value || this.items().includes(value)) {
      this.newIngredient.set('');
      return;
    }
    this.items.update((list) => [...list, value]);
    this.newIngredient.set('');
  }

  protected remove(name: string): void {
    this.items.update((list) => list.filter((i) => i !== name));
  }

  protected confirm(): void {
    this.confirmed.emit(this.items());
  }
}
