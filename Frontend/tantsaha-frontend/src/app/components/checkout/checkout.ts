import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/shop.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  currentUser: User | null = null;
  cartItems: CartItem[] = [];
  cartCount = 0;
  submitting = false;
  error = '';

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cart: CartService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.cart.items$.subscribe((items) => {
      this.cartItems = items;
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });
  }

  get subtotal(): number {
    return this.cart.subtotal;
  }

  get pickupPointName(): string {
    return this.cartItems[0]?.pickup_point_name ?? 'Point de collecte';
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  get farmName(): string {
    return this.cartItems[0]?.farm_name ?? 'Producteur local';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('fr-MG').format(value);
  }

  lineTotal(item: CartItem): number {
    return item.unit_price * item.quantity;
  }

  decreaseQty(item: CartItem) {
    this.cart.updateQuantity(item.product_id, item.quantity - 1);
  }

  increaseQty(item: CartItem) {
    this.cart.updateQuantity(item.product_id, item.quantity + 1);
  }

  removeItem(item: CartItem) {
    this.cart.removeItem(item.product_id);
  }

  confirmOrder() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.cartItems.length === 0) {
      this.error = 'Votre panier est vide.';
      return;
    }

    const hasClosedSession = this.cartItems.some((item) => {
      const closesAt = new Date(item.closes_at);

      return (
        item.sale_session_status !== 'open' ||
        closesAt <= new Date()
      );
    });

    if (hasClosedSession) {
      this.submitting = false;
      this.error =
        'Votre panier contient un produit dont la session de vente est terminée. Veuillez le retirer du panier.';
      return;
    }

    const payload = this.cart.buildOrderPayload();

    if (!payload) {
      this.error = 'Impossible de préparer la commande.';
      return;
    }

    console.log('Payload commande envoyé à Django:', payload);

    this.submitting = true;
    this.error = '';

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.cart.saveLastOrder({
          ...order,
          pickup_point_name: order.pickup_point_name ?? this.pickupPointName,
        });

        this.cart.clear();
        this.submitting = false;
        this.router.navigate(['/panier-paiement']);
      },

      error: (err) => {
        this.submitting = false;

        console.error('Erreur création commande complète:', err);
        console.error(
          'Erreur Django details:',
          JSON.stringify(err?.error?.details, null, 2)
        );

        const apiError = err?.error;

        this.error =
          apiError?.details
            ? JSON.stringify(apiError.details)
            : apiError?.detail ||
            apiError?.message ||
            'Erreur lors de la création de la commande.';
      },
    });
  }


}
