import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'ps_theme';
  isDark = signal(false);

  init() {
    const v = localStorage.getItem(this.KEY);
    this.isDark.set(v === 'dark');
  }

  toggle() {
    const next = !this.isDark();
    this.isDark.set(next);
    localStorage.setItem(this.KEY, next ? 'dark' : 'light');
  }
}
