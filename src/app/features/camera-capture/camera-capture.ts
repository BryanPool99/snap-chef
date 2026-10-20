import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CameraService } from '../../core/services/camera';
import { CapturedImage } from '../../core/models/captured-image.model';

type CapturePhase = 'starting' | 'live' | 'preview' | 'error';

/**
 * Muestra el stream de la cámara en vivo, permite capturar un frame
 * comprimido y emitirlo al flujo mediante `photoTaken`.
 */
@Component({
  selector: 'app-camera-capture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './camera-capture.html',
  styleUrl: './camera-capture.css',
})
export class CameraCapture {
  private readonly camera = inject(CameraService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  /** Emite la imagen capturada y comprimida cuando el usuario confirma. */
  readonly photoTaken = output<CapturedImage>();

  protected readonly phase = signal<CapturePhase>('starting');
  protected readonly errorMessage = signal('');
  protected readonly preview = signal<CapturedImage | null>(null);

  constructor() {
    // El <video> siempre está en el DOM; solo se inicia el stream cuando la vista ya existe.
    afterNextRender(() => {
      void this.startCamera();
    });
    this.destroyRef.onDestroy(() => this.camera.stopStream());
  }

  protected async startCamera(): Promise<void> {
    this.phase.set('starting');
    try {
      await this.camera.startStream(this.videoEl().nativeElement);
      this.phase.set('live');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'No se pudo abrir la cámara.');
      this.phase.set('error');
    }
  }

  protected capture(): void {
    try {
      this.preview.set(this.camera.captureFrame(this.videoEl().nativeElement));
      this.phase.set('preview');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'No se pudo capturar la imagen.');
      this.phase.set('error');
    }
  }

  protected retake(): void {
    this.preview.set(null);
    this.phase.set('live');
  }

  protected confirm(): void {
    const image = this.preview();
    if (image) {
      this.photoTaken.emit(image);
    }
  }
}
