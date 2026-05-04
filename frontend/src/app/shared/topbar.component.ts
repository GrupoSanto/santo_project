import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="topbar">
      <div class="topbar-logo">Proyectos <span>Santo</span></div>
      <div class="topbar-right">
        <div class="sync-indicator">
          <div class="sync-dot" [class.ok]="syncStatus === 'ok'" [class.loading]="syncStatus === 'loading'"></div>
          <span>{{ syncText() }}</span>
        </div>
        <div class="user-chip">
          <div class="avatar" [class.admin-av]="auth.isAdmin">{{ initial() }}</div>
          <span>{{ auth.user()?.display_name }}</span>
          <span class="role-tag" [class.admin]="auth.isAdmin" [class.user]="!auth.isAdmin">
            {{ auth.isAdmin ? 'Admin' : 'Usuario' }}
          </span>
        </div>
        <button class="theme-btn" (click)="theme.toggle()" title="Alternar tema">
          {{ theme.isDark() ? '☀️' : '🌙' }}
        </button>
        <button class="btn-ghost" (click)="logout()">↩ Salir</button>
      </div>
    </div>
    <div class="main-nav">
      <button class="nav-tab" routerLink="/projects" routerLinkActive="active">📋 Proyectos</button>
      @if (auth.isAdmin) {
        <button class="nav-tab" routerLink="/admin" routerLinkActive="active">⚙️ Usuarios</button>
      }
    </div>
  `
})
export class TopbarComponent {
  @Input() syncStatus: 'ok' | 'loading' | 'error' = 'ok';

  constructor(public auth: AuthService, public theme: ThemeService, private router: Router) {}

  initial(): string {
    const n = this.auth.user()?.display_name || '?';
    return n.charAt(0).toUpperCase();
  }

  syncText(): string {
    if (this.syncStatus === 'ok') return 'Sincronizado';
    if (this.syncStatus === 'loading') return 'Sincronizando';
    return 'Sin conexión';
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
