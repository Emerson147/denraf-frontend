import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { LoggerService } from './logger.service';

export interface ErrorLog {
  timestamp: Date;
  message: string;
  stack?: string;
  context?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private toastService = inject(ToastService);
  private logger = inject(LoggerService);
  
  private readonly CRITICAL_ERRORS_KEY = 'denraf_critical_errors';
  private errorLogs: ErrorLog[] = [];
  private readonly MAX_LOGS = 100;

  /**
   * Maneja errores de forma centralizada con logging y notificación al usuario
   */
  handleError(error: Error | string, context?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Log del error
    this.logError({
      timestamp: new Date(),
      message: errorMessage,
      stack: errorStack,
      context,
      severity
    });

    // Notificar al usuario según severidad
    this.notifyUser(errorMessage, severity, context);

    // Log en consola para debugging (solo en desarrollo)
    if (this.isDevelopment()) {
      this.logger.error(`[${severity.toUpperCase()}] ${context || 'Error'}:`, error);
    }
  }

  /**
   * Maneja errores de operaciones asíncronas
   */
  async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    context: string,
    errorMessage?: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const message = errorMessage || `Error en ${context}`;
      this.handleError(error as Error, context, 'medium');
      return null;
    }
  }

  /**
   * Wrapper para operaciones síncronas con manejo de errores
   */
  handleSyncOperation<T>(
    operation: () => T,
    context: string,
    errorMessage?: string
  ): T | null {
    try {
      return operation();
    } catch (error) {
      const message = errorMessage || `Error en ${context}`;
      this.handleError(error as Error, context, 'medium');
      return null;
    }
  }

  /**
   * Valida operación crítica (lanza excepción si falla)
   */
  validateCriticalOperation<T>(
    operation: () => T,
    context: string,
    validationMessage: string
  ): T {
    try {
      const result = operation();
      if (!result) {
        throw new Error(validationMessage);
      }
      return result;
    } catch (error) {
      this.handleError(error as Error, context, 'critical');
      throw error; // Re-throw para que el caller pueda manejar
    }
  }

  /**
   * Registra error en el log interno
   */
  private logError(log: ErrorLog): void {
    this.errorLogs.unshift(log);
    
    // Mantener solo los últimos MAX_LOGS errores
    if (this.errorLogs.length > this.MAX_LOGS) {
      this.errorLogs = this.errorLogs.slice(0, this.MAX_LOGS);
    }

    // Persistir logs críticos en localStorage
    if (log.severity === 'critical' || log.severity === 'high') {
      this.persistCriticalError(log);
    }
  }

  /**
   * Notifica al usuario según la severidad del error
   */
  private notifyUser(message: string, severity: ErrorLog['severity'], context?: string): void {
    const userMessage = this.getUserFriendlyMessage(message, context);

    switch (severity) {
      case 'low':
        // No mostrar toast, solo log silencioso
        break;
      
      case 'medium':
        this.toastService.show(userMessage, 'warning');
        break;
      
      case 'high':
        this.toastService.show(userMessage, 'error');
        break;
      
      case 'critical':
        this.toastService.show('⚠️ Error crítico: ' + userMessage, 'error');
        break;
    }
  }

  /**
   * Convierte mensajes técnicos en mensajes amigables
   */
  private getUserFriendlyMessage(technicalMessage: string, context?: string): string {
    // Mensajes comunes mapeados a lenguaje amigable
    const friendlyMessages: Record<string, string> = {
      'Network error': 'No se pudo conectar al servidor. Verifica tu conexión.',
      'Cannot read property': 'Ocurrió un error al procesar los datos.',
      'undefined is not an object': 'Datos incompletos. Intenta nuevamente.',
      'Failed to fetch': 'No se pudo cargar la información. Revisa tu conexión.',
      'Timeout': 'La operación tardó demasiado. Intenta de nuevo.',
      'Permission denied': 'No tienes permisos para realizar esta acción.',
      'Invalid input': 'Los datos ingresados no son válidos.',
      'Not found': 'El recurso solicitado no existe.',
    };

    // Buscar coincidencia parcial
    for (const [key, value] of Object.entries(friendlyMessages)) {
      if (technicalMessage.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // Mensaje genérico con contexto
    if (context) {
      return `Error en ${context}. Por favor, intenta nuevamente.`;
    }

    return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
  }

  /**
   * Persiste errores críticos en localStorage
   */
  private persistCriticalError(log: ErrorLog): void {
    const criticalLogs = this.getCriticalLogs();
    criticalLogs.unshift(log);
    
    // Mantener solo los últimos 20 errores críticos
    const logsToSave = criticalLogs.slice(0, 20);
    
    try {
      localStorage.setItem(this.CRITICAL_ERRORS_KEY, JSON.stringify(logsToSave));
    } catch (error) {
      this.logger.error('Error saving critical logs:', error);
    }
  }

  /**
   * Obtiene logs críticos persistidos
   */
  getCriticalLogs(): ErrorLog[] {
    try {
      const stored = localStorage.getItem(this.CRITICAL_ERRORS_KEY);
      if (!stored) return [];
      const logs = JSON.parse(stored);
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      this.logger.error('Error loading critical logs:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los logs de la sesión actual
   */
  getSessionLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Limpia los logs de la sesión
   */
  clearSessionLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Limpia los logs críticos persistidos
   */
  clearCriticalLogs(): void {
    try {
      localStorage.removeItem(this.CRITICAL_ERRORS_KEY);
    } catch (error) {
      this.logger.error('Error clearing critical logs:', error);
    }
  }

  /**
   * Verifica si estamos en modo desarrollo
   */
  private isDevelopment(): boolean {
    return !this.isProduction();
  }

  /**
   * Verifica si estamos en producción
   */
  private isProduction(): boolean {
    // En Angular, puedes usar: return !isDevMode();
    return false; // Por ahora siempre en desarrollo
  }

  /**
   * Exporta logs para análisis
   */
  exportLogs(): string {
    const allLogs = {
      session: this.errorLogs,
      critical: this.getCriticalLogs(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(allLogs, null, 2);
  }

  /**
   * Recuperación automática para operaciones comunes
   */
  async autoRecover<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context: string = 'Operación'
  ): Promise<T | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Log de retry
          this.handleError(
            `Intento ${attempt}/${maxRetries} falló. Reintentando...`,
            context,
            'low'
          );
          
          // Esperar antes de reintentar (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }
    
    // Todos los intentos fallaron
    this.handleError(
      lastError || new Error('Operación falló después de múltiples intentos'),
      context,
      'high'
    );
    
    return null;
  }

  /**
   * Utilidad para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
