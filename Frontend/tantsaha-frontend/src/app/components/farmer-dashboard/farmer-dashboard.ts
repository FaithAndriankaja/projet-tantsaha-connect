import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { HarvestLine, Category } from '../../models/shop.models';

@Component({
  selector: 'app-farmer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css',
})
export class FarmerDashboard implements OnInit {
  currentUser: User | null = null;
  harvestLines: HarvestLine[] = [];
  categories: Category[] = [];

  loading = true;
  error = '';
  successMessage = '';
  isSidePanelOpen = false;
  isSavingProduct = false;

  farmName = 'Ma ferme';
  totalProducts = 0;
  totalOrdersCount = 0;
  totalQuantityToPrepare = 0;

  newProductName = '';
  newProductCategory = '';
  newProductQty = 1;
  newProductUnit = 'kg';
  newProductPrice = 0;
  newProductDescription = '';

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });

    this.loadCategories();
    this.loadHarvestSheet();
  }

  loadHarvestSheet() {
    this.loading = true;
    this.error = '';

    this.api.getHarvestSheet().subscribe({
      next: (lines) => {
        this.harvestLines = lines ?? [];
        this.recalculateStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement feuille récolte:', err);
        console.error('Détails backend:', err?.error);

        this.error =
          this.extractError(err) ||
          'Impossible de charger la feuille de récolte. Vérifiez la vue SQL harvest_sheet_view côté Django.';

        this.harvestLines = [];
        this.recalculateStats();
        this.loading = false;
      },
    });
  }

  newProductImagePath = '';

  loadCategories() {
    this.api.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats ?? [];

        if (!this.newProductCategory && this.categories.length > 0) {
          this.newProductCategory = this.categories[0].id;
        }
      },
      error: (err) => {
        console.error('Erreur chargement catégories:', err);
      },
    });
  }

  onAddProductSubmit() {
    this.error = '';
    this.successMessage = '';

    if (
      !this.newProductName.trim() ||
      !this.newProductCategory ||
      this.newProductQty <= 0 ||
      this.newProductPrice <= 0
    ) {
      this.error = 'Veuillez renseigner le nom, la catégorie, la quantité et le prix.';
      return;
    }

    this.isSavingProduct = true;


    const formData = new FormData();

    formData.append('name', this.newProductName.trim());
    formData.append('description', this.newProductDescription.trim());
    formData.append('category_id', this.newProductCategory);
    formData.append('unit', this.newProductUnit);
    formData.append('unit_price', String(this.newProductPrice));
    formData.append('quantity', String(this.newProductQty));

    if (this.selectedImageFile) {
      formData.append('image', this.selectedImageFile);
    }


    console.log('Payload récolte envoyé:', formData);

    this.api.createStock(formData).subscribe({
      next: () => {
        this.successMessage = 'Récolte enregistrée avec succès.';
        this.isSavingProduct = false;
        this.isSidePanelOpen = false;
        this.resetForm();
        this.loadHarvestSheet();
      },
      error: (err: any) => {
        console.error('Erreur création récolte:', err);
        console.error('Détails backend:', err?.error);

        this.error =
          this.extractError(err) ||
          "Erreur lors de l'enregistrement de la récolte.";

        this.isSavingProduct = false;
      },
    });
  }

  toggleSidePanel() {
    this.isSidePanelOpen = !this.isSidePanelOpen;
    this.error = '';
    this.successMessage = '';
  }

  togglingProductId: string | null = null;

  toggleProductVisibility(item: HarvestLine) {
    console.warn(
      'toggleProductVisibility désactivé : HarvestSheetView ne contient pas is_promoted ni stock_id.',
      item
    );
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  formatQty(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('fr-FR').format(n) : '0';
  }

  formatPrice(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('fr-MG').format(n) : '0';
  }

  private recalculateStats() {
    this.farmName = this.harvestLines[0]?.farm_name || 'Ma ferme';

    this.totalProducts = this.harvestLines.length;

    this.totalOrdersCount = this.harvestLines.reduce(
      (sum, line) => sum + Number(line.order_count || 0),
      0
    );

    this.totalQuantityToPrepare = this.harvestLines.reduce((sum, line) => {
      const qty = parseFloat(String(line.total_quantity_to_prepare ?? 0));
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
  }

  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedImageFile = null;
      this.imagePreviewUrl = '';
      return;
    }

    this.selectedImageFile = input.files[0];
    this.imagePreviewUrl = URL.createObjectURL(this.selectedImageFile);
  }

  private resetForm() {
    this.newProductName = '';
    this.newProductQty = 1;
    this.newProductUnit = 'kg';
    this.newProductPrice = 0;
    this.newProductDescription = '';
    this.newProductCategory = this.categories[0]?.id ?? '';
    this.newProductImagePath = '';
    this.selectedImageFile = null;
    this.imagePreviewUrl = '';
  }

  private extractError(err: any): string {
    const data = err?.error;

    if (!data) return '';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.message) return data.message;

    try {
      return Object.entries(data)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(', ')}`;
          }

          if (typeof value === 'object') {
            return `${key}: ${JSON.stringify(value)}`;
          }

          return `${key}: ${value}`;
        })
        .join(' | ');
    } catch {
      return '';
    }
  }
}