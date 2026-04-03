import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendAuthService } from '../../../core/services/backend-auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private backendAuthService = inject(BackendAuthService);
  private router = inject(Router);

  // Estado del formulario
  email = signal<string>('');
  password = signal<string>('');
  showPassword = signal(false);
  error = signal<string>('');
  isLoggingIn = signal(false);

  togglePassword() {
    this.showPassword.update(s => !s);
  }

  login() {
    this.error.set('');
    
    if (!this.email().trim() || !this.password().trim()) {
      this.error.set('Por favor, ingresa correo y contraseña.');
      return;
    }

    this.isLoggingIn.set(true);

    this.backendAuthService.login({ email: this.email(), password: this.password() }).subscribe({
      next: () => {
        this.isLoggingIn.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error de autenticación', err);
        this.isLoggingIn.set(false);
        this.error.set('Credenciales incorrectas o error de red');
      }
    });
  }
}
