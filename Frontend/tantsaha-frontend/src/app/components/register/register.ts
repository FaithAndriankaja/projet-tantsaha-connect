import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; //  AJOUT : Essentiel pour ngModel
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service'; //  AJOUT : Pour appeler l'API d'inscription
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  cartCount = 0;

  //  AJOUT : États et liaisons de données du formulaire natif Angular
  currentStep = 1;
  role = ''; // 'consumer' | 'producer' | 'manager'
  fullName = '';
  phone = '';
  password = '';
  farmName = '';
  location = '';
  pickupAddress = '';

  isSubmitting = false;
  registerError = '';

  constructor(
    private el: ElementRef,
    private router: Router,
    private authService: AuthService,
    private apiService: ApiService, //  AJOUT : Injection de l'ApiService
    private cart: CartService
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
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

  //  AJOUT : Gestionnaire de soumission d'inscription 100% Angular
  onRegisterSubmit() {
    this.isSubmitting = true;
    this.registerError = '';

    // Construction du payload attendu par le backend Django REST Framework
    const payload = {
      phone: this.phone.trim(),
      password: this.password,
      full_name: this.fullName.trim(),
      role: this.role,
      ...(this.role === 'producer' && {
        farm_name: this.farmName.trim(),
        location: this.location.trim()
      }),
      ...(this.role === 'manager' && {
        location: this.pickupAddress.trim() // Liaison de l'adresse du point pour le Mpandrindra
      })
    };

    this.apiService.register(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        alert('Compte créé avec succès ! Veuillez vous connecter.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error("Erreur renvoyée par Django :", err);
        this.registerError = err?.error?.detail || "Erreur lors de l'inscription. Vérifiez les informations saisies.";
      }
    });
  }

  ngAfterViewInit() {
    // Conserver uniquement l'effet visuel Material 3 sur les inputs s'ils existent dans le DOM
    const inputs = this.el.nativeElement.querySelectorAll('input');
    inputs.forEach((input: HTMLInputElement) => {
      input.addEventListener('focus', () => {
        const label = input.parentElement?.previousElementSibling;
        label?.classList.add('text-primary');
        label?.classList.remove('text-on-surface-variant');
      });
      input.addEventListener('blur', () => {
        const label = input.parentElement?.previousElementSibling;
        label?.classList.remove('text-primary');
        label?.classList.add('text-on-surface-variant');
      });
    });
  }
}
