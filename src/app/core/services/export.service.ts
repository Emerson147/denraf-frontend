import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoggerService } from './logger.service';

export interface ExportOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private logger = inject(LoggerService);

  /**
   * Exporta datos a Excel (.xlsx)
   */
  exportToExcel(data: any[], filename: string = 'export', sheetName: string = 'Hoja1'): void {
    try {
      if (!data || data.length === 0) {
        console.warn('No hay datos para exportar');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filename}.xlsx`);
      
      console.log('✅ Excel exportado exitosamente');
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      // Fallback a CSV si falla Excel
      this.exportToCSV(data, filename);
    }
  }

  /**
   * Exporta datos a CSV
   */
  exportToCSV(data: any[], filename: string = 'export'): void {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    try {
      // Obtener headers
      const headers = Object.keys(data[0]);
      
      // Crear CSV
      let csv = headers.join(',') + '\n';
      
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escapar comas y comillas
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csv += values.join(',') + '\n';
      });

      // Crear blob y descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ CSV exportado exitosamente');
    } catch (error) {
      console.error('Error exportando CSV:', error);
    }
  }

  /**
   * Exporta datos a PDF con tabla
   */
  exportToPDF(
    data: any[], 
    columns: { header: string, dataKey: string }[],
    options: ExportOptions = {}
  ): void {
    try {
      if (!data || data.length === 0) {
        alert('No hay datos para exportar a PDF');
        return;
      }

      console.log('Generando PDF con:', { data, columns, options });

      const doc = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: options.pageSize || 'a4'
      });

      // Título
      const title = options.title || 'Reporte';
      doc.setFontSize(18);
      doc.setTextColor(28, 25, 23); // stone-900
      doc.text(title, 14, 20);
      
      // Subtítulo con fecha
      doc.setFontSize(10);
      doc.setTextColor(120, 113, 108); // stone-500
      const dateStr = new Date().toLocaleString('es-PE', { 
        dateStyle: 'full', 
        timeStyle: 'short' 
      });
      doc.text(`Generado: ${dateStr}`, 14, 27);

      // Preparar datos de la tabla
      const tableData = data.map(row => 
        columns.map(col => {
          const value = row[col.dataKey];
          // Convertir a string y manejar valores undefined/null
          return value !== undefined && value !== null ? String(value) : '';
        })
      );

      console.log('Datos de tabla:', { headers: columns.map(c => c.header), rows: tableData.length });

      // Tabla
      autoTable(doc, {
        startY: 35,
        head: [columns.map(col => col.header)],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [28, 25, 23], // stone-900
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'left'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        alternateRowStyles: {
          fillColor: [250, 250, 249] // stone-50
        },
        margin: { top: 35, left: 14, right: 14 }
      });

      // Footer con info
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(168, 162, 158); // stone-400
      doc.text(`DenRaf • Página ${pageCount} • ${data.length} registros`, 14, doc.internal.pageSize.height - 10);

      const fileName = `${options.filename || 'reporte'}.pdf`;
      doc.save(fileName);
      
      console.log('✅ PDF exportado exitosamente:', fileName);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('Error al generar PDF. Por favor intenta con CSV o Excel.');
    }
  }

  /**
   * Genera factura/ticket en PDF
   */
  generateInvoice(sale: any): void {
    console.log('🧾 Generando factura:', sale);
    
    // TODO: Implementar generación de factura con jsPDF
    alert('Factura: Funcionalidad en desarrollo');
  }

  /**
   * Genera ticket de venta para impresión térmica (80mm)
   */
  printTicket(sale: any): void {
    try {
      console.log('🖨️ Imprimiendo ticket:', sale);
      
      // Crear ventana de impresión
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      
      if (!printWindow) {
        alert('Por favor permite ventanas emergentes para imprimir');
        return;
      }

      // HTML del ticket (80mm = ~300px)
      const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket #${sale.saleNumber}</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 300px;
              margin: 0 auto;
              padding: 10px;
            }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .header h2 { margin: 5px 0; font-size: 18px; }
            .header p { margin: 3px 0; font-size: 10px; }
            .info { margin: 10px 0; font-size: 11px; }
            .items { margin: 15px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .item-name { flex: 1; }
            .item-price { font-weight: bold; }
            .totals { border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total-row.grand { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 2px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>DenRaf</h2>
            <p>Sistema de Gestión</p>
            <p>RUC: 12345678901</p>
          </div>
          
          <div class="info">
            <p><strong>Ticket:</strong> #${sale.saleNumber}</p>
            <p><strong>Fecha:</strong> ${new Date(sale.saleDate).toLocaleString('es-PE')}</p>
            <p><strong>Cliente:</strong> ${sale.customer?.name || 'Cliente General'}</p>
          </div>
          
          <div class="items">
            <p style="border-bottom: 1px solid #000; padding-bottom: 5px; font-weight: bold;">ITEMS</p>
            ${sale.items.map((item: any) => `
              <div class="item">
                <span class="item-name">${item.quantity}x ${item.productId}</span>
                <span class="item-price">S/ ${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>S/ ${sale.subtotal.toFixed(2)}</span>
            </div>
            ${sale.discount > 0 ? `
              <div class="total-row">
                <span>Descuento:</span>
                <span>- S/ ${sale.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row grand">
              <span>TOTAL:</span>
              <span>S/ ${sale.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>¡Gracias por su compra!</p>
            <p>${new Date().toLocaleDateString('es-PE')}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.write(ticketHTML);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      alert('Error al generar el ticket de impresión');
    }
  }

  /**
   * Exporta datos del dashboard (KPIs + charts)
   */
  exportDashboard(dashboardData: any, format: 'excel' | 'pdf' = 'excel'): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dashboard-${timestamp}`;

    if (format === 'excel') {
      // Preparar múltiples hojas
      const kpisData = [
        { Métrica: 'Margen de Ganancia', Valor: `${dashboardData.profitMargin}%` },
        { Métrica: 'ROI Mensual', Valor: `${dashboardData.roi}%` },
        { Métrica: 'Ticket Promedio', Valor: `S/ ${dashboardData.avgTicket}` },
        { Métrica: 'Tasa de Conversión', Valor: `${dashboardData.conversionRate}%` }
      ];

      this.exportToExcel(kpisData, filename, 'KPIs');
    } else {
      this.exportToPDF([], [], { filename, title: 'Dashboard - DenRaf' });
    }
  }
}
