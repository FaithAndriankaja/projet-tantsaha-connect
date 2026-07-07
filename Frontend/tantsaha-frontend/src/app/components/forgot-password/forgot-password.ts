import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './forgot-password.html'
})
export class ForgotPassword implements OnDestroy {
    email = '';
    isSubmitting = false;
    successMessage = '';
    errorMessage = '';
    private redirectTimer?: ReturnType<typeof setTimeout>;

    constructor(private apiService: ApiService, private router: Router) { }

    onSubmit() {
        const email = this.email.trim();
        if (!email) return;
        this.isSubmitting = true;
        this.successMessage = '';
        this.errorMessage = '';

        this.apiService.requestPasswordReset(email).subscribe({
            next: (res) => {
                this.successMessage = res.detail || "Si cet email est valide, un lien de réinitialisation a été envoyé.";
                this.isSubmitting = false;

                this.redirectTimer = setTimeout(() => {
                    this.router.navigate(['/login']);
                }, 2500);
            },
            error: (err) => {
                this.errorMessage = err?.error?.detail || "Une erreur est survenue.";
                this.isSubmitting = false;
            }
        });
    }

    ngOnDestroy(): void {
        if (this.redirectTimer) {
            clearTimeout(this.redirectTimer);
        }
    }
}
