import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, catchError, exhaustMap, filter, map, of, timeout } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { OrderSummary } from '../../models/shop.models';

@Component({
  selector: 'app-mes-commandes',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './mes-commandes.html',
  styleUrl: './mes-commandes.css',
})
export class MesCommandes implements OnInit {
  currentUser: User | null = null;
  orders: OrderSummary[] = [];
  loading = true;
  error = '';
  expandedOrderId: string | null = null;

  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.syncSession();

    this.reload$.pipe(
      exhaustMap(() => this.fetchOrders()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ orders, error }) => {
      this.orders = orders;
      this.error = error;
      this.loading = false;
      this.cdr.markForCheck();
    });

    this.authService.currentUser.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((user) => {
      this.currentUser = user;
      if (user && this.authService.isLoggedIn()) {
        this.requestLoad();
      } else {
        this.orders = [];
        this.loading = false;
        this.error = '';
        this.cdr.markForCheck();
      }
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      filter(() => this.router.url.includes('/mes-commandes')),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      if (this.authService.isLoggedIn()) {
        this.requestLoad();
      }
    });
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadOrders() {
    this.requestLoad();
  }

  private requestLoad() {
    if (!this.authService.isLoggedIn()) {
      this.loading = false;
      this.orders = [];
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.reload$.next();
  }

  private fetchOrders() {
    return this.api.getOrders().pipe(
      timeout(15000),
      map((orders) => ({ orders: orders ?? [], error: '' })),
      catchError(() => of({ orders: [] as OrderSummary[], error: 'Impossible de charger vos commandes.' }))
    );
  }

  toggleOrder(orderId: string) {
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  formatPrice(value: string | number): string {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('fr-MG').format(n);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'En attente de paiement',
      payment_submitted: 'Paiement soumis',
      confirmed: 'Confirmée',
      ready: 'Prête à récupérer',
      picked_up: 'Récupérée',
      cancelled: 'Annulée',
    };
    return map[status] || status;
  }

  statusIcon(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'schedule',
      payment_submitted: 'upload',
      confirmed: 'check_circle',
      ready: 'store',
      picked_up: 'verified',
      cancelled: 'cancel',
    };
    return map[status] || 'help';
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'text-amber-600 bg-amber-50',
      payment_submitted: 'text-blue-600 bg-blue-50',
      confirmed: 'text-green-600 bg-green-50',
      ready: 'text-purple-600 bg-purple-50',
      picked_up: 'text-primary bg-primary/10',
      cancelled: 'text-red-600 bg-red-50',
    };
    return map[status] || 'text-gray-600 bg-gray-50';
  }

  progressStep(status: string): number {
    const steps: Record<string, number> = {
      pending_payment: 1,
      payment_submitted: 2,
      confirmed: 3,
      ready: 4,
      picked_up: 5,
      cancelled: 0,
    };
    return steps[status] ?? 0;
  }
}
