import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * 🚀 Estrategia de precarga inteligente (Fase 2)
 * 
 * Precarga rutas frecuentes después de la carga inicial:
 * - Dashboard: Precarga inmediata (high priority)
 * - POS: Precarga en 2 segundos (high priority) 
 * - Reports: Precarga en 5 segundos (medium priority)
 * - Resto: No precarga (lazy load on demand)
 * 
 * Beneficios:
 * - Navegación instantánea a rutas frecuentes
 * - No bloquea carga inicial
 * - Optimiza UX en rutas prioritarias
 */
@Injectable({ providedIn: 'root' })
export class CustomPreloadingStrategy implements PreloadingStrategy {
  
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // ❌ Si no tiene data o preload está deshabilitado, no precargar
    if (!route.data || !route.data['preload']) {
      return of(null);
    }

    // ✅ Obtener delay de la configuración (default: 0ms = inmediato)
    const delay = route.data['preloadDelay'] || 0;
    
    // 🚀 Precargar después del delay especificado
    return timer(delay).pipe(
      mergeMap(() => {
        // console.log(`🔄 Precargando ruta: ${route.path} (delay: ${delay}ms)`);
        return load();
      })
    );
  }
}
