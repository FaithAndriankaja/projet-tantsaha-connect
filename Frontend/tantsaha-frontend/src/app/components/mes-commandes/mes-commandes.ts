import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
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

  constructor(
    private authService: AuthService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.loadOrders();
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  logout() {
    this.authService.logout();
  }

  loadOrders() {
    this.loading = true;
    this.error = '';
    this.api.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger vos commandes.';
        this.loading = false;
      },
    });
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
      ready_for_pickup: 'Prête à récupérer',
      delivered: 'Livrée',
      cancelled: 'Annulée',
    };
    return map[status] || status;
  }

  statusIcon(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'schedule',
      payment_submitted: 'upload',
      confirmed: 'check_circle',
      ready_for_pickup: 'store',
      delivered: 'verified',
      cancelled: 'cancel',
    };
    return map[status] || 'help';
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'text-amber-600 bg-amber-50',
      payment_submitted: 'text-blue-600 bg-blue-50',
      confirmed: 'text-green-600 bg-green-50',
      ready_for_pickup: 'text-purple-600 bg-purple-50',
      delivered: 'text-primary bg-primary/10',
      cancelled: 'text-red-600 bg-red-50',
    };
    return map[status] || 'text-gray-600 bg-gray-50';
  }

  progressStep(status: string): number {
    const steps: Record<string, number> = {
      pending_payment: 1,
      payment_submitted: 2,
      confirmed: 3,
      ready_for_pickup: 4,
      delivered: 5,
      cancelled: 0,
    };
    return steps[status] ?? 0;
  }
}
