import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar.component';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';
import { ToastService } from '../../core/toast.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit {
  users = signal<User[]>([]);
  syncStatus: 'ok' | 'loading' | 'error' = 'ok';

  // Add form
  nu_user = '';
  nu_pass = '';
  nu_role: 'admin' | 'user' = 'user';
  nu_err = '';

  // Modals
  showPassModal = signal(false);
  passUser: User | null = null;
  newPass = '';

  showDelModal = signal(false);
  delUser: User | null = null;

  constructor(
    public auth: AuthService,
    private userSvc: UserService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.userSvc.list().subscribe({
      next: u => { this.users.set(u); this.syncStatus = 'ok'; },
      error: () => this.syncStatus = 'error'
    });
  }

  addUser() {
    const uname = this.nu_user.trim().toLowerCase().replace(/\s+/g, '');
    const pass = this.nu_pass.trim();
    if (!uname || !pass) { this.nu_err = 'Completa usuario y contraseña.'; return; }
    if (this.users().find(u => u.username === uname)) {
      this.nu_err = 'Ese nombre de usuario ya existe.'; return;
    }
    this.nu_err = '';
    this.userSvc.create({
      username: uname, password: pass, role: this.nu_role,
      display_name: this.nu_user.trim()
    }).subscribe({
      next: () => {
        this.nu_user = ''; this.nu_pass = ''; this.nu_role = 'user';
        this.load();
        this.toast.show('Usuario agregado ✓');
      },
      error: (err) => this.nu_err = err?.error?.detail || 'Error al crear usuario.'
    });
  }

  openChangePass(u: User) {
    this.passUser = u;
    this.newPass = '';
    this.showPassModal.set(true);
  }
  doChangePass() {
    if (!this.newPass.trim() || !this.passUser) return;
    this.userSvc.changePassword(this.passUser.id, this.newPass.trim()).subscribe(() => {
      this.showPassModal.set(false);
      this.toast.show('Contraseña actualizada');
    });
  }

  openDelUser(u: User) {
    this.delUser = u;
    this.showDelModal.set(true);
  }
  doDelUser() {
    if (!this.delUser) return;
    this.userSvc.delete(this.delUser.id).subscribe(() => {
      this.showDelModal.set(false);
      this.load();
      this.toast.show('Usuario eliminado');
    });
  }
}
