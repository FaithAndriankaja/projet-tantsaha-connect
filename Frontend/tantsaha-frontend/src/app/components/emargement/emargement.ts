import { Component, OnInit } from '@angular/core';
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

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) { }

  pickupPoints: PickupPoint[] = [];

  loadPickupPoints() {
    this.api.getPickupPoints().subscribe({
      next: (points) => {
        this.pickupPoints = points ?? [];

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
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.loadDeliveries();
    this.loadSaleSessions();
    this.loadPickupPoints();
  }

  loadDeliveries() {
    this.loading = true;
    this.error = '';

    this.api.getManagerDeliveries().subscribe({
      next: (data) => {
        this.deliveries = data ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement livraisons Mpandrindra:', err);
        this.error = this.extractError(err) || 'Impossible de charger les commandes du point de retrait.';
        this.deliveries = [];
        this.loading = false;
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private extractError(err: any): string {
    const data = err?.error;
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    try {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' | ');
    } catch {
      return '';
    }
  }
}
