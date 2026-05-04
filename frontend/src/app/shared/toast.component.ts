import { Component } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `<div class="toast" [class.show]="toast.visible()">{{ toast.message() }}</div>`
})
export class ToastComponent {
  constructor(public toast: ToastService) {}
}
