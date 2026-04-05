import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { map, Observable } from 'rxjs';

export interface LiquidacionResumen {
  totalCapital: number;
  capitalActivo: number;
  capitalLento: number;
  capitalCongelado: number;
  metaLiberacion: number;
  ratioLiquidez: number;
  productosCongelados: number;
  productosLentos: number;
  productosActivos: number;
}

export interface LiquidacionItem {
  productoId: string;
  nombre: string;
  categoria: string;
  stock: number;
  costo: number;
  precioActual: number;
  diasSinVender: number;
  feriasSinVender: number;
  rotacionPorFeria: number;
  estado: 'ACTIVO' | 'LENTO' | 'CONGELADO';
  precioConDescuento20: number;
  precioConDescuento30: number;
  precioConDescuento40: number;
  precioCongelado: number;
  capitalCongelado: number;
  potencialRecuperacion: number;
}

export interface LiquidacionResponse {
  resumen: LiquidacionResumen;
  productos: LiquidacionItem[];
}

@Injectable({
  providedIn: 'root'
})
export class BackendLiquidacionService {
  private api = inject(ApiService);

  /**
   * Obtiene TODAS las liquidaciones y el resumen maestro
   */
  getLiquidaciones(): Observable<LiquidacionResponse> {
    return this.api.get<LiquidacionResponse>('liquidacion');
  }

  /**
   * Obtiene únicamente los productos en estado CONGELADO (>8 ferias)
   */
  getCongelados(): Observable<LiquidacionItem[]> {
    return this.api.get<LiquidacionItem[]>('liquidacion/congelados');
  }

  /**
   * Obtiene únicamente los productos en estado LENTO (4 a 8 ferias)
   */
  getLentos(): Observable<LiquidacionItem[]> {
    return this.api.get<LiquidacionItem[]>('liquidacion/lentos');
  }

  /**
   * Obtiene únicamente el resumen financiero
   */
  getResumen(): Observable<LiquidacionResumen> {
    return this.api.get<LiquidacionResumen>('liquidacion/resumen');
  }
}
