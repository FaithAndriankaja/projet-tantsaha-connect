import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-marketplace-mobile',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './marketplace-mobile.html',
  styleUrl: './marketplace-mobile.css',
})
export class MarketplaceMobile implements OnInit, AfterViewInit {
  currentUser: User | null = null;

  constructor(private el: ElementRef, private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }


  ngAfterViewInit() {
    // Micro-interactions for quantity steppers
    const buttons = this.el.nativeElement.querySelectorAll('button');
    buttons.forEach((btn: HTMLButtonElement) => {
      btn.addEventListener('click', () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (
          icon &&
          (icon.textContent === 'add' || icon.textContent === 'remove')
        ) {
          const span = btn.parentElement?.querySelector('span.font-bold');
          if (span) {
            let val = parseInt(span.textContent || '0');
            if (icon.textContent === 'add') val++;
            else if (icon.textContent === 'remove' && val > 0) val--;
            span.textContent = val.toString();
          }
        }
      });
    });
  }
}
