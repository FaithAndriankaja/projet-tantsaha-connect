import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './verify-email.html'
})
export class VerifyEmail implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('codeInput') codeInput?: ElementRef<HTMLInputElement>;

    isSubmitting = false;
    isResendingCode = false;
    email = '';
    phone = '';
    code = '';
    codePrefilled = false;
    successMessage = '';
    errorMessage = '';
    resendMessage = '';
    resendCountdown = 0;
    private resendTimer?: ReturnType<typeof setInterval>;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.email = this.route.snapshot.queryParamMap.get('email') || '';
        this.phone = this.route.snapshot.queryParamMap.get('phone') || '';
        const codeFromUrl = this.route.snapshot.queryParamMap.get('code')
            || this.route.snapshot.queryParamMap.get('token')
            || '';
        if (codeFromUrl) {
            this.code = codeFromUrl;
            this.codePrefilled = true;
        }

        const resendIn = Number(this.route.snapshot.queryParamMap.get('resendIn') || 0);
        if (this.route.snapshot.queryParamMap.get('sent') || resendIn > 0) {
            this.startResendCooldown(resendIn || 10);
        }
    }

    ngAfterViewInit(): void {
        if (this.codePrefilled) {
            setTimeout(() => this.focusCodeInput(), 100);
        }
    }

    ngOnDestroy(): void {
        this.clearResendTimer();
    }

    verifyCode(): void {
        if (!this.code.trim()) {
            this.errorMessage = 'Veuillez saisir le code reçu par email.';
            return;
        }

        this.isSubmitting = true;
        this.successMessage = '';
        this.errorMessage = '';
        this.resendMessage = '';

        this.authService.verifyEmail({
            code: this.code.trim(),
            email: this.email.trim() || undefined
        }).pipe(
            finalize(() => {
                this.isSubmitting = false;
            })
        ).subscribe({
            next: (res) => {
                this.successMessage = res.detail || 'Votre email a été vérifié avec succès.';
                this.router.navigate([this.authService.getDefaultRouteAfterAuth()]);
            },
            error: (err) => {
                this.errorMessage = err?.error?.detail || 'Une erreur est survenue lors de la vérification.';
            }
        });
    }

    resendCode(): void {
        if (!this.email.trim()) {
            this.errorMessage = 'Veuillez renseigner votre adresse email pour recevoir un nouveau code.';
            return;
        }

        this.isResendingCode = true;
        this.errorMessage = '';
        this.resendMessage = '';

        this.authService.resendVerificationCode(this.email.trim()).pipe(
            finalize(() => {
                this.isResendingCode = false;
            })
        ).subscribe({
            next: (res) => {
                this.resendMessage = res.detail || 'Un nouveau code de vérification a été envoyé.';
                this.code = '';
                this.codePrefilled = false;
                this.startResendCooldown(res.resend_available_in || 10);
                setTimeout(() => this.focusCodeInput(), 100);
            },
            error: (err) => {
                this.errorMessage = err?.error?.detail || "Impossible de renvoyer le code pour le moment.";
                const retryAfter = Number(err?.error?.retry_after || 0);
                if (retryAfter > 0) {
                    this.startResendCooldown(retryAfter);
                }
            }
        });
    }

    goToLogin(): void {
        const queryParams: Record<string, string> = { verified: '1' };
        if (this.phone.trim()) {
            queryParams['phone'] = this.phone.trim();
        }
        this.router.navigate(['/login'], { queryParams });
    }

    private focusCodeInput(): void {
        this.codeInput?.nativeElement?.focus();
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
