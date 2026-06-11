import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, catchError, exhaustMap, map, of, timeout } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { OrderSummary } from '../../models/shop.models';

@Component({
  selector: 'app-profil-acheteur',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './profil-acheteur.html',
  styleUrl: './profil-acheteur.css',
})
export class ProfilAcheteur implements OnInit {
  currentUser: User | null = null;
  orders: OrderSummary[] = [];
  loading = true;
  error = '';
  cartCount = 0;

  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cart: CartService,
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

    this.cart.items$.subscribe((items) => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
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

  logout() {
    this.authService.logout();
  }

  formatPrice(value: string): string {
    return new Intl.NumberFormat('fr-MG').format(parseFloat(value));
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending_payment: 'En attente paiement',
      payment_submitted: 'Paiement envoyé',
      confirmed: 'Confirmée',
      ready: 'Prête',
      picked_up: 'Récupérée',
      cancelled: 'Annulée',
    };
    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    if (status === 'picked_up' || status === 'confirmed') return 'bg-success/10 text-success';
    if (status === 'cancelled') return 'bg-error/10 text-error';
    return 'bg-warning/10 text-warning';
  }
}
