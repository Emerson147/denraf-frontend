/**
 * 🎨 Barrel Export - Shared UI Components
 * 
 * Importa todos los componentes UI desde un solo punto para
 * mantener imports limpios y minimalistas.
 * 
 * @example
 * // Antes
 * import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
 * import { UiInputComponent } from '../../shared/ui/ui-input/ui-input.component';
 * 
 * // Después
 * import { UiButtonComponent, UiInputComponent } from '../../shared/ui';
 */

// Core UI Components
export { UiButtonComponent } from './ui-button/ui-button.component';
export { UiInputComponent } from './ui-input/ui-input.component';
export { UiLabelComponent } from './ui-label/ui-label.component';
export { UiCardComponent } from './ui-card/ui-card.component';
export { UiBadgeComponent } from './ui-badge/ui-badge.component';

// Layout & Structure
export { UiPageHeaderComponent } from './ui-page-header/ui-page-header.component';
export { UiEmptyStateComponent } from './ui-empty-state/ui-empty-state.component';
export { UiSheetComponent } from './ui-sheet/ui-sheet.component';

// Data Display
export { UiKpiCardComponent } from './ui-kpi-card/ui-kpi-card.component';
export { UiChartComponent } from './ui-chart/ui-chart.component';
export { UiComparisonChartComponent } from './ui-comparison-chart/ui-comparison-chart.component';

// Interactive
export { UiAnimatedDialogComponent } from './ui-animated-dialog/ui-animated-dialog.component';
export { UiDropdownComponent } from './ui-dropdown/ui-dropdown.component';
export { UiCommandPaletteComponent } from './ui-command-palette/ui-command-palette.component';
export { UiExportMenuComponent } from './ui-export-menu/ui-export-menu.component';

// Feedback
export { UiToastComponent } from './ui-toast/ui-toast.component';
export { UiNotificationCenterComponent } from './ui-notification-center/ui-notification-center.component';
export { UiErrorLoggerComponent } from './ui-error-logger/ui-error-logger.component';

// Specialized
export { UiTicketComponent } from './ui-ticket/ui-ticket.component';
export { ConnectionStatusComponent } from './connection-status/connection-status.component';
export { UiSkeletonComponent } from './ui-skeleton/ui-skeleton.component';
export { PwaInstallPromptComponent } from './pwa-install-prompt/pwa-install-prompt.component';
export { SyncIndicatorComponent } from './sync-indicator/sync-indicator.component';
export { PeriodSelectorComponent } from './period-selector/period-selector.component';
