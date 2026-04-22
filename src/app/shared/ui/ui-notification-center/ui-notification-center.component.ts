import { Component, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification, NotificationType, NotificationCategory } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-ui-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-notification-center.component.html',
  styleUrl: './ui-notification-center.component.css'
})
export class UiNotificationCenterComponent {
  notificationService = inject(NotificationService);
  router = inject(Router);
  themeService = inject(ThemeService);
  
  /** Whether the slide-over panel is open */
  panelOpen = signal(false);
  
  /** Active filter tab */
  activeFilter = signal<'all' | 'critical' | 'sales' | 'stock'>('all');

  isDarkMode = computed(() => this.themeService.darkMode());

  /** Filtered notifications based on active tab */
  filteredGroups = computed(() => {
    const groups = this.notificationService.groupedNotifications();
    const filter = this.activeFilter();

    if (filter === 'all') return groups;

    return groups
      .map(group => ({
        ...group,
        items: group.items.filter(n => {
          if (filter === 'critical') return n.priority === 'critical' || n.priority === 'important';
          if (filter === 'sales') return n.category === 'sales';
          if (filter === 'stock') return n.category === 'stock';
          return true;
        })
      }))
      .filter(group => group.items.length > 0);
  });

  togglePanel() {
    this.panelOpen.update(v => !v);
  }

  openPanel() {
    this.panelOpen.set(true);
  }

  closePanel() {
    this.panelOpen.set(false);
  }

  setFilter(filter: 'all' | 'critical' | 'sales' | 'stock') {
    this.activeFilter.set(filter);
  }

  handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
    if (notification.actionRoute) {
      this.router.navigate([notification.actionRoute]);
      this.closePanel();
    }
  }

  handleAction(notification: Notification, event: Event) {
    event.stopPropagation();
    if (notification.actionRoute) {
      this.router.navigate([notification.actionRoute]);
      this.notificationService.markAsRead(notification.id);
      this.closePanel();
    }
  }

  deleteNotification(id: string, event: Event) {
    event.stopPropagation();
    this.notificationService.remove(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  clearAll() {
    this.notificationService.clearAll();
  }

  goToNotificationsPage() {
    this.closePanel();
    this.router.navigate(['/notifications']);
  }

  getIconClass(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      error: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
    };
    return `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors[type]}`;
  }

  getPriorityDot(notification: Notification): string {
    if (notification.read) return '';
    const colors: Record<string, string> = {
      critical: 'bg-rose-500',
      important: 'bg-amber-500',
      info: 'bg-blue-400'
    };
    return colors[notification.priority] || 'bg-blue-400';
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    
    return timestamp.toLocaleDateString('es-PE', { 
      day: 'numeric', 
      month: 'short' 
    });
  }
}
