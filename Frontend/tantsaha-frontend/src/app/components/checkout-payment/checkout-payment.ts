import { Component, OnInit, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { CreatedOrder, OrderItemSummary } from '../../models/shop.models';
import { MVOLA_PAYMENT_NUMBER } from '../../config/nav.config';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';

@Component({
  selector: 'app-checkout-payment',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './checkout-payment.html',
  styleUrl: './checkout-payment.css',
})
export class CheckoutPayment implements OnInit, AfterViewChecked {
  currentUser: User | null = null;
  order: CreatedOrder | null = null;

  // Mobile Money
  selectedFile: File | null = null;
  paymentMethod = 'mvola';
  mvolaNumber = MVOLA_PAYMENT_NUMBER;

  // Mode : 'mobile' | 'stripe'
  activeTab: 'mobile' | 'stripe' = 'mobile';

  // Stripe
  private stripeInstance: Stripe | null = null;
  private cardElement: StripeCardElement | null = null;
  private cardElementMounted = false;
  stripeLoading = false;
  stripeReady = false;
  stripeError = '';

  // UI
  submitting = false;
  error = '';
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cart: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

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

  ngAfterViewChecked() {
    // Monte le CardElement Stripe dans le div dédié dès que l'onglet stripe est actif
    if (this.activeTab === 'stripe' && this.stripeInstance && !this.cardElementMounted) {
      const mountPoint = document.getElementById('stripe-card-element');
      if (mountPoint && mountPoint.childElementCount === 0) {
        const elements = this.stripeInstance.elements();
        this.cardElement = elements.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#1a1a1a',
              fontFamily: '"Inter", "Roboto", sans-serif',
              '::placeholder': { color: '#9ca3af' },
            },
            invalid: { color: '#ef4444' },
          },
          hidePostalCode: true,
        });
        this.cardElement.mount(mountPoint);
        this.cardElementMounted = true;
        this.stripeReady = true;
        this.cdr.detectChanges();
      }
    }
  }

  switchTab(tab: 'mobile' | 'stripe') {
    this.activeTab = tab;
    this.error = '';
    this.stripeError = '';

    if (tab === 'stripe' && !this.stripeInstance) {
      this.initStripe();
    }
  }

  private async initStripe() {
    this.stripeLoading = true;
    try {
      // On récupère d'abord la clé publique depuis le backend (sécurisé)
      if (!this.order) return;
      const intentData = await this.api.createPaymentIntent(this.order.id).toPromise();
      if (!intentData) { this.stripeLoading = false; return; }

      this.stripeInstance = await loadStripe(intentData.public_key);
      this.stripeLoading = false;
      this.cardElementMounted = false; // ngAfterViewChecked va monter l'élément
      this.cdr.detectChanges();
    } catch (err: any) {
      this.stripeLoading = false;
      this.stripeError = "Impossible de charger Stripe. Veuillez réessayer.";
    }
  }

  async payWithStripe() {
    if (!this.order || !this.stripeInstance || !this.cardElement) {
      this.stripeError = 'Stripe non initialisé. Veuillez réessayer.';
      return;
    }

    this.submitting = true;
    this.stripeError = '';
    this.error = '';

    try {
      // Crée un nouveau PaymentIntent (le premier était pour récupérer la clé publique)
      const intentData = await this.api.createPaymentIntent(this.order.id).toPromise();
      if (!intentData) { this.submitting = false; return; }

      const result = await this.stripeInstance.confirmCardPayment(intentData.client_secret, {
        payment_method: { card: this.cardElement },
      });

      if (result.error) {
        this.stripeError = result.error.message || 'Erreur lors du paiement. Veuillez réessayer.';
        this.submitting = false;
      } else if (result.paymentIntent?.status === 'succeeded') {
        this.submitting = false;
        this.router.navigate(['/commande-succes']);
      }
    } catch (err: any) {
      this.submitting = false;
      this.stripeError = 'Une erreur réseau est survenue. Veuillez réessayer.';
    }
  }

  // ---------- Mobile Money ----------

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  get items(): OrderItemSummary[] {
    return this.order?.items ?? [];
  }

  get stripeInitialized(): boolean {
    return !!this.stripeInstance;
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
