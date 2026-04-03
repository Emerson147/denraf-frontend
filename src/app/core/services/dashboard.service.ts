import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DashboardResponse } from '../models';
import { finalize, tap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private baseUrl = `${environment.apiUrl}/dashboard`;

  // Estado reactivo (Signal)
  public dashboardData = signal<DashboardResponse | null>(null);
  public isLoading = signal<boolean>(false);

  /**
   * Obtiene los datos del dashboard calculados por el backend.
   * @param periodo puede ser 'hoy', 'semana', 'mes', 'anio'
   */
  async fetchDashboardData(periodo: string = 'semana'): Promise<void> {
    this.isLoading.set(true);

    try {
      let params = new HttpParams();
      
      // Manejo estricto de la API en base a la línea 24 y 32 del Controller Java
      let requestUrl = this.baseUrl;
      if (periodo === 'hoy') {
        requestUrl = `${this.baseUrl}/hoy`;
      } else {
        params = params.set('periodo', periodo);
      }

      const request = this.http.get<DashboardResponse>(requestUrl, { params }).pipe(
        tap((data) => this.dashboardData.set(data)),
        finalize(() => this.isLoading.set(false))
      );

      await firstValueFrom(request);
    } catch (error) {
      this.toastService.error('Ocurrió un error al cargar los datos del dashboard financiero.');
      this.isLoading.set(false);
      console.error('Dashboard Error:', error);
    }
  }
}
