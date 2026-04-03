import { Injectable, isDevMode } from '@angular/core';

/**
 * Servicio de logging centralizado.
 * Solo registra logs en modo desarrollo para mantener el código silencioso en producción.
 * 
 * @example
 * ```typescript
 * private logger = inject(LoggerService);
 * 
 * this.logger.log('Venta registrada:', sale);
 * this.logger.error('Error al procesar:', error);
 * this.logger.warn('Stock bajo:', product);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isDev = isDevMode();

  /**
   * Registra un mensaje informativo (solo en desarrollo)
   */
  log(...args: unknown[]): void {
    if (this.isDev) {
      console.log(...args);
    }
  }

  /**
   * Registra un error (solo en desarrollo)
   */
  error(...args: unknown[]): void {
    if (this.isDev) {
      console.error(...args);
    }
  }

  /**
   * Registra una advertencia (solo en desarrollo)
   */
  warn(...args: unknown[]): void {
    if (this.isDev) {
      console.warn(...args);
    }
  }

  /**
   * Registra información de depuración (solo en desarrollo)
   */
  debug(...args: unknown[]): void {
    if (this.isDev) {
      console.debug(...args);
    }
  }

  /**
   * Crea un grupo de logs colapsable (solo en desarrollo)
   */
  group(label: string): void {
    if (this.isDev) {
      console.group(label);
    }
  }

  /**
   * Cierra el grupo de logs actual (solo en desarrollo)
   */
  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd();
    }
  }

  /**
   * Registra una tabla de datos (solo en desarrollo)
   */
  table(data: unknown): void {
    if (this.isDev) {
      console.table(data);
    }
  }
}
