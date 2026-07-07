import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  cartCount = 0;

  phone = '';
  password = '';
  isSubmitting = false;
  loginError = '';
  verifiedSuccess = false;
  emailNotVerified = false;
  unverifiedEmail = '';
  isResendingCode = false;
  resendMessage = '';

  constructor(
    private el: ElementRef,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cart: CartService
  ) { }

  ngOnInit() {
    const phoneParam = this.route.snapshot.queryParamMap.get('phone');
    if (phoneParam) {
      this.phone = phoneParam;
    }
    this.verifiedSuccess = this.route.snapshot.queryParamMap.get('verified') === '1';

    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;

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

  onSubmit() {
    if (!this.phone.trim() || !this.password) {
      this.loginError = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isSubmitting = true;
    this.loginError = '';
    this.emailNotVerified = false;
    this.resendMessage = '';

    this.authService.login(this.phone.trim(), this.password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.redirectToDashboard();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Erreur authentification Django:', err);

        if (err?.status === 403 && err?.error?.code === 'email_not_verified') {
          this.loginError = err.error.detail;
          this.emailNotVerified = true;
          this.unverifiedEmail = err.error.email || '';
        } else {
          this.loginError = err?.error?.detail || 'Numéro de téléphone ou mot de passe incorrect.';
        }
      }
    });
  }

  resendVerificationCode(): void {
    const email = this.unverifiedEmail.trim();
    if (!email) {
      return;
    }

    this.isResendingCode = true;
    this.resendMessage = '';

    this.authService.resendVerificationCode(email).subscribe({
      next: (res) => {
        this.isResendingCode = false;
        this.resendMessage = res.detail || 'Un nouveau code de vérification a été envoyé.';
      },
      error: (err) => {
        this.isResendingCode = false;
        this.resendMessage = err?.error?.detail || "Impossible de renvoyer le code pour le moment.";
      }
    });
  }

  private redirectToDashboard() {
    const targetRoute = this.authService.getDefaultRouteAfterAuth();
    this.router.navigate([targetRoute]);
  }

  ngAfterViewInit() {
    const togglePassword = this.el.nativeElement.querySelector('#togglePassword');
    const passwordInput = this.el.nativeElement.querySelector('#password');
    const passwordIcon = this.el.nativeElement.querySelector('#passwordIcon');
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

    if (togglePassword && passwordInput && passwordIcon) {
      togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        passwordIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
      });
    }
  }
}
