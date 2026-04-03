import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth';
import { User } from '../../core/models';
import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
import { UiInputComponent } from '../../shared/ui/ui-input/ui-input.component';
import { UiAnimatedDialogComponent } from '../../shared/ui/ui-animated-dialog/ui-animated-dialog.component';
import { UiBadgeComponent } from '../../shared/ui/ui-badge/ui-badge.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    UiButtonComponent,
    UiInputComponent,
    UiAnimatedDialogComponent,
    UiBadgeComponent
  ],
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.css']
})
export class UsersPageComponent {
  authService = inject(AuthService);
  
  // Modal state
  isModalOpen = signal(false);
  editingUser = signal<User | null>(null);
  
  // Form state
  formData = signal({
    name: '',
    role: 'vendor' as 'admin' | 'vendor',
    pin: ''
  });
  
  formError = signal('');
  
  // Computed
  users = computed(() => this.authService.getUsers());
  isEditing = computed(() => this.editingUser() !== null);
  
  // Update form methods
  updateName(name: string) {
    this.formData.set({ ...this.formData(), name });
  }
  
  updateRole(role: 'admin' | 'vendor') {
    this.formData.set({ ...this.formData(), role });
  }
  
  updatePin(pin: string) {
    this.formData.set({ ...this.formData(), pin });
  }
  
  openCreateModal() {
    this.editingUser.set(null);
    this.formData.set({
      name: '',
      role: 'vendor',
      pin: ''
    });
    this.formError.set('');
    this.isModalOpen.set(true);
  }
  
  openEditModal(user: User) {
    this.editingUser.set(user);
    this.formData.set({
      name: user.name,
      role: user.role,
      pin: user.pin
    });
    this.formError.set('');
    this.isModalOpen.set(true);
  }
  
  closeModal() {
    this.isModalOpen.set(false);
    this.editingUser.set(null);
    this.formError.set('');
  }
  
  validateForm(): boolean {
    const data = this.formData();
    
    if (!data.name.trim()) {
      this.formError.set('El nombre es requerido');
      return false;
    }
    
    if (data.pin.length !== 4 || !/^\d{4}$/.test(data.pin)) {
      this.formError.set('El PIN debe ser de 4 dígitos');
      return false;
    }
    
    return true;
  }
  
  saveUser() {
    if (!this.validateForm()) {
      return;
    }
    
    const data = this.formData();
    const editing = this.editingUser();
    
    if (editing) {
      // Edit existing user
      this.authService.updateUser(editing.id, {
        name: data.name,
        role: data.role,
        pin: data.pin
      });
    } else {
      // Create new user
      this.authService.createUser({
        name: data.name,
        role: data.role,
        pin: data.pin
      });
    }
    
    this.closeModal();
  }
  
  deleteUser(userId: string) {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      this.authService.deleteUser(userId);
    }
  }
  
  getRoleLabel(role: 'admin' | 'vendor'): string {
    return role === 'admin' ? 'Administrador' : 'Vendedor';
  }
}
