import { Component, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

interface ClientLoan {
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
  status: string;
  dateIssued: string;
  dueDate: string | null;
  description: string;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientLoanTransaction {
  id: number;
  clientLoanAccountId: number;
  branchId: number;
  branchName: string;
  currency: string;
  transactionType: string;
  amount: number;
  transactionDate: string;
  transactionGroupId: string;
  reference: string;
  description: string;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface BankingAccount {
  id: number;
  bankId: number;
  bankName: string;
  bankCode: string;
  branchId: number;
  branchName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  active: boolean;
  actionedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientLoanRepaymentRequest {
  paymentDestination: string;
  bankAccountId: number | null;
  amount: number;
  transactionDate: string;
  reference: string;
  description: string;
  actionedBy: string;
}

@Component({
  selector: 'app-client-loan-transactions',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  templateUrl: './client-loan-transactions.html',
  styleUrl: './client-loan-transactions.css',
})
export class ClientLoanTransactions {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private masterService = inject(Master);

  Math = Math;

  // ============================================================
  // CLIENT LOANS
  // ============================================================

  clientLoans = signal<ClientLoan[]>([]);

  loadingLoans = false;

  searchTerm = '';

  currentPage = 1;
  pageSize = 10;

  pageSizes = [10, 25, 50];

  filteredLoans = computed(() => {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.clientLoans();
    }

    return this.clientLoans().filter(
      (loan) =>
        loan.clientName?.toLowerCase().includes(search) ||
        loan.clientPhone?.toLowerCase().includes(search) ||
        loan.branchName?.toLowerCase().includes(search) ||
        loan.currency?.toLowerCase().includes(search) ||
        loan.status?.toLowerCase().includes(search) ||
        loan.fundingSource?.toLowerCase().includes(search) ||
        loan.fundingBankAccountName?.toLowerCase().includes(search),
    );
  });

  paginatedLoans = computed(() => {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.filteredLoans().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredLoans().length / this.pageSize));

  // ============================================================
  // SELECTED CLIENT LOAN
  // ============================================================

  selectedLoan: ClientLoan | null = null;

  transactions = signal<ClientLoanTransaction[]>([]);

  loadingTransactions = false;

  // ============================================================
  // REPAYMENT
  // ============================================================

  showRepaymentForm = false;
  repaymentLoading = false;
  paymentDestination = 'BRANCH_FLOAT';
  repaymentAmount = 0;
  transactionDate = this.getToday();
  repaymentReference = '';
  repaymentDescription = '';

  // ============================================================
  // BANK ACCOUNT PICKER
  // ============================================================

  fundingBankAccountId: number | null = null;
  bankAccountSearch = '';
  bankAccountSelected = false;
  bankAccountSearchStarted = false;
  bankAccounts = signal<BankingAccount[]>([]);
  loadingBankAccounts = false;

  filteredBankAccounts = computed(() => {
    const search = this.bankAccountSearch.trim().toLowerCase();

    if (!search || !this.bankAccountSearchStarted) {
      return [];
    }

    return this.bankAccounts().filter(
      (account) =>
        account.active &&
        (account.accountName?.toLowerCase().includes(search) ||
          account.accountNumber?.toLowerCase().includes(search) ||
          account.bankName?.toLowerCase().includes(search) ||
          account.bankCode?.toLowerCase().includes(search) ||
          account.currency?.toLowerCase().includes(search)),
    );
  });

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor() {
    this.loadClientLoans();
  }

  // ============================================================
  // LOAD CLIENT LOANS
  // ============================================================

  loadClientLoans(): void {
    this.loadingLoans = true;

    const url = this.masterService.getBackendService() + 'api/v1/client-loans';

    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.clientLoans.set(response?.data ?? []);

        this.currentPage = 1;

        this.loadingLoans = false;
      },

      error: (error) => {
        console.error('Error loading client loans:', error);
        this.loadingLoans = false;
        this.toastr.error(error?.error?.message || 'Failed to load client loans');
      },
    });
  }

  // ============================================================
  // SEARCH
  // ============================================================

  onSearch(): void {
    this.currentPage = 1;
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  getPageNumbers(): number[] {
    const total = this.totalPages();

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const pages: number[] = [];

    if (this.currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, 0, total);
    } else if (this.currentPage >= total - 3) {
      pages.push(1, 0, total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, 0, this.currentPage - 1, this.currentPage, this.currentPage + 1, 0, total);
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage = page;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // ============================================================
  // SELECT CLIENT LOAN
  // ============================================================

  selectLoan(loan: ClientLoan): void {
    this.selectedLoan = loan;
    this.transactions.set([]);
    this.showRepaymentForm = false;
    this.resetRepaymentForm();
    this.loadTransactions(loan.id);
  }

  // ============================================================
  // LOAD TRANSACTIONS
  // ============================================================

  loadTransactions(clientLoanAccountId: number): void {
    this.loadingTransactions = true;

    const url =
      this.masterService.getBackendService() +
      `api/v1/client-loans/${clientLoanAccountId}/transactions`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.transactions.set(response?.data ?? []);
        this.loadingTransactions = false;
      },

      error: (error) => {
        console.error('Error loading client loan transactions:', error);

        this.loadingTransactions = false;

        this.toastr.error(error?.error?.message || 'Failed to load client loan transactions');
      },
    });
  }

  // ============================================================
  // REPAYMENT FORM
  // ============================================================

  openRepaymentForm(): void {
    if (!this.selectedLoan) {
      return;
    }

    this.resetRepaymentForm();

    this.showRepaymentForm = true;
  }

  closeRepaymentForm(): void {
    this.showRepaymentForm = false;

    this.resetRepaymentForm();
  }

  resetRepaymentForm(): void {
    this.paymentDestination = 'BRANCH_FLOAT';
    this.repaymentAmount = 0;
    this.transactionDate = this.getToday();
    this.repaymentReference = '';
    this.repaymentDescription = '';

    this.clearBankAccount();
  }

  // ============================================================
  // PAYMENT DESTINATION
  // ============================================================

  onPaymentDestinationChange(): void {
    if (this.paymentDestination === 'BRANCH_FLOAT') {
      this.clearBankAccount();

      return;
    }

    if (this.paymentDestination === 'BANK_ACCOUNT') {
      this.loadBankAccountsByCurrency();
    }
  }

  // ============================================================
  // LOAD BANK ACCOUNTS BY CURRENCY
  // ============================================================

  loadBankAccountsByCurrency(): void {
    if (!this.selectedLoan) {
      return;
    }

    this.loadingBankAccounts = true;
    this.bankAccounts.set([]);
    this.fundingBankAccountId = null;
    this.bankAccountSearch = '';
    this.bankAccountSelected = false;
    this.bankAccountSearchStarted = false;
    const currency = this.selectedLoan.currency;

    const url =
      this.masterService.getBackendService() + `api/v1/bank-accounts/currency/${currency}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.bankAccounts.set(response?.data ?? []);

        this.loadingBankAccounts = false;
      },

      error: (error) => {
        console.error('Error loading bank accounts:', error);

        this.loadingBankAccounts = false;

        this.toastr.error(error?.error?.message || `Failed to load ${currency} bank accounts`);
      },
    });
  }

  // ============================================================
  // BANK ACCOUNT SEARCH
  // ============================================================

  onBankAccountSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.bankAccountSearch = input.value;
    this.bankAccountSearchStarted = this.bankAccountSearch.trim().length > 0;
    this.fundingBankAccountId = null;
    this.bankAccountSelected = false;
  }

  onBankAccountFocus(): void {
    if (!this.bankAccountSearch.trim()) {
      this.bankAccountSearchStarted = false;
    }
  }

  selectBankAccount(account: BankingAccount): void {
    this.fundingBankAccountId = account.id;
    this.bankAccountSearch = `${account.bankName} - ${account.accountName} (${account.accountNumber})`;
    this.bankAccountSelected = true;
    this.bankAccountSearchStarted = false;
  }

  clearBankAccount(): void {
    this.fundingBankAccountId = null;
    this.bankAccountSearch = '';
    this.bankAccountSelected = false;
    this.bankAccountSearchStarted = false;
  }

  // ============================================================
  // REPAY CLIENT LOAN
  // ============================================================

  repayClientLoan(): void {
    if (!this.selectedLoan) {
      this.toastr.warning('Please select a client loan');
      return;
    }

    if (!this.repaymentAmount || this.repaymentAmount <= 0) {
      this.toastr.warning('Please enter a valid repayment amount');
      return;
    }

    if (this.repaymentAmount > this.selectedLoan.outstandingBalance) {
      this.toastr.warning('Repayment amount cannot exceed the outstanding balance');
      return;
    }

    if (this.paymentDestination === 'BANK_ACCOUNT' && !this.fundingBankAccountId) {
      this.toastr.warning('Please select a bank account');

      return;
    }

    const username = localStorage.getItem('username') || '';

    const request: ClientLoanRepaymentRequest = {
      paymentDestination: this.paymentDestination,
      bankAccountId: this.paymentDestination === 'BANK_ACCOUNT' ? this.fundingBankAccountId : null,
      amount: this.repaymentAmount,
      transactionDate: this.transactionDate,
      reference: this.repaymentReference,
      description: this.repaymentDescription,
      actionedBy: username,
    };

    this.repaymentLoading = true;

    const url =
      this.masterService.getBackendService() + `api/v1/client-loans/${this.selectedLoan.id}/repay`;

    this.http.post<any>(url, request).subscribe({
      next: (response) => {
        this.repaymentLoading = false;
        this.toastr.success(response?.message || 'Client loan repayment recorded successfully');
        this.showRepaymentForm = false;
        this.resetRepaymentForm();
        this.loadClientLoans();
        this.loadTransactions(this.selectedLoan!.id);
      },

      error: (error) => {
        this.repaymentLoading = false;
        console.error('Error repaying client loan:', error);
        this.toastr.error(error?.error?.message || 'Failed to record client loan repayment');
      },
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '';
    }

    if (accountNumber.length <= 4) {
      return accountNumber;
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }

  getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTransactionType(type: string): string {
    if (!type) {
      return '';
    }

    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getTransactionIcon(type: string): string {
    if (type === 'LOAN_ISSUED') {
      return 'bi-cash-stack';
    }

    if (type === 'LOAN_REPAYMENT' || type === 'REPAYMENT') {
      return 'bi-arrow-down-left';
    }

    if (type === 'ADJUSTMENT') {
      return 'bi-sliders';
    }

    if (type === 'REVERSAL') {
      return 'bi-arrow-counterclockwise';
    }

    return 'bi-arrow-left-right';
  }

  getTransactionClass(type: string): string {
    if (type === 'LOAN_REPAYMENT' || type === 'REPAYMENT') {
      return 'repayment';
    }

    if (type === 'LOAN_ISSUED') {
      return 'issued';
    }

    return 'neutral';
  }

  getLoanStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'active';

      case 'PAID':
        return 'paid';

      case 'OVERDUE':
        return 'overdue';

      case 'CLOSED':
        return 'closed';

      default:
        return 'default';
    }
  }

  goBack(): void {
    this.router.navigate(['/client-loans']);
  }
}
