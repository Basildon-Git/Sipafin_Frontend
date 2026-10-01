import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

interface Loan {
  id: number;
  investorId: number;
  investorName: string;
  branchId: number;
  branchName: string;
  currency: string;
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  interestAmount: number;
  totalPayable: number;
  status: string;
  dateReceived: string;
  dueDate: string | null;
  description: string;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface LoansResponse {
  status: number;
  message: string;
  data: Loan[];
  timestamp: string;
}

@Component({
  selector: 'app-loan-transactions',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './loan-transactions.html',
  styleUrl: './loan-transactions.css',
})
export class LoanTransactions {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  searchTerm = signal('');

  // --------------------------------------------------------------------------
  // Loans
  // --------------------------------------------------------------------------

  loans = signal<Loan[]>([]);

  // --------------------------------------------------------------------------
  // Loading
  // --------------------------------------------------------------------------

  loading = signal(false);

  // --------------------------------------------------------------------------
  // Branch
  // --------------------------------------------------------------------------

  branchId = signal<number | null>(null);

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  constructor() {
    this.loadBranchId();
  }

  // --------------------------------------------------------------------------
  // Load branch ID from localStorage
  // --------------------------------------------------------------------------

  loadBranchId(): void {
    const storedBranchId = localStorage.getItem('branchId');

    if (!storedBranchId) {
      this.toastr.warning('No branch has been assigned to your session.', 'Branch');

      return;
    }

    const parsedBranchId = Number(storedBranchId);

    if (!Number.isFinite(parsedBranchId) || parsedBranchId <= 0) {
      this.toastr.error('The branch ID stored in your session is invalid.', 'Branch');

      return;
    }

    this.branchId.set(parsedBranchId);

    this.loadLoans(parsedBranchId);
  }

  // --------------------------------------------------------------------------
  // Load loans
  // --------------------------------------------------------------------------

  loadLoans(branchId: number): void {
    this.loading.set(true);

    const endpoint = this.masterService.getBackendService() + `api/v1/loans/branch/${branchId}`;

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

  // --------------------------------------------------------------------------
  // Refresh
  // --------------------------------------------------------------------------

  refreshLoans(): void {
    const currentBranchId = this.branchId();

    if (!currentBranchId) {
      this.loadBranchId();
      return;
    }

    this.loadLoans(currentBranchId);
  }

  // --------------------------------------------------------------------------
  // Filtered loans
  // --------------------------------------------------------------------------

  filteredLoans = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.loans();
    }

    return this.loans().filter(
      (loan) =>
        loan.investorName.toLowerCase().includes(search) ||
        loan.branchName.toLowerCase().includes(search) ||
        loan.currency.toLowerCase().includes(search) ||
        loan.status.toLowerCase().includes(search) ||
        loan.description.toLowerCase().includes(search) ||
        loan.principalAmount.toString().includes(search) ||
        loan.outstandingBalance.toString().includes(search) ||
        loan.dateReceived.toLowerCase().includes(search) ||
        (loan.dueDate ?? '').toLowerCase().includes(search),
    );
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------

  totalLoans = computed(() => this.loans().length);

  totalPrincipal = computed(() =>
    this.loans().reduce((sum, loan) => sum + Number(loan.principalAmount || 0), 0),
  );

  totalOutstanding = computed(() =>
    this.loans().reduce((sum, loan) => sum + Number(loan.outstandingBalance || 0), 0),
  );

  totalActive = computed(() => this.loans().filter((loan) => loan.status === 'ACTIVE').length);

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  newTransaction(): void {
    this.router.navigate(['/loan-transactions/new']);
  }

  viewTransaction(loan: Loan): void {
    this.router.navigate(['/loan-transactions', loan.id]);
  }

  editTransaction(loan: Loan): void {
    this.router.navigate(['/loan-transactions/edit', loan.id]);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  formatStatus(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Active';

      case 'PARTIALLY_PAID':
        return 'Partially Paid';

      case 'PAID':
        return 'Paid';

      case 'CANCELLED':
        return 'Cancelled';

      default:
        return status
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'active';

      case 'PARTIALLY_PAID':
        return 'partially-paid';

      case 'PAID':
        return 'paid';

      case 'CANCELLED':
        return 'cancelled';

      default:
        return 'default';
    }
  }

  formatDate(date: string | null): string {
    if (!date) {
      return '-';
    }

    const parts = date.split('-');

    if (parts.length !== 3) {
      return date;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  getCurrencySymbol(currency: string): string {
    switch (currency) {
      case 'USD':
        return '$';

      case 'ZIG':
        return 'ZIG';

      case 'ZAR':
        return 'R';

      case 'EUR':
        return '€';

      default:
        return currency;
    }
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }
}
