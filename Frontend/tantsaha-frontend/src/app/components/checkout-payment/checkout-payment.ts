import { Component, OnInit } from '@angular/core';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { CreatedOrder, OrderItemSummary } from '../../models/shop.models';
import { MVOLA_PAYMENT_NUMBER } from '../../config/nav.config';

@Component({
  selector: 'app-checkout-payment',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './checkout-payment.html',
  styleUrl: './checkout-payment.css',
})
export class CheckoutPayment implements OnInit {
  currentUser: User | null = null;
  order: CreatedOrder | null = null;
  selectedFile: File | null = null;
  paymentMethod = 'mvola';
  submitting = false;
  error = '';
  cartCount = 0;
  mvolaNumber = MVOLA_PAYMENT_NUMBER;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cart: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.cart.items$.subscribe((items) => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });
    this.order = this.cart.getLastOrder();
    if (!this.order) {
      this.router.navigate(['/panier-recap']);
    }
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  get items(): OrderItemSummary[] {
    return this.order?.items ?? [];
  }

  formatPrice(value: string | number): string {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return new Intl.NumberFormat('fr-MG').format(num);
  }

  lineTotal(item: OrderItemSummary): number {
    return parseFloat(item.unit_price) * item.quantity;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  confirmOrder() {
    if (!this.order || !this.selectedFile) {
      this.error = 'Veuillez joindre une preuve de paiement.';
      return;
    }

    this.submitting = true;
    this.error = '';

    this.api.uploadProof(this.selectedFile).pipe(
      switchMap((upload) =>
        this.api.uploadPayment(this.order!.id, {
          method: this.paymentMethod,
          proof_file_path: upload.proof_file_path,
        })
      )
    ).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/commande-succes']);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message || err?.error?.detail || "Erreur lors de l'envoi du paiement.";
      },
    });
  }
}
