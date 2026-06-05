import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-farmer-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css',
})
export class FarmerDashboard implements OnInit, AfterViewInit {
  currentUser: User | null = null;

  constructor(private el: ElementRef, private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }


  ngAfterViewInit() {
    const btn = this.el.nativeElement.querySelector('button');
    if (btn) {
      btn.addEventListener('click', () => {
        btn.innerHTML = `
            <span class="material-symbols-outlined animate-spin">refresh</span>
            <span class="font-label-md text-label-md">Préparation du PDF...</span>
        `;
        setTimeout(() => {
          btn.innerHTML = `
                <span class="material-symbols-outlined">check_circle</span>
                <span class="font-label-md text-label-md">Document Prêt</span>
            `;
        }, 1500);
      });
    }
  }
}
