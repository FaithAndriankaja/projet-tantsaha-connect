import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, AfterViewInit {
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
    const togglePassword = this.el.nativeElement.querySelector('#togglePassword');
    const passwordInput = this.el.nativeElement.querySelector('#password');
    const passwordIcon = this.el.nativeElement.querySelector('#passwordIcon');
    const loginForm = this.el.nativeElement.querySelector('#loginForm');
    const inputs = this.el.nativeElement.querySelectorAll('input');

    // Focus effects for labels
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

    if (loginForm) {
      loginForm.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        const email = (loginForm.querySelector('#email') as HTMLInputElement).value;
        const password = (loginForm.querySelector('#password') as HTMLInputElement).value;
        
        const button = loginForm.querySelector('button[type="submit"]');
        if (button) {
          button.disabled = true;
          button.innerHTML = '<span class="animate-spin mr-2">◌</span> Connexion...';
          
          this.authService.login(email, password).subscribe({
            next: () => {
              this.router.navigate(['/']);
            },
            error: () => {
              button.disabled = false;
              button.textContent = 'Se connecter';
              alert('Erreur de connexion');
            }
          });
        }
      });
    }
  }
}
