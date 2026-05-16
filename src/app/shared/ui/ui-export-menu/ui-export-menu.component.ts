import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportService } from '../../../core/services/export.service';
import { ClickOutsideDirective } from '../../directives/click-outside/click-outside.component';
import { ThemeService } from '../../../core/theme/theme.service';

export interface ExportOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  format: 'excel' | 'pdf' | 'csv' | 'print';
}

@Component({
  selector: 'app-ui-export-menu',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective],
  templateUrl: './ui-export-menu.component.html',
  styleUrl: './ui-export-menu.component.css',
})
export class UiExportMenuComponent {
  @Input() data: any = [];
  @Input() type: 'dashboard' | 'sales' | 'inventory' | 'clients' | 'reports' = 'sales';
  @Input() mini: boolean = false; // Modo compacto para botón flotante
  @Output() pdfExport = new EventEmitter<void>(); // Emitir para PDF personalizado
  @Output() excelExport = new EventEmitter<void>(); // Emitir para Excel personalizado

  isOpen = signal(false);
  private exportService = new ExportService();
  themeService = inject(ThemeService);
  isDarkMode = computed(() => this.themeService.darkMode());

  // Opciones según el tipo de datos
  get exportOptions(): ExportOption[] {
    const baseOptions: ExportOption[] = [
      {
        id: 'excel',
        label: 'Excel',
        icon: 'description',
        description: 'Exportar a .xlsx',
        format: 'excel',
      },
      {
        id: 'csv',
        label: 'CSV',
        icon: 'table_chart',
        description: 'Valores separados por comas',
        format: 'csv',
      },
      {
        id: 'pdf',
        label: 'PDF',
        icon: 'picture_as_pdf',
        description: 'Documento portable',
        format: 'pdf',
      },
    ];

    // Agregar opción de impresión para ventas
    if (this.type === 'sales') {
      baseOptions.push({
        id: 'print',
        label: 'Imprimir',
        icon: 'print',
        description: 'Ticket térmico',
        format: 'print',
      });
    }

    return baseOptions;
  }

  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  handleExport(option: ExportOption): void {
    if (!this.data) {
      alert('No hay datos para exportar');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${this.type}-${timestamp}`;

    // Detectar si es un objeto con múltiples secciones (reporte completo)
    const isMultiSectionReport = !Array.isArray(this.data) && typeof this.data === 'object';

    console.log('Exportando:', {
      option,
      type: this.type,
      isMultiSection: isMultiSectionReport,
      sections: isMultiSectionReport ? Object.keys(this.data).length : null,
    });

    switch (option.format) {
      case 'excel':
        if (this.excelExport.observed) {
          this.excelExport.emit();
        } else if (isMultiSectionReport) {
          // Exportar con múltiples hojas
          this.exportMultiSectionToExcel(this.data, filename);
        } else {
          this.exportService.exportToExcel(this.data as any[], filename);
        }
        break;

      case 'csv':
        if (isMultiSectionReport) {
          // Exportar todas las secciones concatenadas
          this.exportMultiSectionToCSV(this.data, filename);
        } else {
          this.exportService.exportToCSV(this.data as any[], filename);
        }
        break;

      case 'pdf':
        // Para ventas, emitir evento para PDF Zen personalizado
        if (this.type === 'sales' && this.pdfExport.observed) {
          this.pdfExport.emit();
        } else if (isMultiSectionReport) {
          // Exportar todas las secciones en un PDF
          this.exportMultiSectionToPDF(this.data, filename);
        } else {
          const columns = this.getColumnsForType();
          this.exportService.exportToPDF(this.data as any[], columns, {
            filename,
            title: this.getTitleForType(),
            orientation: (this.data as any[]).length > 50 ? 'portrait' : 'portrait',
          });
        }
        break;

      case 'print':
        alert('Para imprimir tickets, usa el botón de impresión individual en cada venta');
        break;
    }

    this.closeDropdown();
  }

  private exportMultiSectionToExcel(data: any, filename: string): void {
    import('exceljs')
      .then((ExcelJS) => {
        const workbook = new ExcelJS.default.Workbook();

        // Crear una hoja por cada sección
        Object.keys(data).forEach((sectionName) => {
          const sectionData = data[sectionName];
          if (!sectionData || sectionData.length === 0) return;

          const sheetName = sectionName.substring(0, 31);
          const worksheet = workbook.addWorksheet(sheetName);

          // Headers
          const headers = Object.keys(sectionData[0]);
          const headerRow = worksheet.addRow(headers);

          // Estilo del header (stone-900 con texto blanco)
          headerRow.eachCell((cell) => {
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF1C1917' }, // stone-900
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE7E5E4' } },
              bottom: { style: 'thin', color: { argb: 'FFE7E5E4' } },
              left: { style: 'thin', color: { argb: 'FFE7E5E4' } },
              right: { style: 'thin', color: { argb: 'FFE7E5E4' } },
            };
          });
          headerRow.height = 20;

          // Datos
          sectionData.forEach((rowData: any, rowIndex: number) => {
            const dataRow = worksheet.addRow(Object.values(rowData));
            const isEven = rowIndex % 2 === 0;

            dataRow.eachCell((cell, colNumber) => {
              const columnHeader = headers[colNumber - 1];
              const cellValue = cell.value;

              let fillColor = isEven ? 'FFFAFAF9' : 'FFFFFFFF'; // stone-50 alternado
              let textColor = 'FF44403C'; // stone-700
              let isBold = false;

              // Colores especiales para ABC
              if (
                (sectionName === 'Análisis ABC' || sectionName === 'Resumen ABC') &&
                (columnHeader === 'Clasificación' || columnHeader === 'Clase')
              ) {
                if (cellValue === 'A') {
                  fillColor = 'FFECFDF5'; // green-50
                  textColor = 'FF166534'; // green-800
                  isBold = true;
                } else if (cellValue === 'B') {
                  fillColor = 'FFFEFCE8'; // yellow-50
                  textColor = 'FFA16207'; // yellow-800
                } else if (cellValue === 'C') {
                  fillColor = 'FFFAFAF9'; // stone-50
                  textColor = 'FF78716C'; // stone-500
                }
              }

              cell.font = {
                name: 'Arial',
                size: 10,
                bold: isBold,
                color: { argb: textColor },
              };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: fillColor },
              };
              cell.alignment = {
                vertical: 'middle',
                horizontal: typeof cellValue === 'number' ? 'right' : 'left',
              };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFF5F5F4' } },
                bottom: { style: 'thin', color: { argb: 'FFF5F5F4' } },
                left: { style: 'thin', color: { argb: 'FFF5F5F4' } },
                right: { style: 'thin', color: { argb: 'FFF5F5F4' } },
              };
            });

            dataRow.height = 16;
          });

          // Ajustar anchos de columna
          worksheet.columns.forEach((column, idx) => {
            let maxLength = 10;
            column.eachCell!({ includeEmpty: false }, (cell) => {
              const cellLength = cell.value ? String(cell.value).length : 0;
              if (cellLength > maxLength) maxLength = cellLength;
            });
            column.width = Math.min(maxLength + 2, 50);
          });
        });

        // Descargar archivo
        workbook.xlsx.writeBuffer().then((buffer: any) => {
          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);

          link.setAttribute('href', url);
          link.setAttribute('download', `${filename}.xlsx`);
          link.style.visibility = 'hidden';

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          console.log('✅ Excel profesional exportado:', filename);
        });
      })
      .catch((error) => {
        console.error('Error exportando Excel:', error);
        alert('Error al generar Excel. Verifica que exceljs esté instalado.');
      });
  }

  private exportMultiSectionToCSV(data: any, filename: string): void {
    let csvContent = '';

    // Concatenar todas las secciones
    Object.keys(data).forEach((sectionName, index) => {
      if (index > 0) csvContent += '\n\n';

      // Título de sección
      csvContent += `"=== ${sectionName} ==="\n`;

      const sectionData = data[sectionName];
      if (sectionData.length > 0) {
        // Headers
        const headers = Object.keys(sectionData[0]);
        csvContent += headers.join(',') + '\n';

        // Datos
        sectionData.forEach((row: any) => {
          const values = headers.map((header) => {
            const value = row[header];
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvContent += values.join(',') + '\n';
        });
      }
    });

    // Descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ CSV multi-sección exportado:', filename);
  }

  private exportMultiSectionToPDF(data: any, filename: string): void {
    import('jspdf')
      .then(({ default: jsPDF }) => {
        import('jspdf-autotable').then((autoTable) => {
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const pw = doc.internal.pageSize.width;
          const ph = doc.internal.pageSize.height;
          let y = 0;

          // Paleta Zen Minimalista
          const colors = {
            stone950: [12, 10, 9] as [number, number, number],
            stone900: [28, 25, 23] as [number, number, number],
            stone700: [68, 64, 60] as [number, number, number],
            stone600: [87, 83, 78] as [number, number, number],
            stone500: [120, 113, 108] as [number, number, number],
            stone400: [168, 162, 158] as [number, number, number],
            stone300: [214, 211, 209] as [number, number, number],
            stone200: [231, 229, 228] as [number, number, number],
            stone100: [245, 245, 244] as [number, number, number],
            stone50: [250, 250, 249] as [number, number, number],
            teal700: [15, 118, 110] as [number, number, number],
            teal600: [13, 148, 136] as [number, number, number],
            amber600: [217, 119, 6] as [number, number, number],
            emerald600: [5, 150, 105] as [number, number, number],
            rose600: [225, 29, 72] as [number, number, number],
            white: [255, 255, 255] as [number, number, number],
          };

          const margin = { left: 16, right: 16, top: 20 };
          const contentWidth = pw - margin.left - margin.right;

          const drawLine = (yPos: number, color = colors.stone200, thickness = 0.3) => {
            doc.setDrawColor(...color);
            doc.setLineWidth(thickness);
            doc.line(margin.left, yPos, pw - margin.right, yPos);
          };

          const drawSectionHeader = (title: string, yPos: number): number => {
            doc.setFillColor(...colors.stone700);
            doc.circle(margin.left + 2, yPos - 1.5, 1.5, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.stone900);
            doc.text(title, margin.left + 8, yPos);
            return yPos + 8;
          };

          const addPage = () => { doc.addPage(); y = margin.top; return y; };
          const checkPageBreak = (neededSpace: number): number => {
            if (y + neededSpace > ph - 25) return addPage();
            return y;
          };

          // 📄 PÁGINA 1: PORTADA
          y = 22;
          doc.setFontSize(22);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.stone900);
          
          let reportTitle = 'Reporte Ejecutivo';
          if (this.type === 'sales') reportTitle = 'Historial de Ventas';
          if (this.type === 'dashboard') reportTitle = 'Dashboard Analítico';
          if (this.type === 'reports') reportTitle = 'Reporte Empresarial';

          doc.text(reportTitle, margin.left, y);
          y += 6;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.stone500);
          doc.text('DenRaf · Reporte detallado de datos', margin.left, y);
          y += 10;

          drawLine(y, colors.stone300, 0.5);
          y += 8;

          doc.setFontSize(9);
          doc.setTextColor(...colors.stone600);
          const dateGenerated = new Date().toLocaleString('es-PE', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
          doc.text(`Generado: ${dateGenerated}`, margin.left, y);
          doc.text(`Período: Dinámico / Filtrado`, pw / 2, y);
          y += 12;

          // ============= RESUMEN EJECUTIVO (Cards Horizontales) =============
          const resumenData = data['Resumen Ejecutivo'];
          if (resumenData && resumenData.length > 0) {
            const numCards = Math.min(resumenData.length, 3);
            const metricBoxWidth = (contentWidth - ((numCards - 1) * 5)) / numCards;
            const metricBoxHeight = 28;

            resumenData.slice(0, 3).forEach((kpi: any, idx: number) => {
              const x = margin.left + idx * (metricBoxWidth + 5);
              
              doc.setFillColor(...colors.stone100);
              doc.roundedRect(x, y, metricBoxWidth, metricBoxHeight, 3, 3, 'F');

              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...colors.stone500);
              doc.text(kpi.Métrica.toUpperCase(), x + 5, y + 8);

              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              // Alternar colores por posición para seguir el estilo
              let valColor = colors.stone700;
              if (idx === 1) valColor = colors.amber600;
              if (idx === 2) valColor = colors.teal600;

              doc.setTextColor(...valColor);
              doc.text(String(kpi.Valor), x + 5, y + 18);
            });
            y += metricBoxHeight + 12;

            // Extra KPIs si hay más de 3
            if (resumenData.length > 3) {
              y = drawSectionHeader('Métricas Adicionales', y);
              const extraData = resumenData.slice(3).map((k: any) => [k.Métrica, String(k.Valor)]);
              (autoTable as any).default(doc, {
                startY: y,
                body: extraData,
                theme: 'plain',
                styles: { fontSize: 8, cellPadding: 2, textColor: colors.stone700 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { textColor: colors.teal700, fontStyle: 'bold' } },
                margin: { left: margin.left }
              });
              y = (doc as any).lastAutoTable.finalY + 12;
            }
          }

          // ============= OTRAS SECCIONES =============
          const specialSections = ['Resumen Ejecutivo'];
          const remainingSections = Object.keys(data).filter(k => !specialSections.includes(k));

          remainingSections.forEach((sectionName) => {
            const sectionData = data[sectionName];
            if (!sectionData || sectionData.length === 0) return;

            y = checkPageBreak(40);
            y = drawSectionHeader(sectionName, y);

            const headers = Object.keys(sectionData[0]);
            const tableData = sectionData.map((row: any) =>
              headers.map((header) => String(row[header] || ''))
            );

            // Verificar si es una tabla muy ancha o estándar
            const isSmallTable = headers.length <= 4;

            (autoTable as any).default(doc, {
              startY: y,
              head: [headers],
              body: tableData,
              theme: 'striped',
              headStyles: {
                fillColor: colors.stone900,
                textColor: colors.white,
                fontSize: 8,
                fontStyle: 'bold'
              },
              styles: {
                fontSize: 8,
                cellPadding: 2,
                textColor: colors.stone700,
              },
              alternateRowStyles: {
                fillColor: colors.stone50,
              },
              margin: { left: margin.left, right: margin.right },
              tableWidth: isSmallTable ? contentWidth * 0.8 : contentWidth,
            });

            y = (doc as any).lastAutoTable.finalY + 12;
          });

          // ============= FOOTER MINIMALISTA =============
          const pageCount = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(6.5);
            doc.setTextColor(...colors.stone400);
            doc.setFont('helvetica', 'normal');

            // Línea decorativa sutil
            doc.setDrawColor(...colors.stone200);
            doc.setLineWidth(0.2);
            doc.line(14, ph - 12, pw - 14, ph - 12);

            doc.text(`DenRaf - ${reportTitle} - Exportado`, 14, ph - 8);
            doc.text(`Página ${i} de ${pageCount}`, pw - 35, ph - 8);
          }

          doc.save(`${filename}.pdf`);
          console.log('✅ PDF Zen Garden exportado:', filename, `(${pageCount} páginas)`);
        });
      })
      .catch((error) => {
        console.error('Error exportando PDF:', error);
        alert('Error al generar PDF. Intenta con Excel o CSV.');
      });
  }

  private getColumnsForType(): { header: string; dataKey: string }[] {
    switch (this.type) {
      case 'sales':
        return [
          { header: 'Nº Venta', dataKey: 'Nº Venta' },
          { header: 'Fecha', dataKey: 'Fecha' },
          { header: 'Cliente', dataKey: 'Cliente' },
          { header: 'Items', dataKey: 'Items' },
          { header: 'Total', dataKey: 'Total' },
          { header: 'Estado', dataKey: 'Estado' },
        ];

      case 'inventory':
        return [
          { header: 'Producto', dataKey: 'name' },
          { header: 'Categoría', dataKey: 'category' },
          { header: 'Stock', dataKey: 'stock' },
          { header: 'Precio', dataKey: 'price' },
        ];

      case 'clients':
        return [
          { header: 'Nombre', dataKey: 'name' },
          { header: 'Email', dataKey: 'email' },
          { header: 'Teléfono', dataKey: 'phone' },
        ];

      case 'reports':
        return [
          { header: 'Producto', dataKey: 'Producto' },
          { header: 'Vendidas', dataKey: 'Unidades Vendidas' },
          { header: 'Ingresos', dataKey: 'Ingresos (S/)' },
          { header: 'Tendencia', dataKey: 'Tendencia' },
        ];

      default:
        // Detectar columnas automáticamente del primer objeto
        if (this.data.length > 0) {
          const firstRow = this.data[0];
          return Object.keys(firstRow).map((key) => ({
            header: key,
            dataKey: key,
          }));
        }
        return [];
    }
  }

  private getTitleForType(): string {
    const titles = {
      dashboard: 'Dashboard - Análisis Empresarial',
      sales: 'Reporte de Ventas',
      inventory: 'Inventario de Productos',
      clients: 'Lista de Clientes',
      reports: 'Reportes',
    };
    return titles[this.type] || 'Exportación';
  }
}
