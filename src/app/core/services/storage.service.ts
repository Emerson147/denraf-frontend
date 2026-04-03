import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';

/**
 * 🗄️ Servicio centralizado de Storage
 * 
 * Proporciona acceso tipo-seguro a localStorage con:
 * - Manejo automático de errores
 * - Serialización/deserialización automática
 * - Validación de datos
 * - Logging de operaciones
 * 
 * @example
 * // Guardar productos
 * this.storage.set('products', products);
 * 
 * // Cargar productos con tipo
 * const products = this.storage.get<Product[]>('products');
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PREFIX = 'denraf_';
  private logger = inject(LoggerService);

  /**
   * Obtener un valor del storage
   * @param key Clave sin prefijo
   * @returns Valor deserializado o null si no existe
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);
      
      if (!item) return null;
      
      try {
        const parsed = JSON.parse(item);
        
        // Convertir fechas si es necesario
        return this.parseDates(parsed);
      } catch (error) {
        this.logger.warn(`⚠️ Error parsing ${key}, returning raw value`);
        return item as any;
      }
    } catch (error) {
      this.logger.error(`Error reading ${key}:`, error);
      return null;
    }
  }

  /**
   * Guardar un valor en el storage
   * @param key Clave sin prefijo
   * @param value Valor a guardar (se serializa automáticamente)
   * @returns true si se guardó correctamente
   */
  set<T>(key: string, value: T): boolean {
    try {
      const fullKey = this.getFullKey(key);
      
      // Validar que no sea undefined
      if (value === undefined) {
        this.logger.error('No se puede guardar un valor undefined');
        return false;
      }
      
      // Serializar y guardar
      const serialized = JSON.stringify(value);
      localStorage.setItem(fullKey, serialized);
      
      return true;
    } catch (error) {
      this.logger.error(`Error saving ${key}:`, error);
      return false;
    }
  }

  /**
   * Eliminar un valor del storage
   * @param key Clave sin prefijo
   */
  remove(key: string): boolean {
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      this.logger.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  /**
   * Verificar si existe una clave
   * @param key Clave sin prefijo
   */
  has(key: string): boolean {
    const fullKey = this.getFullKey(key);
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * Limpiar todas las claves con el prefijo
   */
  clear(): boolean {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      this.logger.error('Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Obtener todas las claves con el prefijo
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Obtener el tamaño usado en bytes (aproximado)
   */
  getSize(): number {
    let size = 0;
    this.getAllKeys().forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        size += key.length + item.length;
      }
    });
    return size;
  }

  /**
   * Obtener el tamaño en formato legible
   */
  getSizeFormatted(): string {
    const bytes = this.getSize();
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Obtener estadísticas del storage
   */
  getStats() {
    const keys = this.getAllKeys();
    return {
      totalKeys: keys.length,
      totalSize: this.getSize(),
      sizeFormatted: this.getSizeFormatted(),
      keys: keys.map(k => k.replace(this.PREFIX, ''))
    };
  }

  /**
   * Crear backup de todos los datos
   */
  createBackup(): Blob {
    const data: Record<string, any> = {};
    
    this.getAllKeys().forEach(fullKey => {
      const key = fullKey.replace(this.PREFIX, '');
      const value = this.get(key);
      if (value !== null) {
        data[key] = value;
      }
    });

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data
    };

    return new Blob([JSON.stringify(backup, null, 2)], { 
      type: 'application/json' 
    });
  }

  /**
   * Restaurar desde backup
   */
  restoreBackup(backupData: any): boolean {
    try {
      // Validar estructura
      if (!backupData.data || !backupData.version) {
        this.logger.error('Backup inválido: estructura incorrecta');
        return false;
      }

      // Limpiar datos actuales
      this.clear();

      // Restaurar cada key
      Object.entries(backupData.data).forEach(([key, value]) => {
        this.set(key, value);
      });

      return true;
    } catch (error) {
      this.logger.error('Error restoring backup:', error);
      return false;
    }
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Obtener la key completa con prefijo
   */
  private getFullKey(key: string): string {
    // Si ya tiene el prefijo, no agregarlo de nuevo
    if (key.startsWith(this.PREFIX)) return key;
    return this.PREFIX + key;
  }

  /**
   * Convertir strings de fechas a objetos Date recursivamente
   */
  private parseDates<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    
    // Si es string que parece fecha, convertir
    if (typeof obj === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (dateRegex.test(obj)) {
        return new Date(obj) as any;
      }
      return obj;
    }

    // Si es array, parsear cada elemento
    if (Array.isArray(obj)) {
      return obj.map(item => this.parseDates(item)) as any;
    }

    // Si es objeto, parsear cada propiedad
    if (typeof obj === 'object') {
      const parsed: any = {};
      Object.entries(obj).forEach(([key, value]) => {
        // Convertir propiedades que terminan en 'At' o 'Date'
        if ((key.endsWith('At') || key.endsWith('Date')) && typeof value === 'string') {
          parsed[key] = new Date(value);
        } else {
          parsed[key] = this.parseDates(value);
        }
      });
      return parsed;
    }

    return obj;
  }
}
