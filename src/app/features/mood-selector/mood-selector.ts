import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Mood } from '../../core/models/mood.model';

/**
 * Selector de "Mood" (intención culinaria).
 * Elige una opción y la emite al confirmar mediante `moodSelected`.
 */
@Component({
  selector: 'app-mood-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mood-selector.html',
  styleUrl: './mood-selector.css',
})
export class MoodSelector {
  /** Catálogo de moods a mostrar. */
  readonly moods = input.required<readonly Mood[]>();

  /** Emite el mood elegido cuando el usuario confirma. */
  readonly moodSelected = output<Mood>();

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed<Mood | null>(
    () => this.moods().find((m) => m.id === this.selectedId()) ?? null,
  );

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected confirm(): void {
    const mood = this.selected();
    if (mood) {
      this.moodSelected.emit(mood);
    }
  }
}
