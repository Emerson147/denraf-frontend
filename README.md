# 🛒 Importaciones DENRAF — Sistema de Gestión de Ventas e Inventario

> Sistema POS (Point of Sale) completo con gestión de inventario, reportes, modo offline y soporte PWA, construido con Angular 21 y Supabase.

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Tecnologías](#tecnologías)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Módulos y Funcionalidades](#módulos-y-funcionalidades)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Instalación y Configuración](#instalación-y-configuración)
- [Scripts Disponibles](#scripts-disponibles)
- [Variables de Entorno](#variables-de-entorno)
- [Componentes UI Personalizados](#componentes-ui-personalizados)
- [Servicios Core](#servicios-core)
- [Rutas de la Aplicación](#rutas-de-la-aplicación)
- [Capacidades Offline y PWA](#capacidades-offline-y-pwa)

---

## 📌 Descripción General

**Importaciones DENRAF** es un sistema de gestión empresarial orientado a pequeños y medianos negocios de venta e importación. Permite administrar productos, registrar ventas mediante un punto de venta (POS) intuitivo, controlar el inventario, gestionar clientes, generar reportes exportables y visualizar métricas del negocio en tiempo real.

La aplicación opera con soporte **offline-first** gracias a IndexedDB y Service Workers, sincronizando los datos con la nube (Supabase/PostgreSQL) cuando la conexión es restaurada.

---

## ⚙️ Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| [Angular](https://angular.io) | 21.x | Framework principal |
| [TypeScript](https://www.typescriptlang.org) | ~5.9 | Lenguaje de desarrollo |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Estilos utilitarios |
| [Spartan NG](https://www.spartan.ng) | 0.0.1-alpha | Componentes UI headless |
| [Angular CDK](https://material.angular.io/cdk) | 21.x | Primitivas de UI |
| [RxJS](https://rxjs.dev) | ~7.8 | Programación reactiva |

### Backend & Datos
| Tecnología | Versión | Uso |
|---|---|---|
| [Supabase](https://supabase.com) | ^2.89 | BaaS — PostgreSQL en la nube, Auth |
| [IndexedDB (idb)](https://github.com/jakearchibald/idb) | ^8.0 | Almacenamiento local offline |
| [Cloudinary](https://cloudinary.com) | — | Gestión y optimización de imágenes |

### Librerías & Utilidades
| Librería | Uso |
|---|---|
| [ApexCharts / ng-apexcharts](https://apexcharts.com) | Gráficas y visualizaciones |
| [jsPDF + jspdf-autotable](https://github.com/parallax/jsPDF) | Exportación a PDF |
| [ExcelJS](https://github.com/exceljs/exceljs) | Exportación a Excel (.xlsx) |
| [QRCode](https://github.com/soldair/node-qrcode) | Generación de códigos QR |
| [clsx + tailwind-merge](https://github.com/lukeed/clsx) | Utilidad de clases CSS condicionales |
| [tw-animate-css](https://github.com/Taiw/tw-animate-css) | Animaciones Tailwind |

---

## 🏗️ Arquitectura del Proyecto

La aplicación sigue una **arquitectura modular por features** con los siguientes principios:

- **Standalone Components** — Todos los componentes son standalone (sin NgModules).
- **Angular Signals** — Estado reactivo declarativo con `signal()`, `computed()` y `effect()`.
- **Lazy Loading** — Todas las rutas cargan sus componentes de forma diferida.
- **Facade Pattern** — El módulo POS utiliza facades para separar la lógica de negocio de la vista.
- **Precarga Inteligente** — `CustomPreloadingStrategy` pre-carga rutas según su prioridad asignada.
- **Offline-First** — Los datos se persisten localmente y se sincronizan con Supabase al reconectar.

```
┌─────────────────────────────────────────────────────┐
│                   Angular App                       │
│                                                     │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │  Layout  │  │  Features  │  │   Shared UI     │ │
│  │ (Sidebar │  │ (Módulos   │  │ (Componentes    │ │
│  │  + Nav)  │  │ por ruta)  │  │  reutilizables) │ │
│  └──────────┘  └────────────┘  └─────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │                  Core                        │   │
│  │  Auth · Services · Models · Routing · Theme  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────┘
                              │
              ┌───────────────┴──────────────┐
              │                              │
       ┌──────▼──────┐               ┌───────▼──────┐
       │  Supabase   │               │  IndexedDB   │
       │ (PostgreSQL │               │  (Offline /  │
       │   + Auth)   │               │  Local DB)   │
       └─────────────┘               └──────────────┘
```

---

## 🧩 Módulos y Funcionalidades

### 🔐 Autenticación (`/login`)
- Login con email y contraseña vía Supabase Auth.
- Guard de rutas (`authGuard`) que protege todas las páginas privadas.
- Redirección automática al dashboard tras iniciar sesión.

### 📊 Dashboard (`/dashboard`)
- Vista general con KPIs del negocio: ventas del día, ingresos, productos, clientes.
- Gráficas de rendimiento con ApexCharts.
- Resumen de actividad reciente.
- Precarga inmediata (alta prioridad).

### 📦 Inventario (`/inventario`)
Módulo con subrutas:
- **`/inventario/productos`** — Listado, búsqueda, alta, edición y baja de productos. Soporte de variantes. Imágenes vía Cloudinary.
- **`/inventario/analisis`** — Análisis de stock, productos con bajo inventario, rotación.
- **`/inventario/compras`** — Registro de movimientos de entrada (compras a proveedores).

### 🏪 Punto de Venta — POS (`/pos`)
- Interfaz de caja para registrar ventas en tiempo real.
- Búsqueda rápida de productos con filtros.
- Carrito de compra con cálculo de totales, descuentos y tipos de venta.
- Generación de tickets/recibos en PDF.
- Generación de códigos QR por transacción.
- Precarga a los 2 segundos de iniciar sesión (alta prioridad).

### 👥 Clientes (`/clients`)
- Gestión completa del directorio de clientes.
- Historial de compras por cliente.

### 📈 Reportes (`/reports`)
- Reportes de ventas por período, por producto, por categoría.
- Exportación a **Excel (.xlsx)** y **PDF**.
- Gráficas comparativas y de tendencia.
- Precarga a los 5 segundos (prioridad media).

### 🧾 Historial de Ventas (`/sales`)
- Listado de todas las transacciones registradas.
- Filtros por fecha, estado y tipo de venta.
- Detalle de cada venta con sus ítems.

### 🏆 Metas y Logros (`/goals`)
- Sistema de gamificación para motivar al equipo.
- Seguimiento de objetivos de ventas.
- Insignias y logros desbloqueables.

### 👤 Gestión de Usuarios (`/users`) *(Solo Admin)*
- Alta y administración de cuentas de usuario.
- Asignación de roles y permisos.

---

## 📁 Estructura de Carpetas

```
sistema-master/
├── src/
│   ├── app/
│   │   ├── app.config.ts          # Configuración principal de la app
│   │   ├── app.routes.ts          # Definición de rutas
│   │   ├── config/                # Configuraciones globales
│   │   ├── core/
│   │   │   ├── auth/              # AuthService, AuthGuard
│   │   │   ├── models/            # Interfaces y modelos de datos
│   │   │   ├── routing/           # CustomPreloadingStrategy
│   │   │   ├── services/          # Servicios globales (Supabase, ventas, productos...)
│   │   │   └── theme/             # ThemeService (dark/light mode)
│   │   ├── features/
│   │   │   ├── auth/              # Página de Login
│   │   │   ├── dashboard/         # Dashboard principal
│   │   │   ├── inventory/         # Productos, análisis, movimientos
│   │   │   ├── pos/               # Punto de Venta (+ facades)
│   │   │   ├── clients/           # Gestión de clientes
│   │   │   ├── reports/           # Reportes y exportaciones
│   │   │   ├── sales/             # Historial de ventas
│   │   │   ├── goals/             # Metas y gamificación
│   │   │   └── users/             # Administración de usuarios
│   │   ├── layout/
│   │   │   └── main-layout.component   # Sidebar + navegación principal
│   │   └── shared/
│   │       ├── directives/        # Directivas reutilizables (ClickOutside, etc.)
│   │       ├── ui/                # Biblioteca de componentes UI personalizados
│   │       └── utils/             # Funciones utilitarias (cn, etc.)
│   ├── environments/
│   │   ├── environment.ts         # Variables de desarrollo
│   │   └── environment.prod.ts    # Variables de producción
│   └── assets/
├── scripts/                       # Scripts de utilidad (migración de imágenes)
├── docs/                          # Documentación técnica adicional
├── public/                        # Recursos estáticos (íconos PWA, manifest)
├── angular.json
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** >= 20.x
- **npm** >= 11.x
- Cuenta en [Supabase](https://supabase.com) con un proyecto configurado.
- *(Opcional)* Cuenta en [Cloudinary](https://cloudinary.com) para gestión de imágenes.

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Emerson147/importaciones-denraf.git
cd importaciones-denraf

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Editar src/environments/environment.ts con tus credenciales de Supabase

# 4. Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:4200`.

---

## 📜 Scripts Disponibles

| Script | Descripción |
|---|---|
| `npm start` | Inicia el servidor de desarrollo (`ng serve`) |
| `npm run build` | Compila la aplicación para producción |
| `npm run build:prod` | Build optimizado con hashing de archivos |
| `npm run build:analyze` | Build + análisis del bundle (Webpack Bundle Analyzer) |
| `npm run watch` | Compilación en modo watch (desarrollo) |
| `npm test` | Ejecuta las pruebas unitarias con Vitest |
| `npm run migrate-images` | Migra imágenes al servicio de almacenamiento externo |
| `npm run migrate-base64-images` | Convierte imágenes base64 almacenadas a URLs externas |
| `npm run analyze-storage` | Analiza el uso del almacenamiento local |

---

## 🔑 Variables de Entorno

Configura el archivo `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'TU_SUPABASE_URL',
  supabaseKey: 'TU_SUPABASE_ANON_KEY',
};
```

Para producción, edita `src/environments/environment.prod.ts` con los mismos campos y `production: true`.

> ⚠️ **Nunca subas tus claves reales al repositorio.** Usa variables de entorno del sistema o un archivo `.env` ignorado por git en entornos CI/CD.

---

## 🎨 Componentes UI Personalizados

La carpeta `src/app/shared/ui/` contiene una biblioteca de componentes reutilizables construidos sobre Tailwind CSS y Spartan NG:

| Componente | Descripción |
|---|---|
| `ui-button` | Botón con variantes de estilo y tamaño |
| `ui-badge` | Etiquetas de estado/categoría |
| `ui-card` | Tarjeta contenedora |
| `ui-input` | Campo de texto estilizado |
| `ui-label` | Etiqueta para formularios |
| `ui-dropdown` | Menú desplegable |
| `ui-sheet` | Panel lateral deslizante |
| `ui-toast` | Notificaciones temporales |
| `ui-notification-center` | Centro de notificaciones |
| `ui-chart` | Wrapper de gráficas ApexCharts |
| `ui-kpi-card` | Tarjeta de métricas (KPI) |
| `ui-comparison-chart` | Gráfica comparativa de períodos |
| `ui-skeleton` | Skeleton loader (carga diferida) |
| `ui-empty-state` | Estado vacío ilustrado |
| `ui-page-header` | Encabezado de página con acciones |
| `ui-export-menu` | Menú de exportación (PDF/Excel) |
| `ui-ticket` | Ticket/recibo de venta |
| `ui-command-palette` | Paleta de comandos / búsqueda global |
| `ui-animated-dialog` | Diálogo modal con animaciones |
| `ui-error-logger` | Panel visual de errores (desarrollo) |
| `period-selector` | Selector de rango de fechas |
| `connection-status` | Indicador de estado de conexión |
| `sync-indicator` | Indicador de sincronización offline |
| `pwa-install-prompt` | Prompt de instalación PWA |

---

## ⚙️ Servicios Core

Los servicios principales se encuentran en `src/app/core/services/`:

| Servicio | Responsabilidad |
|---|---|
| `supabase.service.ts` | Cliente singleton de Supabase (PostgreSQL + Auth) |
| `product.service.ts` | CRUD de productos con soporte offline |
| `sales.service.ts` | Registro y consulta de ventas |
| `inventory.service.ts` | Gestión de stock e inventario |
| `inventory-movement.service.ts` | Movimientos de entrada/salida de inventario |
| `offline.service.ts` | Detección de conectividad y cola offline |
| `sync.service.ts` | Sincronización de operaciones pendientes con Supabase |
| `local-db.service.ts` | Interfaz con IndexedDB para persistencia local |
| `cloudinary.service.ts` | Subida y gestión de imágenes en Cloudinary |
| `export.service.ts` | Exportación de datos a PDF y Excel |
| `analytics.service.ts` | Cálculo de métricas y KPIs del negocio |
| `gamification.service.ts` | Lógica de metas, logros e insignias |
| `notification.service.ts` | Sistema de notificaciones internas |
| `toast.service.ts` | Notificaciones tipo toast en la UI |
| `search.service.ts` | Búsqueda global y filtrado de entidades |
| `logger.service.ts` | Logging estructurado para depuración |
| `error-handler.service.ts` | Captura y manejo centralizado de errores |
| `crypto.service.ts` | Cifrado/descifrado de datos sensibles |
| `storage.service.ts` | Abstracción del almacenamiento (local/remoto) |

---

## 🗺️ Rutas de la Aplicación

| Ruta | Componente | Acceso | Descripción |
|---|---|---|---|
| `/login` | `LoginPageComponent` | Público | Inicio de sesión |
| `/dashboard` | `DashboardPageComponent` | Privado | Panel principal |
| `/inventario/productos` | `ProductosPageComponent` | Privado | Gestión de productos |
| `/inventario/analisis` | `AnalisisPageComponent` | Privado | Análisis de inventario |
| `/inventario/compras` | `InventoryMovementsComponent` | Privado | Movimientos/compras |
| `/pos` | `PosPageComponent` | Privado | Punto de venta |
| `/clients` | `ClientsPageComponent` | Privado | Clientes |
| `/reports` | `ReportsPageComponent` | Privado | Reportes |
| `/sales` | `SalesHistoryComponent` | Privado | Historial de ventas |
| `/goals` | `GoalsPageComponent` | Privado | Metas y logros |
| `/users` | `UsersPageComponent` | Privado (Admin) | Gestión de usuarios |

---

## 📱 Capacidades Offline y PWA

La aplicación está configurada como **Progressive Web App (PWA)**:

- **Service Worker** (`@angular/service-worker`) con configuración en `ngsw-config.json`.
- **Manifest** en `public/manifest.webmanifest` para instalación en dispositivos.
- **Íconos PWA** generados con el script `generate-pwa-icons.sh`.
- **Cache de assets** estáticos y respuestas de red para funcionamiento sin conexión.
- **IndexedDB** (vía librería `idb`) para almacenar productos, ventas y configuraciones localmente.
- **Sincronización automática**: cuando la conexión es restaurada, el `SyncService` envía todas las operaciones pendientes a Supabase.
- **Indicador visual** de estado de conexión y sincronización en el navbar.

---

## 📄 Licencia

Consulta el archivo [LICENSE.md](LICENSE.md) para más información.

---

*Desarrollado con ❤️ para Importaciones DENRAF.*
