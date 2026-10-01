import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

interface Branch {
  id: number;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BranchResponse {
  status: number;
  message: string;
  data: Branch[];
  timestamp: string;
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
  createdAt?: string;
  updatedAt?: string;
}

interface BankingAccountsResponse {
  status: number;
  message: string;
  data: BankingAccount[];
  timestamp: string;
}

export interface BankReconciliationRequest {
  bankAccountId: number;
  branchId: number;
  currency: string;
  reconciliationDate: string;
  statementBalance: number;
  applyAdjustment: boolean;
  reference: string;
  reason: string;
  actionedBy: string;
}

export interface BankReconciliation {
  id: number;
  bankAccountId: number;
  bankName: string;
  accountName: string;
  branchId: number;
  branchName: string;
  currency: string;
  reconciliationDate: string;
  systemBalanceBefore: number;
  statementBalance: number;
  difference: number;
  adjustmentApplied: boolean;
  systemBalanceAfter: number;
  transactionGroupId: string;
  status: string;
  reference: string;
  reason: string;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReconciliationResponse {
  status: number;
  message: string;
  data: BankReconciliation[] | BankReconciliation | string;
  timestamp: string;
}

@Component({
  selector: 'app-reconciliations',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  templateUrl: './reconciliations.html',
  styleUrl: './reconciliations.css',
})
export class Reconciliations {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  // ================================
  // FORM
  // ================================

  bankAccountId: number | null = null;
  branchId: number | null = null;

  currency = 'USD';
  reconciliationDate = this.getToday();

  statementBalance = 0;
  applyAdjustment = true;
  reference = '';
  reason = '';

  loading = false;

  // ================================
  // BANK ACCOUNT SEARCH
  // ================================

  bankAccountSearch = '';
  bankAccountSelected = false;
  bankAccountSearchStarted = false;

  bankAccounts = signal<BankingAccount[]>([]);
  loadingBankAccounts = false;

  // ================================
  // BRANCH
  // ================================

  branchSearch = '';
  branchSelected = false;

  branches = signal<Branch[]>([]);
  loadingBranches = false;

  // ================================
  // RECONCILIATIONS
  // ================================

  reconciliations = signal<BankReconciliation[]>([]);
  loadingReconciliations = false;

  // ================================
  // FILTERED BANK ACCOUNTS
  // ================================

  filteredBankAccounts = computed(() => {
    const search = this.bankAccountSearch.trim().toLowerCase();

    if (!search || !this.bankAccountSearchStarted) {
      return [];
    }

    return this.bankAccounts().filter(
      (account) =>
        account.active &&
        (account.accountName.toLowerCase().includes(search) ||
          account.accountNumber.toLowerCase().includes(search) ||
          account.bankName.toLowerCase().includes(search) ||
          account.bankCode.toLowerCase().includes(search) ||
          account.currency.toLowerCase().includes(search)),
    );
  });

  // ================================
  // CONSTRUCTOR
  // ================================

  constructor() {
    this.loadBranches();
    this.loadBankAccounts();
    this.loadLocalBranch();
  }

  // ================================
  // TODAY
  // ================================

  private getToday(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ================================
  // LOAD BRANCHES
  // ================================

  loadBranches(): void {
    this.loadingBranches = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/branches';

    this.http.get<BranchResponse>(endpoint).subscribe({
      next: (response) => {
        this.branches.set(response.data ?? []);
        this.loadingBranches = false;

        this.loadLocalBranch();
      },

      error: (error) => {
        this.loadingBranches = false;

        console.error('Failed to load branches:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load branches.', 'Error');
      },
    });
  }

  // ================================
  // LOAD LOCAL BRANCH
  // ================================

  loadLocalBranch(): void {
    const storedBranchId = localStorage.getItem('branchId');

    if (!storedBranchId) {
      return;
    }

    const parsedBranchId = Number(storedBranchId);

    if (!parsedBranchId || Number.isNaN(parsedBranchId)) {
      return;
    }

    this.branchId = parsedBranchId;

    const branch = this.branches().find((item) => item.id === parsedBranchId);

    if (branch) {
      this.branchSearch = `${branch.name} (${branch.code})`;
      this.branchSelected = true;
    }
  }

  // ================================
  // LOAD BANK ACCOUNTS
  // ================================

  loadBankAccounts(): void {
    this.loadingBankAccounts = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/bank-accounts';

    this.http.get<BankingAccountsResponse>(endpoint).subscribe({
      next: (response) => {
        this.bankAccounts.set(response.data ?? []);
        this.loadingBankAccounts = false;
      },

      error: (error) => {
        this.loadingBankAccounts = false;

        console.error('Failed to load bank accounts:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load bank accounts.', 'Error');
      },
    });
  }

  // ================================
  // BANK ACCOUNT SEARCH
  // ================================

  onBankAccountSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.bankAccountSearch = input.value;

    this.bankAccountSearchStarted = this.bankAccountSearch.trim().length > 0;

    this.bankAccountId = null;
    this.bankAccountSelected = false;

    this.reconciliations.set([]);
  }

  onBankAccountFocus(): void {
    if (!this.bankAccountSearch.trim()) {
      this.bankAccountSearchStarted = false;
    }
  }

  // ================================
  // SELECT BANK ACCOUNT
  // ================================

  selectBankAccount(account: BankingAccount): void {
    this.bankAccountId = account.id;

    this.bankAccountSearch = `${account.bankName} - ${account.accountName} (${account.accountNumber})`;

    this.bankAccountSelected = true;
    this.bankAccountSearchStarted = false;

    this.currency = account.currency;

    this.loadReconciliations(account.id);
  }

  // ================================
  // CLEAR BANK ACCOUNT
  // ================================

  clearBankAccount(): void {
    this.bankAccountId = null;
    this.bankAccountSearch = '';
    this.bankAccountSelected = false;
    this.bankAccountSearchStarted = false;

    this.currency = 'USD';

    this.reconciliations.set([]);
  }

  // ================================
  // LOAD RECONCILIATIONS
  // ================================

  loadReconciliations(bankAccountId: number): void {
    this.loadingReconciliations = true;

    const endpoint =
      this.masterService.getBackendService() +
      `api/v1/bank-reconciliations/bank-account/${bankAccountId}`;

    this.http.get<ReconciliationResponse>(endpoint).subscribe({
      next: (response) => {
        this.reconciliations.set(this.extractReconciliations(response?.data));

        this.loadingReconciliations = false;
      },

      error: (error) => {
        this.loadingReconciliations = false;

        console.error('Failed to load reconciliations:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.reconciliations.set([]);

        this.toastr.error(error?.error?.message || 'Failed to load reconciliations.', 'Error');
      },
    });
  }

  // ================================
  // EXTRACT RECONCILIATIONS
  // ================================

  private extractReconciliations(
    data: BankReconciliation[] | BankReconciliation | string | undefined,
  ): BankReconciliation[] {
    if (!data) {
      return [];
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === 'object') {
      return [data];
    }

    try {
      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed && typeof parsed === 'object') {
        return [parsed];
      }
    } catch {
      console.warn('Could not parse reconciliation response data:', data);
    }

    return [];
  }

  // ================================
  // CREATE RECONCILIATION
  // ================================

  createReconciliation(): void {
    if (!this.bankAccountId) {
      this.toastr.warning('Please select a bank account.', 'Validation');

      return;
    }

    if (!this.branchId) {
      this.toastr.warning(
        'No branch is selected. Please ensure your branch is available.',
        'Validation',
      );

      return;
    }

    if (!this.reconciliationDate) {
      this.toastr.warning('Reconciliation date is required.', 'Validation');

      return;
    }

    if (Number(this.statementBalance) < 0) {
      this.toastr.warning('Statement balance cannot be negative.', 'Validation');

      return;
    }

    const actionedBy = localStorage.getItem('fullName') || '';

    const request: BankReconciliationRequest = {
      bankAccountId: this.bankAccountId,
      branchId: this.branchId,
      currency: this.currency,
      reconciliationDate: this.reconciliationDate,
      statementBalance: Number(this.statementBalance) || 0,
      applyAdjustment: this.applyAdjustment,
      reference: this.reference.trim(),
      reason: this.reason.trim(),
      actionedBy,
    };

    console.log('BankReconciliationRequest:', request);

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/bank-reconciliations';

    this.http.post(endpoint, request).subscribe({
      next: (response) => {
        console.log('Bank reconciliation created successfully:', response);

        this.loading = false;

        this.toastr.success('Bank reconciliation completed successfully.', 'Success');

        this.resetForm();

        if (this.bankAccountId) {
          this.loadReconciliations(this.bankAccountId);
        }
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create bank reconciliation:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || error?.error?.error || 'Failed to create bank reconciliation.',
          'Error',
        );
      },
    });
  }

  // ================================
  // RESET FORM
  // ================================

  resetForm(): void {
    this.reconciliationDate = this.getToday();
    this.statementBalance = 0;
    this.applyAdjustment = true;
    this.reference = '';
    this.reason = '';
  }

  // ================================
  // FORMAT ACCOUNT NUMBER
  // ================================

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '';
    }

    if (accountNumber.length <= 4) {
      return accountNumber;
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }

  // ================================
  // DIFFERENCE CLASS
  // ================================

  getDifferenceClass(difference: number): string {
    if (Number(difference) === 0) {
      return 'zero';
    }

    if (Number(difference) > 0) {
      return 'positive';
    }

    return 'negative';
  }

  // ================================
  // STATUS CLASS
  // ================================

  getStatusClass(status: string): string {
    return (status || '').toLowerCase();
  }
}
