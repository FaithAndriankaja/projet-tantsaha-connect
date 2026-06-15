import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 🌟 AJOUT : Indispensable pour lier le formulaire
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule], // 🌟 AJOUT : FormsModule ici
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  cartCount = 0;

  //  AJOUT : États du formulaire gérés proprement par Angular
  phone = '';
  password = '';
  isSubmitting = false;
  loginError = '';

  constructor(
    private el: ElementRef,
    private router: Router,
    private authService: AuthService,
    private cart: CartService
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;

      // Sécurité : Si un utilisateur déjà connecté revient sur /login, on le réoriente vers sa zone
      if (user) {
        this.redirectToDashboard();
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

  //  AJOUT : Gestionnaire de soumission de formulaire 100% Angular (à lier avec (ngSubmit)="onSubmit()" dans le HTML)
  onSubmit() {
    if (!this.phone.trim() || !this.password) {
      this.loginError = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isSubmitting = true;
    this.loginError = '';

    this.authService.login(this.phone.trim(), this.password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.redirectToDashboard();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Erreur authentification Django:', err);
        this.loginError = 'Numéro de téléphone ou mot de passe incorrect.';
      }
    });
  }

  private redirectToDashboard() {
    // Redirige dynamiquement selon le rôle (tantsaha, mpandrindra, acheteur) décodé par le backend Django
    const targetRoute = this.authService.getDefaultRouteAfterAuth();
    this.router.navigate([targetRoute]);
  }

  ngAfterViewInit() {
    const togglePassword = this.el.nativeElement.querySelector('#togglePassword');
    const passwordInput = this.el.nativeElement.querySelector('#password');
    const passwordIcon = this.el.nativeElement.querySelector('#passwordIcon');
    const inputs = this.el.nativeElement.querySelectorAll('input');

    // Effets visuels Material 3 sur les étiquettes (Labels)
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

    // Gestionnaire de visibilité du mot de passe
    if (togglePassword && passwordInput && passwordIcon) {
      togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        passwordIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
      });
    }
  }
}
