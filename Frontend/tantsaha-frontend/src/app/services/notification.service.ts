import { Injectable, signal } from '@angular/core';

export interface ToastNotification {
    message: string;
    type: 'error' | 'success' | 'info';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    public currentNotification = signal<ToastNotification | null>(null);
    private timeoutId: any;

    show(notification: ToastNotification): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.currentNotification.set(notification);

        if (notification.duration !== 0) {
            this.timeoutId = setTimeout(() => {
                this.clear();
            }, notification.duration || 4000);
        }
    }

    showError(message: string): void {
        this.show({ message, type: 'error' });
    }

    showSuccess(message: string): void {
        this.show({ message, type: 'success' });
    }

    clear(): void {
        this.currentNotification.set(null);
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}
