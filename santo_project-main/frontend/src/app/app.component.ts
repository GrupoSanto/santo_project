import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { ToastComponent } from './shared/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <div id="ps-app" [class.dark]="theme.isDark()">
      <router-outlet></router-outlet>
      <app-toast></app-toast>
    </div>
  `
})
export class AppComponent implements OnInit {
  constructor(public theme: ThemeService) {}

  ngOnInit() {
    this.theme.init();
  }
}
