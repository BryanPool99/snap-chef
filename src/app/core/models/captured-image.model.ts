/**
 * Imagen capturada desde la cámara, ya comprimida y lista para enviar a la IA.
 */
export interface CapturedImage {
  /** Imagen en Base64 (sin el prefijo `data:`), lista para Gemini. */
  readonly base64: string;
  /** Data-URL completa, útil para previsualizar en un `<img>`. */
  readonly dataUrl: string;
  /** Ancho final en píxeles tras la compresión. */
  readonly width: number;
  /** Alto final en píxeles tras la compresión. */
  readonly height: number;
  /** Tipo MIME de la imagen. */
  readonly mimeType: 'image/jpeg';
}

/** Errores tipados que puede lanzar el acceso a la cámara. */
export type CameraErrorCode =
  | 'NotAllowedError'
  | 'NotFoundError'
  | 'NotReadableError'
  | 'OverconstrainedError'
  | 'SecurityError'
  | 'UnknownError';

/** Error de cámara con un código estable para mapearlo a mensajes de UI. */
export class CameraError extends Error {
  constructor(
    readonly code: CameraErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CameraError';
  }
}
