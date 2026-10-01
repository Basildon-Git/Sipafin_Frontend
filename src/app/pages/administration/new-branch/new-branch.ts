import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface CreateBranchRequest {
  name: string;
  code: string;
  location: string;
  actionedBy: string;
}

@Component({
  selector: 'app-new-branch',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-branch.html',
  styleUrl: './new-branch.css',
})
export class NewBranch {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  name = '';
  code = '';
  location = '';

  loading = false;

  onCodeInput(): void {
    this.code = this.code.toUpperCase().replace(/\s+/g, '');
  }

  goBack(): void {
    this.router.navigate(['/branches']);
  }

  createBranch(): void {
    if (!this.name.trim() || !this.code.trim()) {
      this.toastr.warning('Branch name and code are required.', 'Validation');
      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: CreateBranchRequest = {
      name: this.name.trim(),
      code: this.code.trim().toUpperCase(),
      location: this.location.trim(),
      actionedBy: actionedBy,
    };

    console.log('CreateBranchRequest:', request);

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/branches';

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.http.post(endpoint, request, { headers }).subscribe({
      next: () => {
        this.loading = false;

        this.toastr.success('Branch created successfully.', 'Success');

        this.router.navigate(['/branches']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Error creating branch:', error);
        console.error('Status:', error.status);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to create branch.', 'Error');
      },
    });
  }
}
