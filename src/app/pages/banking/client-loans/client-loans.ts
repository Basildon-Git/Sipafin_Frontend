import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface ClientLoan {
  id: number;

  branchId: number;
  branchName: string;

  clientName: string;
  clientPhone: string;

  currency: string;

  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  totalReceivable: number;
  outstandingBalance: number;

  fundingSource: string;
  fundingBankAccountId: number | null;
  fundingBankAccountName: string | null;

  status: 'ACTIVE' | 'PAID' | 'OVERDUE' | 'CANCELLED';

  dateIssued: string;
  dueDate: string | null;

  description: string | null;

  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ClientLoansResponse {
  status: number;
  message: string;
  data: ClientLoan[];
  timestamp: string;
}

@Component({
  selector: 'app-client-loans',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './client-loans.html',
  styleUrl: './client-loans.css',
})
export class ClientLoans {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  searchTerm = signal('');
  clientLoans = signal<ClientLoan[]>([]);
  loading = signal(false);

  filteredClientLoans = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.clientLoans();
    }

    return this.clientLoans().filter(
      (loan) =>
        loan.clientName.toLowerCase().includes(search) ||
        loan.clientPhone.toLowerCase().includes(search) ||
        loan.branchName.toLowerCase().includes(search) ||
        loan.currency.toLowerCase().includes(search) ||
        loan.status.toLowerCase().includes(search) ||
        loan.fundingSource.toLowerCase().includes(search) ||
        (loan.fundingBankAccountName ?? '').toLowerCase().includes(search) ||
        (loan.description ?? '').toLowerCase().includes(search) ||
        loan.dateIssued.toLowerCase().includes(search) ||
        (loan.dueDate ?? '').toLowerCase().includes(search),
    );
  });

  totalLoans = computed(() => this.clientLoans().length);

  activeLoans = computed(
    () => this.clientLoans().filter((loan) => loan.status === 'ACTIVE').length,
  );

  overdueLoans = computed(
    () => this.clientLoans().filter((loan) => loan.status === 'OVERDUE').length,
  );

  totalOutstanding = computed(() =>
    this.clientLoans().reduce((total, loan) => total + Number(loan.outstandingBalance || 0), 0),
  );

  constructor() {
    this.loadClientLoans();
  }

  loadClientLoans(): void {
    const branchId = localStorage.getItem('branchId');

    if (!branchId) {
      this.toastr.error('Branch information was not found.', 'Error');
      return;
    }

    this.loading.set(true);

    const endpoint =
      this.masterService.getBackendService() + 'api/v1/client-loans/branch/' + branchId;

    this.http.get<ClientLoansResponse>(endpoint).subscribe({
      next: (response) => {
        this.clientLoans.set(response.data ?? []);
        this.loading.set(false);
      },

      error: (error) => {
        this.loading.set(false);

        console.error('Failed to load client loans:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load client loans.', 'Error');
      },
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  createClientLoan(): void {
    this.router.navigate(['/client-loans/new']);
  }

  createClientLoanRepayment(): void {
    this.router.navigate(['/client-loan-transactions']);
  }


  viewClientLoan(loan: ClientLoan): void {
    this.router.navigate(['/client-loans', loan.id]);
  }

  editClientLoan(loan: ClientLoan): void {
    this.router.navigate(['/client-loans', loan.id, 'edit']);
  }

  deleteClientLoan(loan: ClientLoan): void {
    const confirmed = confirm(
      `Are you sure you want to delete the client loan for "${loan.clientName}"?`,
    );

    if (!confirmed) {
      return;
    }

    // Temporary local removal until delete endpoint is provided
    this.clientLoans.update((loans) => loans.filter((item) => item.id !== loan.id));
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

  getStatusClass(status: ClientLoan['status']): string {
    return status.toLowerCase();
  }

  getFundingSourceLabel(fundingSource: string): string {
    return fundingSource
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
