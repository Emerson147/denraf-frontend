import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';
import { ToastService } from './toast.service';

export interface ReporteVentas {
  ingresosTotales: number;
  gananciaNeta: number;
  productosVendidos: number;
  totalVentas: number;
  ticketPromedio: number;
  crecimientoSemanal: number;

  ventasPorDia: Record<string, number>;
  ventasPorSemana: Record<string, number>;

  nombreFeriaJueves: string;
  nombreFeriaDomingo: string;
  ventasFerias: number;
  gananciaFerias: number;
  ventasTienda: number;
  gananciaTienda: number;
  mejorFeria: string;
  ingresosMejorFeria: number;

  topProductos: { nombre: string; categoria: string; unidadesVendidas: number; ingresos: number; margen: number }[];
  ventasPorCategoria: Record<string, number>;
  ventasPorVendedor: { nombre: string; totalVentas: number; totalIngresos: number; ticketPromedio: number; participacion: number }[];

  productosA: { nombre: string; categoria: string; unidades: number; ingresos: number; porcentajeDelTotal: number; clasificacion: string }[];
  productosB: { nombre: string; categoria: string; unidades: number; ingresos: number; porcentajeDelTotal: number; clasificacion: string }[];
  productosC: { nombre: string; categoria: string; unidades: number; ingresos: number; porcentajeDelTotal: number; clasificacion: string }[];

  promedioMovilJueves: number;
  promedioMovilDomingo: number;
  tendenciaJueves: string;
  tendenciaDomingo: string;
  proximaFeria: string;
  prediccionProximaFeria: number;
  tendenciaProximaFeria: string;
  confianzaProximaFeria: string;

  ventasAnuladas: number;
  totalDescuentos: number;
  ventasPorMetodoPago: Record<string, number>;
  ventasPorHora: { diaSemana: string; hora: number; cantidadVentas: number; ingresos: number }[];

  desde: string;
  hasta: string;
  periodo: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);
  private toastService = inject(ToastService);
  
  private readonly API_URL = `${environment.apiUrl}/reportes`;

  // Estado Central
  public reportData = signal<ReporteVentas | null>(null);
  public isLoading = signal<boolean>(true);
  public currentPeriod = signal<string>('semana');
  public currentDesde = signal<string | null>(null);
  public currentHasta = signal<string | null>(null);

  /**
   * Carga dinámica de las métricas desde Spring Boot
   */
  async fetchReport(periodo: string = 'semana', startDate?: string, endDate?: string): Promise<void> {
    this.isLoading.set(true);
    this.currentPeriod.set(periodo);
    this.currentDesde.set(startDate || null);
    this.currentHasta.set(endDate || null);

    try {
      let params = new HttpParams();
      let requestUrl = this.API_URL;

      if (periodo === 'hoy') {
        params = params.set('periodo', 'hoy');
      } else {
        params = params.set('periodo', periodo);
        if (startDate && endDate) {
          params = params.set('desde', startDate + 'T00:00:00');
          params = params.set('hasta', endDate + 'T23:59:59');
        }
      }

      const response = await firstValueFrom(
        this.http.get<ReporteVentas>(requestUrl, { params })
      );
      this.reportData.set(response);
    } catch (error) {
      this.errorHandler.handleError(error as any, 'Error cargando datos del reporte');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Dispara una solicitud directa para descargar el reporte en Excel.
   */
  descargarExcel() {
    this.toastService.info('Generando Excel en el servidor...', 3000, { title: 'Exportar' });
    
    let url = `${this.API_URL}/exportar/excel?periodo=${this.currentPeriod()}`;
    if (this.currentPeriod() === 'custom' && this.currentDesde() && this.currentHasta()) {
      url += `&desde=${this.currentDesde()}T00:00:00&hasta=${this.currentHasta()}T23:59:59`;
    }

    this.http.get(url, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const dlUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = dlUrl;
          a.download = `reporte-denraf-${this.currentPeriod()}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(dlUrl);
          this.toastService.success('Excel descargado correctamente');
        },
        error: (err) => this.errorHandler.handleError(err?.message || 'Error desconocido', 'Error descargando Excel')
      });
  }
}
