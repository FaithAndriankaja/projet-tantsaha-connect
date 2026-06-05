import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-farmer-profile',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './farmer-profile.html',
  styleUrl: './farmer-profile.css',
})
export class FarmerProfile implements OnInit, AfterViewInit {
  currentUser: User | null = null;

  constructor(private el: ElementRef, private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }


  ngAfterViewInit() {
    // Micro-interactions for buttons
    const buttons = this.el.nativeElement.querySelectorAll('button');
    buttons.forEach((button: HTMLButtonElement) => {
      button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.97)';
      });
      button.addEventListener('mouseup', () => {
        button.style.transform = 'scale(1)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
      });
    });
  }
}
