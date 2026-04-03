import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';

/**
 * 🔐 Servicio de Criptografía
 * 
 * Proporciona funciones seguras para:
 * - Hash de PINs y contraseñas
 * - Validación de credenciales
 * - Generación de tokens
 * 
 * Utiliza Web Crypto API (SHA-256) para máxima seguridad
 */
@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private logger = inject(LoggerService);

  /**
   * Genera un hash SHA-256 de un PIN
   * @param pin PIN en texto plano
   * @returns Hash hexadecimal del PIN
   */
  async hashPin(pin: string): Promise<string> {
    // Validar PIN
    if (!pin || pin.length < 4) {
      throw new Error('El PIN debe tener al menos 4 caracteres');
    }

    // Convertir string a bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);

    // Generar hash SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convertir buffer a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  }

  /**
   * Verifica si un PIN coincide con su hash
   * @param pin PIN ingresado en texto plano
   * @param hash Hash almacenado
   * @returns true si coinciden
   */
  async verifyPin(pin: string, hash: string): Promise<boolean> {
    try {
      const pinHash = await this.hashPin(pin);
      return pinHash === hash;
    } catch (error) {
      this.logger.error('Error al verificar PIN:', error);
      return false;
    }
  }

  /**
   * Genera un token aleatorio seguro
   * @param length Longitud del token (default: 32)
   * @returns Token hexadecimal
   */
  generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Genera un ID único usando crypto
   * @returns ID único
   */
  generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Valida la fortaleza de un PIN
   * @param pin PIN a validar
   * @returns Objeto con validación y mensaje
   */
  validatePinStrength(pin: string): { valid: boolean; message: string; strength: 'weak' | 'medium' | 'strong' } {
    if (!pin || pin.length < 4) {
      return {
        valid: false,
        message: 'El PIN debe tener al menos 4 caracteres',
        strength: 'weak'
      };
    }

    if (pin.length < 6) {
      return {
        valid: true,
        message: 'PIN válido pero débil',
        strength: 'weak'
      };
    }

    // Verificar si tiene números y letras
    const hasNumbers = /\d/.test(pin);
    const hasLetters = /[a-zA-Z]/.test(pin);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(pin);

    if (pin.length >= 8 && hasNumbers && hasLetters) {
      return {
        valid: true,
        message: 'PIN fuerte',
        strength: 'strong'
      };
    }

    if (pin.length >= 6 && (hasNumbers || hasLetters)) {
      return {
        valid: true,
        message: 'PIN medio',
        strength: 'medium'
      };
    }

    return {
      valid: true,
      message: 'PIN válido',
      strength: 'weak'
    };
  }

  /**
   * Compara dos strings de forma segura (tiempo constante)
   * Previene timing attacks
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
