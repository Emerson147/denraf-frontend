import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BackendAuthService } from '../services/backend-auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Guard that restricts routes to ADMIN users only.
 * VENDEDOR users will be redirected to the POS with a toast warning.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(BackendAuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (authService.isAdmin()) {
    return true;
  }

  toast.error('Acceso denegado. Solo los administradores pueden ver esta sección.');
  router.navigate(['/pos']);
  return false;
};
