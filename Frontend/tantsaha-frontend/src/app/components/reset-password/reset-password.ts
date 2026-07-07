import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './reset-password.html'
})
export class ResetPassword implements OnInit, OnDestroy {
    token = '';
    password = '';
    confirmPassword = '';
    isSubmitting = false;
    successMessage = '';
    errorMessage = '';

    private redirectTimer?: ReturnType<typeof setTimeout>;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService
    ) { }

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token') || '';
        if (!this.token) {
            this.errorMessage = "Lien de réinitialisation invalide ou manquant. Veuillez refaire une demande.";
        }
    }

    onSubmit() {
        if (!this.token || !this.password) return;
        if (this.password !== this.confirmPassword) return;

        this.isSubmitting = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.apiService.confirmPasswordReset(this.token, this.password).subscribe({
            next: (res) => {
                this.successMessage = res.detail || "Votre mot de passe a été modifié avec succès.";
                this.isSubmitting = false;
                // Redirection automatique vers /login après 2.5s
                this.redirectTimer = setTimeout(() => {
                    this.router.navigate(['/login']);
                }, 2500);
            },
            error: (err) => {
                this.errorMessage = err?.error?.detail || "Une erreur est survenue lors de la réinitialisation.";
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
