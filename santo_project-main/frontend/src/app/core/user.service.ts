import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from './models';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient, private toast: ToastService) {}

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.detail || 'Error al procesar la solicitud.';
    this.toast.error(msg);
    return throwError(() => err);
  }

  list(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/`).pipe(
      catchError(err => this.handleError(err))
    );
  }

  create(data: { username: string; password: string; role: string; display_name: string }): Observable<User> {
    return this.http.post<User>(`${this.base}/`, data).pipe(
      catchError(err => this.handleError(err))
    );
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}/`).pipe(
      catchError(err => this.handleError(err))
    );
  }

  changePassword(id: number, password: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/change_password/`, { password }).pipe(
      catchError(err => this.handleError(err))
    );
  }
}
