import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

export interface RepayLoanRequest {
  branchId: number;
  amount: number;
  transactionDate: string;
  reference: string;
  description: string;
  actionedBy: string;
}

@Component({
  selector: 'app-new-loan-transaction',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './new-loan-transaction.html',
  styleUrl: './new-loan-transaction.css',
})
export class NewLoanTransaction {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  loanAccountId: number | null = null;
  branchId: number | null = null;

  transactionType = 'LOAN_REPAYMENT';

  amount: number | null = null;

  transactionDate = this.getToday();

  reference = '';
  description = '';

  selectedLoan: Loan | null = null;

  loanAccountSearch = '';
  loanAccountSelected = false;
  loanAccountSearchFocused = false;

  loans: Loan[] = [];

  loadingLoans = false;
  saving = false;

  filteredLoans = computed(() => {
    const search = this.loanAccountSearch.trim().toLowerCase();

    const activeLoans = this.loans.filter(
      (loan) => loan.status === 'ACTIVE' || loan.status === 'PARTIALLY_PAID',
    );

    if (!search) {
      return activeLoans;
    }

    return activeLoans.filter(
      (loan) =>
        loan.investorName.toLowerCase().includes(search) ||
        loan.branchName.toLowerCase().includes(search) ||
        loan.currency.toLowerCase().includes(search) ||
        loan.status.toLowerCase().includes(search) ||
        loan.id.toString().includes(search),
    );
  });

  constructor() {
    this.loadBranchId();
  }

  loadBranchId(): void {
    const storedBranchId = localStorage.getItem('branchId');

    if (!storedBranchId) {
      this.toastr.warning('No branch has been assigned to your session.', 'Branch');
      this.loadLoans();
      return;
    }

    const parsedBranchId = Number(storedBranchId);

    if (!Number.isFinite(parsedBranchId) || parsedBranchId <= 0) {
      this.toastr.error('The branch ID stored in your session is invalid.', 'Branch');
      this.loadLoans();
      return;
    }

    this.branchId = parsedBranchId;

    this.loadLoans();
  }

  loadLoans(): void {
    this.loadingLoans = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/loans';

    this.http.get<LoansResponse>(endpoint).subscribe({
      next: (response) => {
        this.loans = response.data ?? [];
        this.loadingLoans = false;
      },

      error: (error) => {
        this.loadingLoans = false;

        console.error('Failed to load loans:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load loans.', 'Error');
      },
    });
  }

  onLoanAccountFocus(): void {
    this.loanAccountSearchFocused = true;
  }

  onLoanAccountBlur(): void {
    setTimeout(() => {
      this.loanAccountSearchFocused = false;
    }, 150);
  }

  onLoanAccountSearchChange(): void {
    if (
      this.selectedLoan &&
      this.loanAccountSearch !== `${this.selectedLoan.investorName} - Loan #${this.selectedLoan.id}`
    ) {
      this.loanAccountSelected = false;
      this.loanAccountId = null;
      this.selectedLoan = null;
    }
  }

  selectLoan(loan: Loan): void {
    this.loanAccountId = loan.id;

    this.selectedLoan = loan;

    this.loanAccountSearch = `${loan.investorName} - Loan #${loan.id}`;

    this.loanAccountSelected = true;
    this.loanAccountSearchFocused = false;

    if (this.amount !== null && this.amount > loan.outstandingBalance) {
      this.amount = null;
    }
  }

  getTransactionDescription(): string {
    return 'Records a repayment made against the selected loan account.';
  }

  getTransactionClass(): string {
    return 'repayment';
  }

  formatTransactionType(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
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

  save(): void {
    if (!this.loanAccountId) {
      this.toastr.warning('Please select a loan account.', 'Validation');
      return;
    }

    if (!this.selectedLoan) {
      this.toastr.warning('Please select a valid loan account.', 'Validation');
      return;
    }

    if (!this.branchId) {
      this.toastr.warning('No branch has been assigned to your session.', 'Branch');
      return;
    }

    if (!this.amount || this.amount <= 0) {
      this.toastr.warning('Please enter a valid repayment amount.', 'Validation');
      return;
    }

    if (!this.transactionDate) {
      this.toastr.warning('Please select a transaction date.', 'Validation');
      return;
    }

    const actionedBy = this.getActionedBy();

    if (!actionedBy) {
      this.toastr.warning('Your name could not be found in the session.', 'User');
      return;
    }

    const request: RepayLoanRequest = {
      branchId: this.branchId,
      amount: Number(this.amount),
      transactionDate: this.transactionDate,
      reference: this.reference.trim(),
      description: this.description.trim(),
      actionedBy,
    };

    const endpoint =
      this.masterService.getBackendService() + `api/v1/loans/${this.loanAccountId}/repay`;

    this.saving = true;

    this.http.post(endpoint, request).subscribe({
      next: (response: any) => {
        this.saving = false;

        this.toastr.success(
          response?.message || 'Loan repayment recorded successfully.',
          'Success',
        );

        this.router.navigate(['/loan-transactions'], {
          queryParams: {
            loanAccountId: this.loanAccountId,
          },
        });
      },

      error: (error) => {
        this.saving = false;

        console.error('Failed to record loan repayment:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to record loan repayment.', 'Error');
      },
    });
  }

  private getActionedBy(): string {
    return (
      localStorage.getItem('fullName')?.trim() ||
      localStorage.getItem('username')?.trim() ||
      localStorage.getItem('userName')?.trim() ||
      localStorage.getItem('user')?.trim() ||
      ''
    );
  }

  cancel(): void {
    this.router.navigate(['/loan-transactions']);
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
}
