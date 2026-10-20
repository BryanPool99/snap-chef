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
 * Permite obtener la imagen de ingredientes de dos formas: la cámara en vivo
 * o un archivo subido desde el dispositivo. Ambas rutas comparten la misma
 * compresión y emiten `photoTaken` al confirmar.
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
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** Emite la imagen capturada y comprimida cuando el usuario confirma. */
  readonly photoTaken = output<CapturedImage>();

  protected readonly phase = signal<CapturePhase>('starting');
  protected readonly errorMessage = signal('');
  protected readonly preview = signal<CapturedImage | null>(null);
  /** true si la imagen del preview viene de un archivo subido (no de la cámara). */
  protected readonly fromUpload = signal(false);
  protected readonly isProcessing = signal(false);

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
      this.fromUpload.set(false);
      this.phase.set('live');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'No se pudo abrir la cámara.');
      this.phase.set('error');
    }
  }

  protected capture(): void {
    try {
      this.preview.set(this.camera.captureFrame(this.videoEl().nativeElement));
      this.fromUpload.set(false);
      this.phase.set('preview');
      this.camera.stopStream(); // Libera la cámara mientras se decide.
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'No se pudo capturar la imagen.');
      this.phase.set('error');
    }
  }

  /** Abre el selector de archivos del sistema. */
  protected openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  /** Procesa el archivo elegido: lo comprime y lo muestra en preview. */
  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Permite volver a elegir el mismo archivo más adelante.
    input.value = '';

    if (!file) {
      return;
    }

    this.isProcessing.set(true);
    try {
      this.preview.set(await this.camera.compressFile(file));
      this.fromUpload.set(true);
      this.phase.set('preview');
      this.camera.stopStream();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'No se pudo leer la imagen.');
      this.phase.set('error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  /** Vuelve a la cámara en vivo (reabre el stream si se había liberado). */
  protected retake(): void {
    this.preview.set(null);
    void this.startCamera();
  }

  /** Cambia la foto por un archivo subido, sin volver a la cámara. */
  protected changeToUpload(): void {
    this.openFilePicker();
  }

  protected confirm(): void {
    const image = this.preview();
    if (image) {
      this.photoTaken.emit(image);
    }
  }
}
