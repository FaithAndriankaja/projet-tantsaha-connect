import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-emargement',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './emargement.html',
  styleUrl: './emargement.css',
})
export class Emargement implements OnInit, AfterViewInit {
  currentUser: User | null = null;

  constructor(private el: ElementRef, private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }


  ngAfterViewInit() {
    const buttons = this.el.nativeElement.querySelectorAll('.status-toggle');
    buttons.forEach((btn: HTMLElement) => {
      btn.addEventListener('click', () => this.toggleStatus(btn));
    });
  }

  private toggleStatus(btn: HTMLElement) {
    const isDelivered = btn.classList.contains('is-delivered');
    const textSpan = btn.querySelector('.status-text');
    const iconSpan = btn.querySelector('.material-symbols-outlined');

    if (isDelivered) {
      // Change to Inactive
      btn.classList.remove('is-delivered');
      btn.classList.remove('bg-primary-container', 'text-on-primary-container');
      btn.classList.add('bg-surface-container-high', 'text-on-surface-variant');
      if (textSpan) textSpan.textContent = 'À livrer';
      if (iconSpan) iconSpan.classList.add('hidden');
    } else {
      // Change to Active
      btn.classList.add('is-delivered');
      btn.classList.remove(
        'bg-surface-container-high',
        'text-on-surface-variant'
      );
      btn.classList.add('bg-primary-container', 'text-on-primary-container');
      if (textSpan) textSpan.textContent = 'Livré';

      // Ensure icon is visible
      if (!iconSpan) {
        const newIcon = document.createElement('span');
        newIcon.className = 'material-symbols-outlined text-[20px]';
        newIcon.textContent = 'check_circle';
        btn.insertBefore(newIcon, textSpan);
      } else {
        iconSpan.classList.remove('hidden');
      }
    }
  }
}
