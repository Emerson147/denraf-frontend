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
        if (isMultiSectionReport) {
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
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
          });

          const pageHeight = doc.internal.pageSize.height;
          const pageWidth = doc.internal.pageSize.width;

          // ============= HEADER MINIMALISTA =============
          doc.setFillColor(28, 25, 23); // stone-900
          doc.rect(0, 0, pageWidth, 30, 'F');

          doc.setFontSize(20);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.text('DENRAF', 14, 15);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text('Reporte de Analisis Empresarial', 14, 21);

          const dateStr = new Date().toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          doc.setFontSize(7);
          doc.setTextColor(214, 211, 209); // stone-300
          doc.text(dateStr, 14, 26);

          let startY = 38;

          // ============= RESUMEN EJECUTIVO =============
          const resumenData = data['Resumen Ejecutivo'];
          if (resumenData && resumenData.length > 0) {
            doc.setFontSize(11);
            doc.setTextColor(28, 25, 23); // stone-900
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN EJECUTIVO', 14, startY);
            startY += 2;

            // Línea decorativa
            doc.setDrawColor(214, 211, 209); // stone-300
            doc.setLineWidth(0.3);
            doc.line(14, startY, 60, startY);
            startY += 6;

            // Grid de métricas (2 columnas, minimalista)
            const cardWidth = (pageWidth - 38) / 2;
            const cardHeight = 16;
            let cardX = 14;
            let cardY = startY;

            resumenData.forEach((kpi: any, index: number) => {
              if (index > 0 && index % 2 === 0) {
                cardY += cardHeight + 2;
                cardX = 14;
              } else if (index > 0) {
                cardX = 14 + cardWidth + 10;
              }

              // Borde sutil
              doc.setDrawColor(231, 229, 228); // stone-200
              doc.setLineWidth(0.2);
              doc.rect(cardX, cardY, cardWidth, cardHeight);

              // Contenido minimalista
              doc.setFontSize(7);
              doc.setTextColor(120, 113, 108); // stone-500
              doc.setFont('helvetica', 'normal');
              doc.text(kpi.Métrica, cardX + 3, cardY + 4);

              doc.setFontSize(14);
              doc.setTextColor(28, 25, 23); // stone-900
              doc.setFont('helvetica', 'bold');
              doc.text(String(kpi.Valor), cardX + 3, cardY + 11);
            });

            startY = cardY + cardHeight + 8;
          }

          // ============= ANÁLISIS ABC (ZEN) =============
          const abcData = data['Análisis ABC'];
          if (abcData && abcData.length > 0) {
            if (startY > pageHeight - 80) {
              doc.addPage();
              startY = 20;
            }

            doc.setFontSize(11);
            doc.setTextColor(28, 25, 23); // stone-900
            doc.setFont('helvetica', 'bold');
            doc.text('ANALISIS ABC', 14, startY);
            startY += 2;

            doc.setDrawColor(214, 211, 209); // stone-300
            doc.setLineWidth(0.3);
            doc.line(14, startY, 50, startY);
            startY += 1;

            doc.setFontSize(7);
            doc.setTextColor(120, 113, 108); // stone-500
            doc.setFont('helvetica', 'normal');
            doc.text('Regla 80/20 · Productos por importancia', 14, startY + 3);
            startY += 6;

            const headers = Object.keys(abcData[0]);
            const tableData = abcData.map((row: any) =>
              headers.map((header) => String(row[header] || ''))
            );

            (autoTable as any).default(doc, {
              startY: startY,
              head: [headers],
              body: tableData,
              theme: 'plain',
              headStyles: {
                fillColor: [245, 245, 244], // stone-100
                textColor: [28, 25, 23], // stone-900
                fontStyle: 'bold',
                fontSize: 6.5,
                halign: 'left',
                cellPadding: 2,
                lineWidth: 0.1,
                lineColor: [231, 229, 228], // stone-200
              },
              styles: {
                fontSize: 6.5,
                cellPadding: 1.5,
                overflow: 'linebreak',
                textColor: [68, 64, 60], // stone-700
                lineWidth: 0.1,
                lineColor: [245, 245, 244],
              },
              alternateRowStyles: {
                fillColor: [250, 250, 249], // stone-50
              },
              // Colores sutiles por clasificación
              didParseCell: function (data: any) {
                if (data.column.index === 2 && data.section === 'body') {
                  const value = data.cell.raw;
                  if (value === 'A') {
                    data.cell.styles.fillColor = [236, 253, 245]; // green-50 (muy sutil)
                    data.cell.styles.textColor = [22, 101, 52]; // green-800
                    data.cell.styles.fontStyle = 'bold';
                  } else if (value === 'B') {
                    data.cell.styles.fillColor = [254, 252, 232]; // yellow-50 (muy sutil)
                    data.cell.styles.textColor = [161, 98, 7]; // yellow-800
                  } else if (value === 'C') {
                    data.cell.styles.fillColor = [250, 250, 249]; // stone-50
                    data.cell.styles.textColor = [120, 113, 108]; // stone-500
                  }
                }
              },
              margin: { left: 14, right: 14 },
              pageBreak: 'auto',
              rowPageBreak: 'avoid',
            });

            startY = (doc as any).lastAutoTable.finalY + 8;
          }

          // ============= RESUMEN ABC =============
          const resumenABC = data['Resumen ABC'];
          if (resumenABC && resumenABC.length > 0) {
            doc.setFontSize(9);
            doc.setTextColor(28, 25, 23);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumen por Clase', 14, startY);
            startY += 5;

            const headers = Object.keys(resumenABC[0]);
            const tableData = resumenABC.map((row: any) =>
              headers.map((header) => String(row[header] || ''))
            );

            (autoTable as any).default(doc, {
              startY: startY,
              head: [headers],
              body: tableData,
              theme: 'plain',
              headStyles: {
                fillColor: [245, 245, 244],
                textColor: [28, 25, 23],
                fontSize: 6.5,
                cellPadding: 1.5,
                fontStyle: 'bold',
              },
              styles: {
                fontSize: 6.5,
                cellPadding: 1.5,
                textColor: [68, 64, 60],
                lineWidth: 0.1,
                lineColor: [231, 229, 228],
              },
              margin: { left: 14, right: 14 },
            });

            startY = (doc as any).lastAutoTable.finalY + 8;
          }

          // ============= TENDENCIA DE FERIAS =============
          const tendenciaFerias = data['Tendencia Ferias'];
          if (tendenciaFerias && tendenciaFerias.length > 0) {
            if (startY > pageHeight - 60) {
              doc.addPage();
              startY = 20;
            }

            doc.setFontSize(11);
            doc.setTextColor(28, 25, 23); // stone-900
            doc.setFont('helvetica', 'bold');
            doc.text('TENDENCIA DE FERIAS', 14, startY);
            startY += 2;

            doc.setDrawColor(214, 211, 209); // stone-300
            doc.setLineWidth(0.3);
            doc.line(14, startY, 60, startY);
            startY += 1;

            doc.setFontSize(7);
            doc.setTextColor(120, 113, 108); // stone-500
            doc.setFont('helvetica', 'normal');
            doc.text('Promedio movil · Ultimas 4 ferias', 14, startY + 3);
            startY += 6;

            const headers = Object.keys(tendenciaFerias[0]);
            const tableData = tendenciaFerias.map((row: any) =>
              headers.map((header) => String(row[header] || ''))
            );

            (autoTable as any).default(doc, {
              startY: startY,
              head: [headers],
              body: tableData,
              theme: 'plain',
              headStyles: {
                fillColor: [245, 245, 244], // stone-100
                textColor: [28, 25, 23], // stone-900
                fontSize: 6.5,
                cellPadding: 1.5,
                fontStyle: 'bold',
              },
              styles: {
                fontSize: 6.5,
                cellPadding: 1.5,
                textColor: [68, 64, 60],
              },
              didParseCell: function (data: any) {
                if (data.column.index === 3 && data.section === 'body') {
                  const value = data.cell.raw;
                  if (value.includes('Creciendo')) {
                    data.cell.styles.textColor = [22, 101, 52]; // green-800 (verde musgo)
                    data.cell.styles.fontStyle = 'bold';
                  } else if (value.includes('Bajando')) {
                    data.cell.styles.textColor = [185, 28, 28]; // red-700
                    data.cell.styles.fontStyle = 'bold';
                  }
                }
              },
              margin: { left: 14, right: 14 },
            });

            startY = (doc as any).lastAutoTable.finalY + 8;
          }

          // ============= PREDICCIÓN (MINIMALISTA) =============
          const prediccion = data['Predicción'];
          if (prediccion && prediccion.length > 0) {
            if (startY > pageHeight - 50) {
              doc.addPage();
              startY = 20;
            }

            // Caja minimalista
            doc.setDrawColor(214, 211, 209); // stone-300
            doc.setLineWidth(0.5);
            doc.rect(14, startY, pageWidth - 28, 32);

            doc.setFontSize(10);
            doc.setTextColor(28, 25, 23); // stone-900
            doc.setFont('helvetica', 'bold');
            doc.text('PREDICCION PROXIMA FERIA', 18, startY + 6);

            const pred = prediccion[0];
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(68, 64, 60); // stone-700

            let predY = startY + 12;
            doc.text(`Feria: ${pred['Próxima Feria']} - ${pred.Día}`, 18, predY);
            predY += 4;
            doc.text(`Dias restantes: ${pred['Días Restantes']}`, 18, predY);
            predY += 4;
            doc.text(`Ingreso estimado: ${pred['Ingreso Estimado']}`, 18, predY);
            predY += 4;
            doc.text(`Tendencia: ${pred.Tendencia}`, 18, predY);
            predY += 4;
            doc.text(`Stock sugerido: ${pred['Stock Sugerido']}`, 18, predY);
            predY += 4;
            doc.setFontSize(6.5);
            doc.setTextColor(120, 113, 108); // stone-500
            doc.text(`Nivel de confianza: ${pred.Confianza}`, 18, predY);

            startY += 37;
          }

          // ============= OTRAS SECCIONES =============
          const remainingSections = ['Ferias vs Tienda', 'Top Productos', 'Por Categoría'];
          remainingSections.forEach((sectionName) => {
            const sectionData = data[sectionName];
            if (!sectionData || sectionData.length === 0) return;

            if (startY > pageHeight - 60) {
              doc.addPage();
              startY = 20;
            }

            doc.setFontSize(10);
            doc.setTextColor(28, 25, 23);
            doc.setFont('helvetica', 'bold');
            doc.text(sectionName.toUpperCase(), 14, startY);
            startY += 5;

            const headers = Object.keys(sectionData[0]);
            const tableData = sectionData.map((row: any) =>
              headers.map((header) => String(row[header] || ''))
            );

            (autoTable as any).default(doc, {
              startY: startY,
              head: [headers],
              body: tableData,
              theme: 'plain',
              headStyles: {
                fillColor: [245, 245, 244],
                textColor: [28, 25, 23],
                fontSize: 6.5,
                cellPadding: 1.5,
                fontStyle: 'bold',
              },
              styles: {
                fontSize: 6.5,
                cellPadding: 1.5,
                textColor: [68, 64, 60],
                lineWidth: 0.1,
                lineColor: [231, 229, 228],
              },
              alternateRowStyles: {
                fillColor: [250, 250, 249],
              },
              margin: { left: 14, right: 14 },
            });

            startY = (doc as any).lastAutoTable.finalY + 8;
          });

          // ============= RECOMENDACIONES (ZEN) =============
          if (startY > pageHeight - 70) {
            doc.addPage();
            startY = 20;
          }
          // Caja minimalista
          doc.setDrawColor(214, 211, 209); // stone-300
          doc.setLineWidth(0.5);
          doc.rect(14, startY, pageWidth - 28, 55);

          doc.setFontSize(10);
          doc.setTextColor(28, 25, 23); // stone-900
          doc.setFont('helvetica', 'bold');
          doc.text('RECOMENDACIONES ESTRATEGICAS', 18, startY + 6);

          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(68, 64, 60); // stone-700mal');
          doc.setTextColor(68, 64, 60);

          let recY = startY + 13;
          const resumenABCData = data['Resumen ABC'];
          if (resumenABCData) {
            const claseA = resumenABCData.find((r: any) => r.Clase.includes('A'));
            const claseC = resumenABCData.find((r: any) => r.Clase.includes('C'));

            doc.setTextColor(68, 64, 60); // stone-700
            doc.text(`· Productos Clase A: ${claseA?.Cantidad || 0}`, 20, recY);
            recY += 4;
            doc.setTextColor(87, 83, 78); // stone-600
            doc.text('  Mantener stock permanente', 22, recY);
            recY += 6;

            doc.setTextColor(68, 64, 60); // stone-700
            doc.text(`· Productos Clase C: ${claseC?.Cantidad || 0}`, 20, recY);
            recY += 4;
            doc.setTextColor(87, 83, 78); // stone-600
            doc.text('  Considerar liquidacion en proxima feria', 22, recY);
            recY += 6;
          }

          const tendenciaData = data['Tendencia Ferias'];
          if (tendenciaData) {
            tendenciaData.forEach((feria: any) => {
              if (feria.Tendencia.includes('Creciendo')) {
                doc.setTextColor(68, 64, 60);
                doc.text(`· ${feria.Feria} en crecimiento`, 20, recY);
                recY += 4;
                doc.setTextColor(120, 113, 108);
                doc.text('  Aumentar stock en 15-20%', 22, recY);
                recY += 5;
              } else if (feria.Tendencia.includes('Bajando')) {
                doc.setTextColor(68, 64, 60);
                doc.text(`· ${feria.Feria} en descenso`, 20, recY);
                recY += 4;
                doc.setTextColor(120, 113, 108);
                doc.text('  Reducir compras, controlar gastos', 22, recY);
                recY += 5;
              }
            });
          }

          // ============= FOOTER MINIMALISTA =============
          const pageCount = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(6.5);
            doc.setTextColor(168, 162, 158); // stone-400
            doc.setFont('helvetica', 'normal');

            // Línea decorativa sutil
            doc.setDrawColor(231, 229, 228); // stone-200
            doc.setLineWidth(0.2);
            doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

            doc.text(`DENRAF  ·  ${new Date().getFullYear()}`, 14, pageHeight - 8);
            doc.setTextColor(168, 162, 158); // stone-400
            doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

            doc.text(`DENRAF  ·  ${new Date().getFullYear()}`, 14, pageHeight - 8);
            doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 35, pageHeight - 8);
          }

          doc.save(`${filename}.pdf`);
          console.log('✅ PDF Zen Garden exportado:', filename, `(${pageCount} paginas)`);
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
