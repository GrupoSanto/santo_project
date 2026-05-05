import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated && auth.isAdmin) return true;

  // Autenticado pero no admin → volver a proyectos
  if (auth.isAuthenticated) {
    router.navigate(['/projects']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};
