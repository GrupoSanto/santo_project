import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  list(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/`);
  }

  create(data: { username: string; password: string; role: string; display_name: string }): Observable<User> {
    return this.http.post<User>(`${this.base}/`, data);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}/`);
  }

  changePassword(id: number, password: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/change_password/`, { password });
  }
}
