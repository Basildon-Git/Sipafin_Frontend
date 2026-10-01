import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface Loan {
  id: number;

  investorId: number;
  investorName: string;

  branchId: number;
  branchName: string;

  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  interestAmount: number;
  totalPayable: number;

  status: 'ACTIVE' | 'PAID' | 'OVERDUE' | 'CANCELLED';

  dateReceived: string;
  dueDate: string | null;

  description: string | null;

  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LoansResponse {
  status: number;
  message: string;
  data: Loan[];
  timestamp: string;
}

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './loans.html',
  styleUrl: './loans.css',
})
export class Loans {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  searchTerm = signal('');
  loans = signal<Loan[]>([]);
  loading = signal(false);
  filteredLoans = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.loans();
    }

    return this.loans().filter(
      (loan) =>
        loan.investorName.toLowerCase().includes(search) ||
        loan.branchName.toLowerCase().includes(search) ||
        loan.status.toLowerCase().includes(search) ||
        (loan.description ?? '').toLowerCase().includes(search) ||
        loan.dateReceived.toLowerCase().includes(search) ||
        (loan.dueDate ?? '').toLowerCase().includes(search),
    );
  });

  totalLoans = computed(() => this.loans().length);

  activeLoans = computed(() => this.loans().filter((loan) => loan.status === 'ACTIVE').length);

  overdueLoans = computed(() => this.loans().filter((loan) => loan.status === 'OVERDUE').length);

  totalOutstanding = computed(() =>
    this.loans().reduce((total, loan) => total + Number(loan.outstandingBalance || 0), 0),
  );

  constructor() {
    this.loadLoans();
  }

  loadLoans(): void {
    this.loading.set(true);

    const endpoint = this.masterService.getBackendService() + 'api/v1/loans';

    this.http.get<LoansResponse>(endpoint).subscribe({
      next: (response) => {
        this.loans.set(response.data ?? []);
        this.loading.set(false);
      },

      error: (error) => {
        this.loading.set(false);

        console.error('Failed to load loans:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load loans.', 'Error');
      },
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  createLoan(): void {
    this.router.navigate(['/loans/new']);
  }

  viewLoan(loan: Loan): void {
    this.router.navigate(['/loans', loan.id]);
  }

  editLoan(loan: Loan): void {
    this.router.navigate(['/loans', loan.id, 'edit']);
  }

  deleteLoan(loan: Loan): void {
    const confirmed = confirm(
      `Are you sure you want to delete the loan for "${loan.investorName}"?`,
    );

    if (!confirmed) {
      return;
    }

    // Temporary local removal until delete endpoint is provided
    this.loans.update((loans) => loans.filter((item) => item.id !== loan.id));
  }

  getInitials(fullName: string): string {
    return fullName
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join('');
  }

  getStatusClass(status: Loan['status']): string {
    return status.toLowerCase();
  }
}
