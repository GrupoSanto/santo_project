import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'error';

@Injectable({ providedIn: 'root' })
export class ToastService {
  message = signal<string>('');
  type    = signal<ToastType>('info');
  visible = signal(false);
  private timer: any;

  show(msg: string, type: ToastType = 'info') {
    this.message.set(msg);
    this.type.set(type);
    this.visible.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(false), type === 'error' ? 4000 : 2200);
  }

  error(msg: string) {
    this.show(msg, 'error');
  }
}
