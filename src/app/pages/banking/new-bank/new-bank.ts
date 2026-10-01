import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface CreateBankRequest {
  name: string;
  code: string;
  actionedBy: string;
}

@Component({
  selector: 'app-new-bank',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-bank.html',
  styleUrl: './new-bank.css',
})
export class NewBank {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  name = '';
  code = '';

  loading = false;

  onCodeInput(): void {
    this.code = this.code.toUpperCase().replace(/\s+/g, '');
  }

  goBack(): void {
    this.router.navigate(['/banks']);
  }

  createBank(): void {
    if (!this.name.trim() || !this.code.trim()) {
      this.toastr.warning('Bank name and code are required.', 'Validation');

      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: CreateBankRequest = {
      name: this.name.trim(),
      code: this.code.trim().toUpperCase(),
      actionedBy: actionedBy,
    };

    console.log('CreateBankRequest:', request);

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/banks';

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.http.post(endpoint, request, { headers }).subscribe({
      next: (response) => {
        console.log('Bank created successfully:', response);

        this.loading = false;

        this.toastr.success('Bank created successfully.', 'Success');

        this.router.navigate(['/banks']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create bank:', error);
        console.error('Status:', error.status);
        console.error('Response:', error.error);

        const message = error?.error?.message || error?.error?.error || 'Failed to create bank.';

        this.toastr.error(message, 'Error');
      },
    });
  }
}
