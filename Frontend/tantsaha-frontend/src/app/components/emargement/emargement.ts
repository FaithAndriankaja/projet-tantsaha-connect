import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ManagerDelivery, PickupPoint } from '../../models/shop.models';

@Component({
  selector: 'app-emargement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emargement.html',
  styleUrl: './emargement.css',
})
export class Emargement implements OnInit {
  currentUser: User | null = null;
  deliveries: ManagerDelivery[] = [];
  loading = true;
  error = '';
  successMessage = '';
  validatingOrderId: string | null = null;
  searchTerm = '';

  pendingStocks: any[] = [];
  pendingLoading = false;

  allOrders: any[] = [];
  ordersLoading = false;

  // Configuration de la modale personnalisée
  modalConfig: { isOpen: boolean, title: string, message: string, onConfirm: () => void } | null = null;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  pickupPoints: PickupPoint[] = [];

  loadPickupPoints() {
    this.api.getPickupPoints().subscribe({
      next: (points) => {
        this.pickupPoints = points ?? [];

        if (this.pickupPoints.length === 0 && this.authService.isManager()) {
          this.error =
            'Aucun point de retrait ne vous est assigné. Contactez un administrateur pour rattacher votre compte Mpandrindra à un point de retrait.';
        }

        if (!this.newSession.pickup_point && this.pickupPoints.length > 0) {
          this.newSession.pickup_point = this.pickupPoints[0].id;
        }
      },
      error: (err: any) => {
        console.error('Erreur chargement points de retrait:', err);
        this.error = this.extractError(err) || 'Impossible de charger les points de retrait.';
      },
    });
  }

  ngOnInit() {
    this.authService.syncSession();
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });
    this.loadDeliveries();
    this.loadSaleSessions();
    this.loadPickupPoints();
    this.loadPendingStocks();
    this.loadAllOrders();
  }

  loadDeliveries() {
    this.loading = true;
    this.error = '';

    this.api.getManagerDeliveries().subscribe({
      next: (data) => {
        this.deliveries = data ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement livraisons Mpandrindra:', err);
        this.error = this.extractError(err) || 'Impossible de charger les commandes du point de retrait.';
        this.deliveries = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filteredDeliveries(): ManagerDelivery[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.deliveries;
    return this.deliveries.filter((delivery) => {
      const text = [
        delivery.transaction_code,
        delivery.consumer_name,
        delivery.consumer_phone,
        delivery.status,
        ...(delivery.items ?? []).map((item) => item.product_name),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }

  get waitingCount(): number {
    return this.deliveries.filter((d) => !this.isDelivered(d)).length;
  }

  get deliveredCount(): number {
    return this.deliveries.filter((d) => this.isDelivered(d)).length;
  }

  validateHandover(delivery: ManagerDelivery) {
    if (!delivery?.id || this.validatingOrderId) return;
    if (this.isDelivered(delivery)) return;

    const ok = confirm(`Valider la remise physique de la commande ${delivery.transaction_code} ?`);
    if (!ok) return;

    this.validatingOrderId = delivery.id;
    this.error = '';
    this.successMessage = '';

    this.api.confirmHandover(delivery.id).subscribe({
      next: (res) => {
        this.successMessage = `Commande ${res.transaction_code} validée. Statut : ${res.status}.`;
        this.validatingOrderId = null;
        this.loadDeliveries();
      },
      error: (err) => {
        console.error('Erreur validation remise:', err);
        this.error = this.extractError(err) || 'Erreur lors de la validation de la remise.';
        this.validatingOrderId = null;
      },
    });
  }

  openScanner() {
    const code = prompt('Entrez ou scannez le code transaction à valider :');
    if (!code) return;

    const delivery = this.deliveries.find((d) => d.transaction_code.toLowerCase() === code.trim().toLowerCase());
    if (!delivery) {
      this.error = `Aucune commande trouvée pour le code ${code}.`;
      this.successMessage = '';
      return;
    }

    this.validateHandover(delivery);
  }

  isDelivered(delivery: ManagerDelivery): boolean {
    return ['picked_up', 'delivered', 'completed', 'handed_over'].includes(
      (delivery.status || '').toLowerCase()
    );
  }

  statusLabel(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (['picked_up', 'delivered', 'completed', 'handed_over'].includes(normalized)) {
      return 'Remise validée';
    }
    if (['delivered', 'completed', 'handed_over'].includes(normalized)) return 'Remise validée';
    if (['ready', 'prepared'].includes(normalized)) return 'Prêt au point de retrait';
    if (['confirmed', 'paid'].includes(normalized)) return 'Payé / à remettre';
    if (['pending'].includes(normalized)) return 'En attente';
    return status || 'Statut inconnu';
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  saleSessions: any[] = [];
  sessionLoading = false;

  newSession = {
    pickup_point: '',
    opens_at: '',
    closes_at: '',
    pickup_date: '',
    status: 'open',
  };

  loadSaleSessions() {
    this.sessionLoading = true;

    this.api.getSaleSessions().subscribe({
      next: (sessions) => {
        this.saleSessions = sessions ?? [];
        this.sessionLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement sessions:', err);
        this.error = this.extractError(err) || 'Impossible de charger les sessions de vente.';
        this.sessionLoading = false;
      },
    });
  }
  createSaleSession() {
    this.error = '';
    this.successMessage = '';

    if (
      !this.newSession.pickup_point ||
      !this.newSession.opens_at ||
      !this.newSession.closes_at ||
      !this.newSession.pickup_date
    ) {
      this.error = 'Veuillez remplir tous les champs de la session.';
      return;
    }

    const opensAt = new Date(this.newSession.opens_at);
    const closesAt = new Date(this.newSession.closes_at);
    const pickupDate = new Date(this.newSession.pickup_date);

    if (closesAt <= opensAt) {
      this.error = 'La fin des ventes doit être après le début des ventes.';
      return;
    }

    if (pickupDate < new Date(closesAt.toDateString())) {
      this.error = 'La date de retrait doit être après ou égale à la date de clôture.';
      return;
    }

    const payload = {
      pickup_point: this.newSession.pickup_point,
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
      pickup_date: this.newSession.pickup_date,
      status: 'open',
    };

    console.log('Payload session envoyé:', payload);

    this.api.createSaleSession(payload).subscribe({
      next: () => {
        this.successMessage = 'Session de vente créée avec succès.';
        this.newSession = {
          pickup_point: '',
          opens_at: '',
          closes_at: '',
          pickup_date: '',
          status: 'open',
        };
        this.loadSaleSessions();
        this.loadPickupPoints();
      },
      error: (err: any) => {
        console.error('Erreur création session complète:', err);
        console.error('Détails Django:', JSON.stringify(err?.error, null, 2));

        this.error =
          this.extractError(err) ||
          'Impossible de créer la session.';
      },
    });
  }

  closeSaleSession(session: any) {
    this.api.updateSaleSession(session.id, { status: 'closed' }).subscribe({
      next: () => {
        this.successMessage = 'Session fermée avec succès.';
        this.loadSaleSessions();
      },
      error: (err: any) => {
        console.error('Erreur création session complète:', err);
        console.error('Détails Django:', JSON.stringify(err?.error, null, 2));

        this.error =
          this.extractError(err) ||
          'Impossible de créer la session.';
      }
    });
  }



  private extractError(err: any): string {
    const data = err?.error;
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.details && typeof data.details === 'object') {
      return Object.entries(data.details)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' | ');
    }
    if (data.message && data.error_code) return data.message;
    if (data.message) return data.message;
    try {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' | ');
    } catch {
      return '';
    }
  }

  // --- Workflow: Charger les offres en attente d'approbation ---
  loadPendingStocks() {
    this.pendingLoading = true;
    this.api.getMyStocks().subscribe({
      next: (stocks) => {
        this.pendingStocks = (stocks ?? []).filter((s: any) => s.approval_status === 'pending');
        this.pendingLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur chargement offres en attente:', err);
        this.pendingLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  approveOffer(stock: any) {
    this.openModal('Mise en vitrine', 'Approuver et mettre ce produit en vitrine pour la session choisie ?', () => {
      this.api.approveStock(stock.id).subscribe({
        next: () => {
          this.successMessage = 'Produit mis en vitrine avec succès.';
          this.loadPendingStocks();
          this.closeModal();
        },
        error: (err: any) => {
          this.error = this.extractError(err) || 'Impossible d\'approuver.';
          this.closeModal();
        }
      });
    });
  }

  // --- Workflow: Charger toutes les commandes pour le manager ---
  loadAllOrders() {
    this.ordersLoading = true;
    this.api.getOrders().subscribe({
      next: (orders) => {
        this.allOrders = orders ?? [];
        this.ordersLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur chargement commandes:', err);
        this.ordersLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get confirmedOrders(): any[] {
    return this.allOrders.filter((o: any) => o.status === 'confirmed');
  }
  get deliveringOrders(): any[] {
    return this.allOrders.filter((o: any) => o.status === 'delivering');
  }

  startDelivery(order: any) {
    this.openModal('Lancer la livraison', 'Lancer la livraison de cette commande ?', () => {
      this.api.startDelivery(order.id).subscribe({
        next: (res: any) => {
          this.successMessage = 'Livraison lancée.';
          order.status = res.status;
          this.loadAllOrders();
          this.closeModal();
        },
        error: (err: any) => {
          this.error = this.extractError(err) || 'Impossible de lancer la livraison.';
          this.closeModal();
        }
      });
    });
  }

  validateTransfer(order: any) {
    this.openModal('Valider le transfert', 'Confirmer le transfert d\'argent au producteur pour cette commande ?', () => {
      this.api.validateTransfer(order.id).subscribe({
        next: (res: any) => {
          this.successMessage = 'Transfert validé.';
          order.status = res.status;
          this.loadAllOrders();
          this.closeModal();
        },
        error: (err: any) => {
          this.error = this.extractError(err) || 'Impossible de valider le transfert.';
          this.closeModal();
        }
      });
    });
  }

  orderStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'En attente de paiement',
      payment_submitted: 'Paiement soumis',
      confirmed: 'Payée',
      ready: 'Prête',
      picked_up: 'Récupérée',
      delivering: 'En cours de livraison',
      closed: 'Clôturée',
      cancelled: 'Annulée',
    };
    return map[status] || status;
  }

  formatPrice(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('fr-MG').format(n) : '0';
  }

  logout() {
    this.authService.logout();
  }

  openModal(title: string, message: string, onConfirm: () => void) {
    this.modalConfig = { isOpen: true, title, message, onConfirm };
  }

  closeModal() {
    this.modalConfig = null;
  }
}


