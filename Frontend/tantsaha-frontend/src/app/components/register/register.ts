import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

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

  constructor(
    private el: ElementRef, 
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
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

    // Populate Time Grid
    if (timeGrid) {
      for (let i = 0; i < 49; i++) {
        const div = document.createElement('div');
        div.className = 'h-6 rounded bg-surface-container-high border border-outline-variant/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-all';
        div.addEventListener('click', () => {
          div.classList.toggle('bg-primary');
          div.classList.toggle('bg-surface-container-high');
        });
        timeGrid.appendChild(div);
      }
    }

    // Role Selection
    roleInputs.forEach((input: HTMLInputElement) => {
      input.addEventListener('change', () => {
        this.selectedRole = input.value;
        nextBtn.disabled = false;
      });
    });

    // Next Button
    nextBtn.addEventListener('click', () => {
      if (!this.selectedRole) return;

      // Update Labels
      step1Label.classList.remove('text-primary');
      step1Label.classList.add('text-on-surface-variant/50');
      step1Label.querySelector('span').classList.remove('bg-primary');
      step1Label.querySelector('span').classList.add('bg-surface-container');

      step2Label.classList.remove('text-on-surface-variant/50');
      step2Label.classList.add('text-primary');
      step2Label.querySelector('span').classList.remove('bg-surface-container');
      step2Label.querySelector('span').classList.add('bg-primary');

      stepTitle.textContent = 'Complétez vos informations';

      // Switch Visibility
      step1Content.classList.add('hidden');
      step2Content.classList.remove('hidden');

      // Show Role Specific Fields
      this.el.nativeElement.querySelector('#mpanjifa-fields').classList.add('hidden');
      this.el.nativeElement.querySelector('#tantsaha-fields').classList.add('hidden');
      this.el.nativeElement.querySelector('#mpandrindra-fields').classList.add('hidden');
      this.el.nativeElement.querySelector(`#${this.selectedRole}-fields`).classList.remove('hidden');

      // Toggle Buttons
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
      backBtn.classList.remove('hidden');
    });

    // Back Button
    backBtn.addEventListener('click', () => {
      // Update Labels
      step2Label.classList.remove('text-primary');
      step2Label.classList.add('text-on-surface-variant/50');
      step2Label.querySelector('span').classList.remove('bg-primary');
      step2Label.querySelector('span').classList.add('bg-surface-container');

      step1Label.classList.remove('text-on-surface-variant/50');
      step1Label.classList.add('text-primary');
      step1Label.querySelector('span').classList.remove('bg-surface-container');
      step1Label.querySelector('span').classList.add('bg-primary');

      stepTitle.textContent = 'Choisissez votre profil';

      // Switch Visibility
      step1Content.classList.remove('hidden');
      step2Content.classList.add('hidden');

      // Toggle Buttons
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
      backBtn.classList.add('hidden');
    });

    // Submit Action
    if (onboardingForm) {
      onboardingForm.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        
        const emailInput = onboardingForm.querySelector('input[type="email"]') as HTMLInputElement;
        const passwordInput = onboardingForm.querySelector('input[type="password"]') as HTMLInputElement;
        
        const userData = {
          email: emailInput.value,
          password: passwordInput.value,
          role: this.selectedRole
        };

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-spin mr-2">◌</span> Inscription...';
        
        this.authService.register(userData).subscribe({
          next: () => {
            alert('Compte créé avec succès ! Bienvenue.');
            this.router.navigate(['/']);
          },
          error: () => {
            submitBtn.disabled = false;
            submitBtn.textContent = "S'inscrire";
          }
        });
      });
    }
  }
}
