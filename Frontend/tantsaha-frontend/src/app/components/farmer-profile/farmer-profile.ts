import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ProducerProfile } from '../../models/shop.models';

@Component({
  selector: 'app-farmer-profile',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './farmer-profile.html',
  styleUrl: './farmer-profile.css',
})
export class FarmerProfile implements OnInit {
  currentUser: User | null = null;
  profile: ProducerProfile | null = null;
  loading = true;
  error = '';
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cart: CartService
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.cart.items$.subscribe((items) => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });
    this.loadProfile();
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  get farmName(): string {
    return this.profile?.farm_name ?? this.currentUser?.name ?? 'Ma ferme';
  }

  get location(): string {
    return this.profile?.location ?? 'Madagascar';
  }

  get description(): string {
    return this.profile?.description ?? 'Producteur local engagé dans une agriculture durable.';
  }

  loadProfile() {
    this.loading = true;
    this.error = '';
    this.api.getProducerProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger votre profil producteur.';
        this.loading = false;
      },
    });
  }
}
