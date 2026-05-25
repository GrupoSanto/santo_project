import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TopbarComponent } from '../../shared/topbar.component';
import { AuthService } from '../../core/auth.service';
import { ProjectService } from '../../core/project.service';
import { UserService } from '../../core/user.service';
import { ToastService } from '../../core/toast.service';
import { Project, User } from '../../core/models';

const PORD: Record<string, number> = { alta: 0, media: 1, baja: 2 };

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './projects.component.html'
})
export class ProjectsComponent implements OnInit, OnDestroy {
  projects = signal<Project[]>([]);
  users = signal<User[]>([]);
  syncStatus: 'ok' | 'loading' | 'error' = 'ok';
  private loadingInFlight = false;
  private loadingDelayTimer?: any;
  private destroy$ = new Subject<void>();

  search = signal('');
  fPriority = signal('');
  fOwner = signal('');
  fSort = signal('');
  currentTab = signal<'active' | 'done'>('active');
  expandedObs = signal<Set<number>>(new Set());

  showProjectModal = signal(false);
  showConfirmDelete = signal(false);
  pendingDeleteId: number | null = null;

  // Form
  m_name = '';
  m_client = '';
  m_owner = '';
  m_start = '';
  m_deadline = '';
  m_priority: 'alta' | 'media' | 'baja' = 'media';
  m_obs = '';
  m_nameErr = false;

  obsInputs: Record<number, string> = {};

  private syncInterval?: any;

  active = computed(() => this.projects().filter(p => p.status === 'active'));
  done = computed(() => this.projects().filter(p => p.status === 'done'));
  overdue = computed(() => this.active().filter(p => p.deadline && this.daysTo(p.deadline) < 0));

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const fp = this.fPriority();
    const fo = this.fOwner();
    const fs = this.fSort();
    const tab = this.currentTab();
    let list = this.projects().filter(p => p.status === tab);
    if (fp) list = list.filter(p => p.priority === fp);
    if (fo) list = list.filter(p => p.owner === fo);
    if (q) {
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.client || '').toLowerCase().includes(q) ||
        (p.owner || '').toLowerCase().includes(q)
      );
    }
    list = [...list];
    if (fs === 'deadline') list.sort((a, b) => (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1);
    else if (fs === 'priority') list.sort((a, b) => PORD[a.priority] - PORD[b.priority]);
    else if (fs === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
    return list;
  });

  constructor(
    public auth: AuthService,
    private projectSvc: ProjectService,
    private userSvc: UserService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.load();
    // Polling cada 20s para no saturar (PythonAnywhere free tier)
    this.syncInterval = setInterval(() => this.load(true), 20000);
  }

  ngOnDestroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.loadingDelayTimer) clearTimeout(this.loadingDelayTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(silent = false) {
    // Evitar peticiones solapadas
    if (this.loadingInFlight) return;
    this.loadingInFlight = true;

    // Sólo mostrar "Sincronizando" si la petición tarda > 600ms
    if (!silent) {
      this.loadingDelayTimer = setTimeout(() => {
        if (this.loadingInFlight) this.syncStatus = 'loading';
      }, 600);
    }

    const finish = () => {
      this.loadingInFlight = false;
      if (this.loadingDelayTimer) {
        clearTimeout(this.loadingDelayTimer);
        this.loadingDelayTimer = undefined;
      }
    };

    this.projectSvc.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: ps => {
        const changed = JSON.stringify(ps) !== JSON.stringify(this.projects());
        this.projects.set(ps);
        this.syncStatus = 'ok';
        if (changed && silent) this.toast.show('Proyectos actualizados');
        finish();
      },
      error: () => {
        this.syncStatus = 'error';
        finish();
      }
    });
    this.userSvc.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: us => this.users.set(us),
      error: () => {}
    });
  }

  // ----- Helpers -----
  daysTo(dateStr: string): number {
    return (new Date(dateStr + 'T12:00:00').getTime() - Date.now()) / 86400000;
  }
  fmtDate(s: string): string {
    if (!s) return '';
    return new Date(s + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  deadlineClass(s: string | null): string {
    if (!s) return 'p-date';
    const d = this.daysTo(s);
    return d < 0 ? 'p-date overdue' : d <= 7 ? 'p-date soon' : 'p-date';
  }
  deadlineLabel(s: string | null): string {
    if (!s) return '';
    const d = this.daysTo(s);
    const b = 'Entrega: ' + this.fmtDate(s);
    return d < 0 ? b + ' · Vencida' : d <= 7 ? b + ' · Próxima' : b;
  }
  cap(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  hl(text: string): string {
    const q = this.search().trim();
    if (!q || !text) return text || '';
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
  }

  priorityIcon(p: string): string {
    return p === 'alta' ? '🔴' : p === 'media' ? '🟡' : '🟢';
  }

  toggleObs(id: number) {
    const s = new Set(this.expandedObs());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expandedObs.set(s);
  }
  isExpanded(id: number): boolean { return this.expandedObs().has(id); }

  canDelete(p: Project): boolean {
    return this.auth.isAdmin || p.createdBy === this.auth.user()?.username;
  }

  // ----- Actions -----
  markDone(p: Project) {
    this.projectSvc.markDone(p.id).subscribe(() => this.load());
  }
  reopen(p: Project) {
    this.projectSvc.reopen(p.id).subscribe(() => this.load());
  }
  askDelete(p: Project) {
    this.pendingDeleteId = p.id;
    this.showConfirmDelete.set(true);
  }
  confirmDelete() {
    if (this.pendingDeleteId == null) return;
    this.projectSvc.delete(this.pendingDeleteId).subscribe(() => {
      this.pendingDeleteId = null;
      this.showConfirmDelete.set(false);
      this.load();
      this.toast.show('Proyecto eliminado');
    });
  }

  addObservation(p: Project) {
    const text = (this.obsInputs[p.id] || '').trim();
    if (!text) return;
    this.projectSvc.addObservation(p.id, text).subscribe(() => {
      this.obsInputs[p.id] = '';
      this.load();
    });
  }
  deleteObservation(p: Project, obsId: number) {
    this.projectSvc.deleteObservation(p.id, obsId).subscribe(() => this.load());
  }

  openNewProject() {
    this.m_name = '';
    this.m_client = '';
    this.m_owner = this.auth.user()?.display_name || '';
    this.m_start = '';
    this.m_deadline = '';
    this.m_priority = 'media';
    this.m_obs = '';
    this.m_nameErr = false;
    this.showProjectModal.set(true);
  }

  saveProject() {
    if (!this.m_name.trim()) { this.m_nameErr = true; return; }
    this.m_nameErr = false;
    this.projectSvc.create({
      name: this.m_name.trim(),
      client: this.m_client.trim(),
      owner: this.m_owner,
      startDate: this.m_start || null,
      deadline: this.m_deadline || null,
      priority: this.m_priority,
      obs: this.m_obs.trim() || undefined
    }).subscribe({
      next: (p) => {
        const obs = this.m_obs.trim();
        const finish = () => {
          this.showProjectModal.set(false);
          this.currentTab.set('active');
          this.load();
          this.toast.show('Proyecto creado ✓');
        };
        if (obs) {
          this.projectSvc.addObservation(p.id, obs).subscribe({ next: finish, error: finish });
        } else {
          finish();
        }
      }
    });
  }

  trackById = (_: number, p: Project) => p.id;
  trackObs = (_: number, o: { id: number }) => o.id;
}
