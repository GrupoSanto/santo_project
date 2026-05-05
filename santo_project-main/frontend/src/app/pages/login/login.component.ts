import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-screen">
      <div class="login-box">
        <div class="login-logo">Proyectos <span>Santo</span></div>
        <div class="login-sub">Ingresa con tu usuario y contraseña</div>

        @if (errorMsg()) {
          <div class="login-err">{{ errorMsg() }}</div>
        }

        <div class="lf">
          <label>Usuario</label>
          <div class="lf-wrap">
            <span class="lf-icon">👤</span>
            <input type="text" [(ngModel)]="username" placeholder="tu usuario"
                   autocomplete="username" [class.err]="userErr()"
                   (keydown.enter)="passInput.focus()">
          </div>
        </div>

        <div class="lf">
          <label>Contraseña</label>
          <div class="lf-wrap">
            <span class="lf-icon">🔒</span>
            <input #passInput [type]="showPass() ? 'text' : 'password'"
                   [(ngModel)]="password" placeholder="••••••••"
                   autocomplete="current-password" [class.err]="passErr()"
                   (keydown.enter)="doLogin()">
            <button type="button" class="eye-btn" (click)="showPass.set(!showPass())">👁</button>
          </div>
        </div>

        @if (loading()) {
          <div style="font-size:12px;color:var(--text3);margin-bottom:8px">Cargando...</div>
        }

        <button class="btn-login" (click)="doLogin()" [disabled]="loading()">Ingresar →</button>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  showPass = signal(false);
  loading = signal(false);
  errorMsg = signal('');
  userErr = signal(false);
  passErr = signal(false);

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isAuthenticated) this.router.navigate(['/projects']);
  }

  doLogin() {
    const u = (this.username || '').trim().toLowerCase();
    const p = (this.password || '').trim();
    this.userErr.set(!u);
    this.passErr.set(!p);
    this.errorMsg.set('');
    if (!u || !p) return;

    this.loading.set(true);
    this.auth.login(u, p).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.detail || 'Usuario o contraseña incorrectos.');
        this.userErr.set(true);
        this.passErr.set(true);
      }
    });
  }
}
