import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-checkout-payment',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './checkout-payment.html',
  styleUrl: './checkout-payment.css',
})
export class CheckoutPayment implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  hasFile: boolean = false;

  constructor(
    private el: ElementRef, 
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  confirmOrder() {
    // Dans une vraie app, on enverrait les données au backend ici
    this.router.navigate(['/commande-succes']);
  }


  ngAfterViewInit() {
    const dropzone = this.el.nativeElement.querySelector('#dropzone');
    const fileInput = this.el.nativeElement.querySelector('#fileInput');
    const preview = this.el.nativeElement.querySelector('#file-preview');
    const fileNameDisplay = this.el.nativeElement.querySelector('#file-name');
    const removeBtn = this.el.nativeElement.querySelector('#remove-file');

    if (dropzone && fileInput && preview && fileNameDisplay && removeBtn) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        dropzone.classList.add('bg-primary/5', 'border-primary');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('bg-primary/5', 'border-primary');
      });

      dropzone.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        dropzone.classList.remove('bg-primary/5', 'border-primary');
        if (e.dataTransfer && e.dataTransfer.files.length) {
          this.handleFile(
            e.dataTransfer.files[0],
            fileNameDisplay,
            preview,
            dropzone
          );
        }
      });

      fileInput.addEventListener('change', (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length) {
          this.handleFile(
            input.files[0],
            fileNameDisplay,
            preview,
            dropzone
          );
        }
      });

      removeBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        fileInput.value = '';
        preview.classList.add('hidden');
        dropzone.classList.remove('hidden');
      });
    }
  }

  private handleFile(
    file: File,
    nameDisplay: HTMLElement,
    preview: HTMLElement,
    dropzone: HTMLElement
  ) {
    nameDisplay.textContent = file.name;
    preview.classList.remove('hidden');
    dropzone.classList.add('hidden');

    preview.classList.add('animate-pulse');
    setTimeout(() => preview.classList.remove('animate-pulse'), 1000);
  }
}
