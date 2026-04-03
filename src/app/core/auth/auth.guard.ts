import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BackendAuthService } from '../services/backend-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(BackendAuthService);
  const router = inject(Router);

  // VERIFICACIÓN SENCILLA CON EL NUEVO BACKEND
  if (authService.isAuthenticated()) {
    return true; // ¡Pase usted, mi King!
  } else {
    // ¡Alto ahí! No tienes credencial.
    router.navigate(['/login']);
    return false;
  }
};