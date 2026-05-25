import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { Project, NewProject, Observation } from './models';
import { ToastService } from './toast.service';

const HTTP_TIMEOUT_MS = 10000;

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private base = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient, private toast: ToastService) {}

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.detail || err.error?.name?.[0] || 'Error al procesar la solicitud.';
    this.toast.error(msg);
    return throwError(() => err);
  }

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.base}/`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      catchError(err => this.handleError(err))
    );
  }

  create(p: NewProject & { obs?: string }): Observable<Project> {
    return this.http.post<Project>(`${this.base}/`, p).pipe(
      timeout(HTTP_TIMEOUT_MS),
      catchError(err => this.handleError(err))
    );
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}/`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      catchError(err => this.handleError(err))
    );
  }

  markDone(id: number): Observable<Project> {
    return this.http.post<Project>(`${this.base}/${id}/done/`, {}).pipe(
      timeout(HTTP_TIMEOUT_MS),
      catchError(err => this.handleError(err))
    );
  }

  reopen(id: number): Observable<Project> {
    return this.http.post<Project>(`${this.base}/${id}/reopen/`, {}).pipe(
      timeout(HTTP_TIMEOUT_MS),
      catchError(err => this.handleError(err))
    );
  }

  addObservation(id: number, text: string): Observable<Observation> {
    return this.http.post<Observation>(`${this.base}/${id}/observations/`, { text }).pipe(
      timeout(HTTP_TIMEOUT_MS),
      catchError(err => this.handleError(err))
    );
  }

  deleteObservation(projectId: number, obsId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${projectId}/observations/${obsId}/`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      catchError(err => this.handleError(err))
    );
  }
}
