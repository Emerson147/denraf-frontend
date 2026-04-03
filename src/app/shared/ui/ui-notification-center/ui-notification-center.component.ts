import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification, NotificationType } from '../../../core/services/notification.service';
import { ClickOutsideDirective } from '../../directives/click-outside/click-outside.component';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-ui-notification-center',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective],
  templateUrl: './ui-notification-center.component.html',
  styleUrl: './ui-notification-center.component.css'
})
export class UiNotificationCenterComponent {
  notificationService = inject(NotificationService);
  router = inject(Router);
  themeService = inject(ThemeService);
  
  isOpen = signal(false);
  isDarkMode = computed(() => this.themeService.darkMode());

  toggleDropdown() {
    this.isOpen.update(v => !v);
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  handleNotificationClick(notification: Notification) {
    // Marcar como leída
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }

    // Si tiene acción, navegar
    if (notification.actionRoute) {
      this.router.navigate([notification.actionRoute]);
      this.closeDropdown();
    }
  }

  handleAction(notification: Notification, event: Event) {
    event.stopPropagation();
    
    if (notification.actionRoute) {
      this.router.navigate([notification.actionRoute]);
      this.notificationService.markAsRead(notification.id);
      this.closeDropdown();
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

  getIconClass(type: NotificationType): string {
    const baseClass = 'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0';
    
    const typeColors: Record<NotificationType, string> = {
      success: 'bg-emerald-100 text-emerald-700',
      info: 'bg-blue-100 text-blue-700',
      warning: 'bg-amber-100 text-amber-700',
      error: 'bg-rose-100 text-rose-700'
    };

    return `${baseClass} ${typeColors[type]}`;
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
