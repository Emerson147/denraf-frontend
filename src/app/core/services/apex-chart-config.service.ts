import { Injectable } from '@angular/core';
import { ApexOptions } from 'ng-apexcharts';

@Injectable({
  providedIn: 'root'
})
export class ApexChartConfigService {
  
  /**
   * Configuración base para todos los gráficos
   * Tema oscuro minimalista con colores stone
   */
  getBaseConfig(): Partial<ApexOptions> {
    return {
      chart: {
        type: 'line',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        foreColor: '#e7e5e4', // stone-200
        background: 'transparent',
        toolbar: {
          show: false
        },
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      theme: {
        mode: 'dark',
        palette: 'palette1'
      },
      grid: {
        borderColor: '#292524', // stone-800
        strokeDashArray: 4,
        padding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      tooltip: {
        theme: 'dark',
        style: {
          fontSize: '12px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        },
        x: {
          show: true
        },
        y: {
          formatter: (value: number) => {
            return `S/ ${value.toFixed(2)}`;
          }
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        show: false,
        position: 'top',
        horizontalAlign: 'left',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
        labels: {
          colors: '#e7e5e4' // stone-200
        },
        markers: {
          offsetX: 0,
          offsetY: 0
        }
      }
    };
  }

  /**
   * Paleta de colores del sistema (stone + acentos)
   */
  getColors() {
    return {
      primary: '#a8a29e', // stone-400
      secondary: '#78716c', // stone-500
      accent: '#d6d3d1', // stone-300
      success: '#86efac', // green-300
      warning: '#fde047', // yellow-300
      danger: '#fca5a5', // red-300
      info: '#93c5fd', // blue-300
      purple: '#c084fc', // purple-400
      amber: '#fbbf24' // amber-400
    };
  }

  /**
   * Configuración para gráfico de área (ventas en el tiempo)
   */
  getAreaChartConfig(options: {
    series: any[];
    categories: string[];
    height?: number;
  }): ApexOptions {
    const colors = this.getColors();
    
    return {
      ...this.getBaseConfig(),
      series: options.series,
      chart: {
        ...this.getBaseConfig().chart,
        type: 'area',
        height: options.height || 350,
        zoom: {
          enabled: false
        }
      },
      colors: [colors.primary, colors.accent],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      },
      xaxis: {
        categories: options.categories,
        labels: {
          style: {
            colors: '#a8a29e', // stone-400
            fontSize: '12px'
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#a8a29e', // stone-400
            fontSize: '12px'
          },
          formatter: (value: number) => {
            return `S/ ${value.toFixed(0)}`;
          }
        }
      }
    };
  }

  /**
   * Configuración para gráfico de barras (productos, vendedores)
   */
  getBarChartConfig(options: {
    series: any[];
    categories: string[];
    height?: number;
    horizontal?: boolean;
  }): ApexOptions {
    const colors = this.getColors();
    
    return {
      ...this.getBaseConfig(),
      series: options.series,
      chart: {
        ...this.getBaseConfig().chart,
        type: 'bar',
        height: options.height || 350
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: options.horizontal || false,
          columnWidth: '60%',
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: [colors.primary, colors.accent, colors.success],
      xaxis: {
        categories: options.categories,
        labels: {
          style: {
            colors: '#a8a29e', // stone-400
            fontSize: '12px'
          }
        },
        axisBorder: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#a8a29e', // stone-400
            fontSize: '12px'
          },
          formatter: (value: number) => {
            return `S/ ${value.toFixed(0)}`;
          }
        }
      }
    };
  }

  /**
   * Configuración para gráfico de dona (categorías, porcentajes)
   */
  getDonutChartConfig(options: {
    series: number[];
    labels: string[];
    height?: number;
  }): ApexOptions {
    const colors = this.getColors();
    
    return {
      ...this.getBaseConfig(),
      series: options.series,
      chart: {
        ...this.getBaseConfig().chart,
        type: 'donut',
        height: options.height || 350
      },
      labels: options.labels,
      colors: [
        colors.primary,
        colors.secondary,
        colors.accent,
        colors.success,
        colors.warning,
        colors.purple,
        colors.amber
      ],
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '16px',
                color: '#e7e5e4', // stone-200
                offsetY: -10
              },
              value: {
                show: true,
                fontSize: '24px',
                fontWeight: 600,
                color: '#fafaf9', // stone-50
                offsetY: 10,
                formatter: (val: string) => {
                  return `S/ ${parseFloat(val).toFixed(0)}`;
                }
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: '14px',
                color: '#a8a29e', // stone-400
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return `S/ ${total.toFixed(0)}`;
                }
              }
            }
          }
        }
      },
      legend: {
        ...this.getBaseConfig().legend,
        show: true,
        position: 'bottom'
      },
      dataLabels: {
        enabled: false
      }
    };
  }

  /**
   * Configuración para gráfico radial (progreso, logros)
   */
  getRadialChartConfig(options: {
    series: number[];
    labels: string[];
    height?: number;
  }): ApexOptions {
    const colors = this.getColors();
    
    return {
      ...this.getBaseConfig(),
      series: options.series,
      chart: {
        ...this.getBaseConfig().chart,
        type: 'radialBar',
        height: options.height || 350
      },
      plotOptions: {
        radialBar: {
          offsetY: 0,
          startAngle: 0,
          endAngle: 270,
          hollow: {
            margin: 5,
            size: '30%',
            background: 'transparent'
          },
          dataLabels: {
            name: {
              show: true,
              color: '#e7e5e4', // stone-200
              fontSize: '14px'
            },
            value: {
              show: true,
              color: '#fafaf9', // stone-50
              fontSize: '24px',
              fontWeight: 600
            },
            total: {
              show: true,
              label: 'Progreso',
              fontSize: '14px',
              color: '#a8a29e', // stone-400
              formatter: () => {
                return '75%';
              }
            }
          },
          track: {
            background: '#292524', // stone-800
            strokeWidth: '100%'
          }
        }
      },
      colors: [colors.success, colors.warning, colors.info, colors.purple],
      labels: options.labels,
      legend: {
        ...this.getBaseConfig().legend,
        show: true,
        floating: true,
        position: 'left',
        offsetX: 0,
        offsetY: 15
      }
    };
  }

  /**
   * Configuración para sparkline (mini gráficos)
   */
  getSparklineConfig(options: {
    series: any[];
    type?: 'line' | 'area' | 'bar';
    color?: string;
  }): ApexOptions {
    const colors = this.getColors();
    
    return {
      chart: {
        type: options.type || 'line',
        height: 60,
        sparkline: {
          enabled: true
        },
        animations: {
          enabled: true,
          speed: 400
        }
      },
      series: options.series,
      stroke: {
        curve: 'smooth',
        width: 2
      },
      colors: [options.color || colors.primary],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0.1
        }
      },
      tooltip: {
        theme: 'dark',
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        y: {
          formatter: (value: number) => {
            return `S/ ${value.toFixed(0)}`;
          }
        }
      }
    };
  }

  /**
   * Configuración para gráfico de línea mixto (comparativas)
   */
  getMixedChartConfig(options: {
    series: any[];
    categories: string[];
    height?: number;
  }): ApexOptions {
    const colors = this.getColors();
    
    return {
      ...this.getBaseConfig(),
      series: options.series,
      chart: {
        ...this.getBaseConfig().chart,
        type: 'line',
        height: options.height || 350
      },
      colors: [colors.primary, colors.accent, colors.success],
      markers: {
        size: 5,
        hover: {
          size: 7
        }
      },
      xaxis: {
        categories: options.categories,
        labels: {
          style: {
            colors: '#a8a29e',
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#a8a29e',
            fontSize: '12px'
          },
          formatter: (value: number) => {
            return `S/ ${value.toFixed(0)}`;
          }
        }
      },
      legend: {
        ...this.getBaseConfig().legend,
        show: true
      }
    };
  }
}
