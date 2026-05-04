import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Project, NewProject, Observation } from './models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private base = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.base}/`);
  }

  create(p: NewProject & { obs?: string }): Observable<Project> {
    return this.http.post<Project>(`${this.base}/`, p);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}/`);
  }

  markDone(id: number): Observable<Project> {
    return this.http.post<Project>(`${this.base}/${id}/done/`, {});
  }

  reopen(id: number): Observable<Project> {
    return this.http.post<Project>(`${this.base}/${id}/reopen/`, {});
  }

  addObservation(id: number, text: string): Observable<Observation> {
    return this.http.post<Observation>(`${this.base}/${id}/observations/`, { text });
  }

  deleteObservation(projectId: number, obsId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${projectId}/observations/${obsId}/`);
  }
}
