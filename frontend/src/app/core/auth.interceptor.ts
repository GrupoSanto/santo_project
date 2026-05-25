import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const toast  = inject(ToastService);

  const authReq = addToken(req, auth.accessToken);

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Intentar refresh automático cuando el access token expira
      if (err.status === 401 && auth.refreshToken && !isRefreshing && !req.url.includes('/auth/')) {
        return handleRefresh(authReq, next, auth, router, toast);
      }

      // Si el refresh también falla o no hay sesión → limpiar y redirigir
      if (err.status === 401) {
        auth.clear();
        router.navigate(['/login']);
        return throwError(() => err);
      }

      // Errores del servidor: mostrar toast genérico
      if (err.status >= 500) {
        toast.show('Error del servidor. Intenta nuevamente.', 'error');
      }

      return throwError(() => err);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handleRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router,
  toast: ToastService
) {
  isRefreshing = true;
  return auth.refreshAccessToken().pipe(
    switchMap(res => next(addToken(req, res.access))),
    catchError(err => {
      auth.clear();
      router.navigate(['/login']);
      return throwError(() => err);
    }),
    finalize(() => { isRefreshing = false; })
  );
}
