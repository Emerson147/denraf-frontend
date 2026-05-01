import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

export interface BusinessConfig {
  id?: string;
  // === EMPRESA ===
  businessName: string;
  ruc: string;
  address: string;
  phone: string;
  currency: string;
  taxPercent: number;
  ticketFooterMessage: string;
  logoUrl: string;

  // === POS ===
  ticketPrinter: string;
  autoPrint: boolean;
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  lowStockThreshold: number;
  allowNegativeStock: boolean;

  // === MULTI-MONEDA ===
  exchangeRateUSD: number;
  exchangeRateEUR: number;

  // === QR PAGOS ===
  yapeQrUrl: string;
  plinQrUrl: string;
  yapePhone: string;
  plinPhone: string;

  // === MÓDULOS ===
  moduleSizes: boolean;
  moduleColors: boolean;
  moduleBrand: boolean;
  moduleExpiration: boolean;
  moduleSerial: boolean;
  moduleWarranty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/settings`;

  // Estado reactivo global accesible en cualquier componente
  config = signal<BusinessConfig | null>(null);

  constructor() {
    this.loadConfig().subscribe();
  }

  loadConfig() {
    return this.http.get<BusinessConfig>(this.apiUrl).pipe(
      tap(data => this.config.set(data))
    );
  }

  updateConfig(newConfig: BusinessConfig) {
    return this.http.put<BusinessConfig>(this.apiUrl, newConfig).pipe(
      tap(data => this.config.set(data))
    );
  }

  // Helpers rápidos para usar en otros módulos
  get taxRate(): number {
    return (this.config()?.taxPercent ?? 18) / 100;
  }

  get currencySymbol(): string {
    return this.config()?.currency === 'USD' ? '$' : 'S/';
  }

  get exchangeRateUSD(): number {
    return this.config()?.exchangeRateUSD ?? 3.75;
  }
}
