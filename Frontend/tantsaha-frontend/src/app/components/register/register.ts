import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit, AfterViewInit {
  private selectedRole: string = '';
  currentUser: User | null = null;
  cartCount = 0;

  constructor(
    private el: ElementRef,
    private router: Router,
    private authService: AuthService,
    private cart: CartService
  ) {}

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

  ngAfterViewInit() {
    const onboardingForm = this.el.nativeElement.querySelector('#onboardingForm');
    const roleInputs = this.el.nativeElement.querySelectorAll('input[name="role"]');
    const nextBtn = this.el.nativeElement.querySelector('#nextBtn');
    const backBtn = this.el.nativeElement.querySelector('#backBtn');
    const submitBtn = this.el.nativeElement.querySelector('#submitBtn');
    const step1Content = this.el.nativeElement.querySelector('#step-1-content');
    const step2Content = this.el.nativeElement.querySelector('#step-2-content');
    const stepTitle = this.el.nativeElement.querySelector('#step-title');
    const step1Label = this.el.nativeElement.querySelector('#step-1-label');
    const step2Label = this.el.nativeElement.querySelector('#step-2-label');
    const timeGrid = this.el.nativeElement.querySelector('#timeGrid');

    if (timeGrid) {
      for (let i = 0; i < 49; i++) {
        const div = document.createElement('div');
        div.className = 'h-6 rounded bg-surface-container-high border border-outline-variant/10 flex items-center justify-center cursor-not-allowed opacity-50';
        timeGrid.appendChild(div);
      }
    }

    roleInputs.forEach((input: HTMLInputElement) => {
      input.addEventListener('change', () => {
        this.selectedRole = input.value;
        nextBtn.disabled = false;
      });
    });

    nextBtn.addEventListener('click', () => {
      if (!this.selectedRole) return;

      step1Label.classList.remove('text-primary');
      step1Label.classList.add('text-on-surface-variant/50');
      step1Label.querySelector('span').classList.remove('bg-primary');
      step1Label.querySelector('span').classList.add('bg-surface-container');

      step2Label.classList.remove('text-on-surface-variant/50');
      step2Label.classList.add('text-primary');
      step2Label.querySelector('span').classList.remove('bg-surface-container');
      step2Label.querySelector('span').classList.add('bg-primary');

      stepTitle.textContent = 'Complétez vos informations';

      step1Content.classList.add('hidden');
      step2Content.classList.remove('hidden');

      this.el.nativeElement.querySelector('#tantsaha-fields').classList.add('hidden');
      this.el.nativeElement.querySelector('#mpandrindra-fields').classList.add('hidden');
      if (this.selectedRole !== 'mpanjifa') {
        this.el.nativeElement.querySelector(`#${this.selectedRole}-fields`).classList.remove('hidden');
      }

      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
      backBtn.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
      step2Label.classList.remove('text-primary');
      step2Label.classList.add('text-on-surface-variant/50');
      step2Label.querySelector('span').classList.remove('bg-primary');
      step2Label.querySelector('span').classList.add('bg-surface-container');

      step1Label.classList.remove('text-on-surface-variant/50');
      step1Label.classList.add('text-primary');
      step1Label.querySelector('span').classList.remove('bg-surface-container');
      step1Label.querySelector('span').classList.add('bg-primary');

      stepTitle.textContent = 'Choisissez votre profil';

      step1Content.classList.remove('hidden');
      step2Content.classList.add('hidden');

      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
      backBtn.classList.add('hidden');
    });

    if (onboardingForm) {
      onboardingForm.addEventListener('submit', (e: Event) => {
        e.preventDefault();

        const phone = (onboardingForm.querySelector('#registerPhone') as HTMLInputElement).value.trim();
        const password = (onboardingForm.querySelector('#registerPassword') as HTMLInputElement).value;
        const fullName = (onboardingForm.querySelector('#registerFullName') as HTMLInputElement).value.trim();
        const email = (onboardingForm.querySelector('#registerEmail') as HTMLInputElement).value.trim();
        const producerNameInput = onboardingForm.querySelector('#producerName') as HTMLInputElement | null;
        const locationSelect = onboardingForm.querySelector('#producerLocation') as HTMLSelectElement | null;

        const userData = {
          phone,
          password,
          full_name: fullName,
          email: email || undefined,
          role: this.selectedRole,
          farm_name:
            this.selectedRole === 'tantsaha' && producerNameInput?.value
              ? producerNameInput.value.trim()
              : undefined,
          location:
            this.selectedRole === 'tantsaha' && locationSelect?.value
              ? locationSelect.value
              : undefined,
        };

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-spin mr-2">◌</span> Inscription...';

        this.authService.register(userData).subscribe({
          next: () => {
            alert('Compte créé avec succès ! Bienvenue.');
            this.router.navigate([this.authService.getDefaultRouteAfterAuth()]);
          },
          error: (err) => {
            submitBtn.disabled = false;
            submitBtn.textContent = "S'inscrire";
            alert(err?.error?.detail || "Erreur lors de l'inscription.");
          },
        });
      });
    }
  }
}
