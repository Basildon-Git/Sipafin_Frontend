import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface CreateInvestorRequest {
  fullName: string;
  phoneNumber: string;
  nationalId: string;
  address: string;
  actionedBy: string;
}

@Component({
  selector: 'app-new-investor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-investor.html',
  styleUrl: './new-investor.css',
})
export class NewInvestor {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  fullName = '';
  phoneNumber = '';
  nationalId = '';
  address = '';

  loading = false;

  goBack(): void {
    this.router.navigate(['/investors']);
  }

  createInvestor(): void {
    // Required field validation
    if (!this.fullName.trim() || !this.phoneNumber.trim()) {
      this.toastr.warning('Full name and phone number are required.', 'Validation');
      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: CreateInvestorRequest = {
      fullName: this.fullName.trim(),
      phoneNumber: this.phoneNumber.trim(),
      nationalId: this.nationalId.trim(),
      address: this.address.trim(),
      actionedBy: actionedBy,
    };

    console.log('CreateInvestorRequest:', request);

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/investors';

    this.http.post(endpoint, request).subscribe({
      next: (response: any) => {
        console.log('Investor created successfully:', response);

        this.loading = false;

        this.toastr.success('Investor created successfully.', 'Success');

        this.router.navigate(['/investors']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create investor:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to create investor.', 'Error');
      },
    });
  }
}
