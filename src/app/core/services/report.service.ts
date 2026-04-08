import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  proximaFeria: string;
  prediccionProximaFeria: number;

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
  public currentPeriod = signal<'semana' | 'mes' | 'anio'>('semana');

  /**
   * Carga dinámica de las métricas desde Spring Boot
   */
  async fetchReport(periodo: 'semana' | 'mes' | 'anio' = 'semana'): Promise<void> {
    this.isLoading.set(true);
    this.currentPeriod.set(periodo);

    try {
      const response = await firstValueFrom(
        this.http.get<ReporteVentas>(`${this.API_URL}?periodo=${periodo}`)
      );
      this.reportData.set(response);
    } catch (error) {
      this.errorHandler.handleError(error as any, 'Error cargando datos del dashboard');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Dispara una solicitud directa para descargar el reporte en Excel.
   */
  descargarExcel() {
    // Redirigir el navegador a la ruta protegida/no-protegida que escupa el Attachment.
    // O utilizar un fetch() convertiendo a blob y descargando. Utilizaremos fetch con responseType blob.
    this.toastService.info('Generando Excel en el servidor...', 3000, { title: 'Exportar' });
    this.http.get(`${this.API_URL}/exportar/excel?periodo=${this.currentPeriod()}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `reporte-denraf-${this.currentPeriod()}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toastService.success('Excel descargado correctamente');
        },
        error: (err) => this.errorHandler.handleError(err?.message || 'Error desconocido', 'Error descargando Excel')
      });
  }
}
