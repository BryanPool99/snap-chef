import { Injectable, inject } from '@angular/core';
import { CapturedImage, CameraError, CameraErrorCode } from '../models/captured-image.model';
import { appEnv } from '../config/app-env.config';

/**
 * Maneja el stream de video (WebRTC), la captura de frames y su
 * compresión en Canvas para obtener una imagen Base64 optimizada para IA.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private stream: MediaStream | null = null;

  /** Abre la cámara y la conecta al elemento `<video>` indicado. */
  async startStream(video: HTMLVideoElement, facingMode: 'environment' | 'user' = 'environment'): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraError(
        'SecurityError',
        'La cámara solo está disponible en contextos seguros (HTTPS o localhost).',
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        // `ideal` es una preferencia, no una restricción: en desktop no falla.
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
    } catch (err) {
      throw this.mapError(err);
    }

    video.srcObject = this.stream;
    await this.waitForMetadata(video);
    await video.play().catch(() => void 0);
  }

  /** Detiene todos los tracks del stream activo y libera la cámara. */
  stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  /** Dibuja el frame actual del `<video>` en un canvas oculto, lo comprime y devuelve Base64. */
  captureFrame(video: HTMLVideoElement): CapturedImage {
    const { videoWidth, videoHeight } = video;

    if (!videoWidth || !videoHeight) {
      throw new CameraError('UnknownError', 'El video aún no está listo para capturar.');
    }

    // Escala manteniendo proporción, sin superar el lado máximo configurado.
    const scale = Math.min(1, appEnv.imageMaxSize / Math.max(videoWidth, videoHeight));
    const width = Math.round(videoWidth * scale);
    const height = Math.round(videoHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new CameraError('UnknownError', 'No se pudo inicializar el canvas de captura.');
    }

    // Nota: dibuja sin espejar, para que la imagen enviada a la IA sea fiel a la escena.
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', appEnv.imageQuality);

    // Libera la memoria del canvas.
    canvas.width = 0;
    canvas.height = 0;

    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);

    return { base64, dataUrl, width, height, mimeType: 'image/jpeg' };
  }

  /** Espera a que el `<video>` tenga dimensiones válidas antes de capturar. */
  private waitForMetadata(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= 1) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const onReady = () => {
        video.removeEventListener('loadedmetadata', onReady);
        resolve();
      };
      video.addEventListener('loadedmetadata', onReady);
    });
  }

  private mapError(err: unknown): CameraError {
    const knownCodes: readonly CameraErrorCode[] = [
      'NotAllowedError',
      'NotFoundError',
      'NotReadableError',
      'OverconstrainedError',
      'SecurityError',
    ];

    const name = err instanceof DOMException ? err.name : '';
    const code = (knownCodes as readonly string[]).includes(name)
      ? (name as CameraErrorCode)
      : 'UnknownError';

    const messages: Record<CameraErrorCode, string> = {
      NotAllowedError: 'Permiso de cámara denegado. Actívalo en los ajustes del navegador.',
      NotFoundError: 'No se detectó ninguna cámara en el dispositivo.',
      NotReadableError: 'La cámara está en uso por otra aplicación.',
      OverconstrainedError: 'La cámara solicitada no está disponible. Intenta con otra.',
      SecurityError: 'La cámara solo está disponible en contextos seguros (HTTPS o localhost).',
      UnknownError: 'No se pudo acceder a la cámara.',
    };

    return new CameraError(code, messages[code]);
  }
}
