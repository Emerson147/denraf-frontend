import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendAuthService, UserDTO } from '../../core/services/backend-auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UiAnimatedDialogComponent } from '../../shared/ui/ui-animated-dialog/ui-animated-dialog.component';
import { UiInputComponent } from '../../shared/ui/ui-input/ui-input.component';
import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
import { UiLabelComponent } from '../../shared/ui/ui-label/ui-label.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    UiAnimatedDialogComponent,
    UiInputComponent,
    UiButtonComponent,
    UiLabelComponent
  ],
  templateUrl: './users-page.component.html'
})
export class UsersPageComponent implements OnInit {
  authService = inject(BackendAuthService);
  toast = inject(ToastService);
  
  // Lista de usuarios real
  users = signal<UserDTO[]>([]);
  isLoading = signal(true);
  
  // Modal state
  isModalOpen = signal(false);
  editingUser = signal<UserDTO | null>(null);
  
  // Form state
  formData = signal({
    nombre: '',
    email: '',
    password: '',
    rol: 'VENDEDOR' as 'ADMIN' | 'VENDEDOR'
  });
  
  formError = signal('');
  isSaving = signal(false);
  
  // Computed
  isEditing = computed(() => this.editingUser() !== null);
  
  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.authService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error("Error al cargar usuarios", err);
        this.isLoading.set(false);
        this.toast.error("No se pudieron cargar los usuarios.");
      }
    });
  }
  
  openCreateModal() {
    this.editingUser.set(null);
    this.formData.set({
      nombre: '',
      email: '',
      password: '',
      rol: 'VENDEDOR'
    });
    this.formError.set('');
    this.isModalOpen.set(true);
  }
  
  openEditModal(user: UserDTO) {
    this.editingUser.set(user);
    this.formData.set({
      nombre: user.nombre,
      email: user.email,
      password: '', // Password solo se llena si se quiere resetear
      rol: user.rol as 'ADMIN'|'VENDEDOR'
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
    
    if (!data.nombre.trim()) {
      this.formError.set('El nombre es requerido');
      return false;
    }

    if (!data.email.trim() || !data.email.includes('@')) {
      this.formError.set('Un email válido es requerido');
      return false;
    }
    
    if (!this.isEditing() && data.password.length < 4) {
      this.formError.set('Introduce una contraseña segura de al menos 4 caracteres');
      return false;
    }
    
    return true;
  }
  
  saveUser() {
    if (!this.validateForm()) {
      return;
    }
    
    this.isSaving.set(true);
    const data = this.formData();
    const editing = this.editingUser();
    
    if (editing) {
      // Edit existing user
      const updatePayload: any = {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol
      };
      if (data.password.trim()) {
        updatePayload.password = data.password;
      }

      this.authService.updateUser(editing.id, updatePayload).subscribe({
        next: () => {
          this.toast.success("Usuario actualizado correctamente");
          this.loadUsers();
          this.closeModal();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.formError.set(err.error?.message || "Error al actualizar usuario");
          this.isSaving.set(false);
        }
      });

    } else {
      // Create new user via Register endpoint (Bypassing auto-login because we stay in admin)
      this.authService.registerUser(data).subscribe({
        next: () => {
          this.toast.success("Usuario registrado con éxito");
          this.loadUsers();
          this.closeModal();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.formError.set(err.error?.message || "Error al registrar usuario: " + (err.error?.email || ""));
          this.isSaving.set(false);
        }
      });
    }
  }
  
  deleteUser(userId: string) {
    if (userId === this.authService.currentUser()?.id) {
       this.toast.error("No puedes inhabilitar tu propia cuenta actual.");
       return;
    }

    if (confirm('¿Estás seguro de inhabilitar permanentemente a este usuario?')) {
      this.authService.deleteUser(userId).subscribe({
         next: () => {
            this.toast.info("Usuario inhabilitado correctamente.");
            this.loadUsers();
         },
         error: (err) => {
            this.toast.error("Hubo un error al inhabilitar al usuario.");
         }
      })
    }
  }
}
