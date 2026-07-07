import { Component, AfterViewInit, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('verificationCodeInput') verificationCodeInput?: ElementRef<HTMLInputElement>;

  currentUser: User | null = null;
  cartCount = 0;

  currentStep = 1;
  role = '';
  fullName = '';
  phone = '';
  email = '';
  password = '';
  confirmPassword = '';
  farmName = '';
  location = '';
  pickupPointName = '';
  pickupAddress = '';
  pickupCity = '';

  isSubmitting = false;
  registerError = '';
  registrationMessage = '';
  verificationCode = '';
  verificationError = '';
  resendMessage = '';
  isVerifying = false;
  isResendingCode = false;
  verificationSuccess = false;
  resendCountdown = 0;
  private resendTimer?: ReturnType<typeof setInterval>;
  private autoVerifyTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private el: ElementRef,
    private router: Router,
    private authService: AuthService,
    private cart: CartService,
    private notification: NotificationService
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
      if (user && this.currentStep !== 3) {
        this.router.navigate([this.authService.getDefaultRouteAfterAuth()]);
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

  onRegisterSubmit() {
    this.isSubmitting = true;
    this.registerError = '';

    // Change step immediately (optimistic UI)
    this.currentStep = 3;

    const payload = {
      phone: this.phone.trim(),
      email: this.email.trim(),
      password: this.password,
      full_name: this.fullName.trim(),
      role: this.role,
      ...(this.role === 'producer' && {
        farm_name: this.farmName.trim(),
        location: this.location.trim()
      }),
      ...(this.role === 'manager' && {
        pickup_point_name: this.pickupPointName.trim(),
        pickup_address: this.pickupAddress.trim(),
        pickup_city: this.pickupCity.trim()
      })
    };

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.registrationMessage = res.detail || 'Compte créé. Saisissez le code reçu par email.';
        this.verificationCode = '';
        this.verificationError = '';
        this.resendMessage = '';
        this.verificationSuccess = false;
        this.startResendCooldown(res.resend_available_in || 10);
        setTimeout(() => this.focusVerificationInput(), 350);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.currentStep = 2; // Slide back if fail
        console.error("Erreur renvoyée par Django :", err);

        let errorMessage = err?.error?.detail || "Erreur lors de l'inscription. Vérifiez les informations saisies.";
        if (err.name === 'TimeoutError') {
          errorMessage = "Délai d'attente dépassé (5s). Le serveur met trop de temps à répondre.";
        }

        this.registerError = errorMessage;
      }
    });
  }

  onVerificationCodeInput(value: string): void {
    const normalizedCode = (value || '').replace(/\D/g, '').slice(0, 6);
    if (normalizedCode !== this.verificationCode) {
      this.verificationCode = normalizedCode;
    }

    this.verificationError = '';
  }

  verifyRegistrationCode(): void {
    if (this.verificationCode.trim().length !== 6) {
      this.verificationError = 'Le code doit contenir exactement 6 chiffres.';
      return;
    }

    this.isVerifying = true;
    this.verificationError = '';
    this.resendMessage = '';

    this.authService.verifyEmail({
      code: this.verificationCode.trim(),
      email: this.email.trim(),
    }).subscribe({
      next: (res) => {
        this.isVerifying = false;
        this.verificationSuccess = true;
        this.registrationMessage = res.detail || 'Compte vérifié avec succès.';
        this.clearResendTimer();
        setTimeout(() => {
          this.router.navigate([this.authService.getDefaultRouteAfterAuth()]);
        }, 5500);
      },
      error: (err) => {
        this.isVerifying = false;
        this.verificationError = err?.error?.detail || 'Code invalide ou expiré.';
      }
    });
  }

  resendVerificationCode(): void {
    if (!this.email.trim()) {
      this.verificationError = 'Adresse email manquante.';
      return;
    }

    this.isResendingCode = true;
    this.verificationError = '';
    this.resendMessage = '';

    this.authService.resendVerificationCode(this.email.trim()).subscribe({
      next: (res) => {
        this.isResendingCode = false;
        this.verificationCode = '';
        this.resendMessage = res.detail || 'Un nouveau code de vérification a été envoyé.';
        this.startResendCooldown(res.resend_available_in || 10);
        setTimeout(() => this.focusVerificationInput(), 100);
      },
      error: (err) => {
        this.isResendingCode = false;
        this.verificationError = err?.error?.detail || "Impossible de renvoyer le code pour le moment.";
        const retryAfter = Number(err?.error?.retry_after || 0);
        if (retryAfter > 0) {
          this.startResendCooldown(retryAfter);
        }
      }
    });
  }

  goBackToDetails(): void {
    this.goToStep(2);
  }

  goToStep(step: number): void {
    // Only allow navigating to completed or current steps conditionally
    if (step === 1) {
      this.currentStep = 1;
    } else if (step === 2 && this.role) {
      this.currentStep = 2;
    } else if (step === 3 && this.registrationMessage) {
      // Can only go to step 3 if we already submitted the form and have a pending verification
      this.currentStep = 3;
    }

    // Clear errors when navigating away
    if (step !== 3) {
      this.verificationError = '';
      this.resendMessage = '';
    }
  }

  ngOnDestroy(): void {
    this.clearResendTimer();
    if (this.autoVerifyTimer) {
      clearTimeout(this.autoVerifyTimer);
    }
  }

  ngAfterViewInit() {
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

  private focusVerificationInput(): void {
    this.verificationCodeInput?.nativeElement?.focus();
  }

  private startResendCooldown(seconds: number): void {
    this.clearResendTimer();
    this.resendCountdown = Math.max(0, Math.ceil(seconds));
    if (this.resendCountdown <= 0) {
      return;
    }

    this.resendTimer = setInterval(() => {
      this.resendCountdown = Math.max(0, this.resendCountdown - 1);
      if (this.resendCountdown === 0) {
        this.clearResendTimer();
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = undefined;
    }
  }
}
