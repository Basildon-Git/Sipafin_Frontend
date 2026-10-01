import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

interface Bank {
  id: number;
  name: string;
  code: string;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BankResponse {
  status: number;
  message: string;
  data: Bank[];
  timestamp: string;
}

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

export interface CreateBankAccountRequest {
  bankId: number;
  accountName: string;
  accountNumber: string;
  currency: string;
  openingBalance: number;
  actionedBy: string;
}

export interface CreateCommissionAccountRequest {
  bankAccountId: number;
  commissionRate: number;
  actionedBy: string;
}

@Component({
  selector: 'app-new-bank-account',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-bank-account.html',
  styleUrl: './new-bank-account.css',
})
export class NewBankAccount {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  // ================================
  // FORM
  // ================================

  accountName = '';
  accountNumber = '';
  currency = 'USD';
  currentBalance = 0;

  // Commission rate
  commissionRate = 0;

  active = true;

  // ================================
  // BANK
  // ================================

  bankId: number | null = null;
  bankSearch = '';
  bankSelected = false;
  bankSearchStarted = false;

  banks = signal<Bank[]>([]);
  loadingBanks = false;

  // ================================
  // BRANCH
  // ================================

  branchId: number | null = null;
  branchSearch = '';
  branchSelected = false;
  branchSearchStarted = false;

  branches = signal<Branch[]>([]);
  loadingBranches = false;

  // ================================
  // FORM
  // ================================

  loading = false;

  // ================================
  // FILTERED BANKS
  // ================================

  filteredBanks = computed(() => {
    const search = this.bankSearch.trim().toLowerCase();

    if (!search || !this.bankSearchStarted) {
      return [];
    }

    return this.banks().filter(
      (bank) =>
        bank.active &&
        (bank.name.toLowerCase().includes(search) || bank.code.toLowerCase().includes(search)),
    );
  });

  // ================================
  // FILTERED BRANCHES
  // ================================

  filteredBranches = computed(() => {
    const search = this.branchSearch.trim().toLowerCase();

    if (!search || !this.branchSearchStarted) {
      return [];
    }

    return this.branches().filter(
      (branch) =>
        branch.active &&
        (branch.name.toLowerCase().includes(search) ||
          branch.code.toLowerCase().includes(search) ||
          (branch.location ?? '').toLowerCase().includes(search)),
    );
  });

  // ================================
  // CONSTRUCTOR
  // ================================

  constructor() {
    this.loadBanks();
    this.loadBranches();
    this.loadLocalBranch();
  }

  // ================================
  // LOAD BANKS
  // ================================

  loadBanks(): void {
    this.loadingBanks = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/banks';

    this.http.get<BankResponse>(endpoint).subscribe({
      next: (response) => {
        this.banks.set(response.data ?? []);
        this.loadingBanks = false;
      },

      error: (error) => {
        this.loadingBanks = false;

        console.error('Failed to load banks:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load banks.', 'Error');
      },
    });
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
  // LOAD BRANCH FROM LOCAL STORAGE
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
      this.branchSearchStarted = false;
    }
  }

  // ================================
  // BANK SEARCH
  // ================================

  onBankSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.bankSearch = input.value;
    this.bankSearchStarted = this.bankSearch.trim().length > 0;

    this.bankId = null;
    this.bankSelected = false;
  }

  onBankFocus(): void {
    // Do not display banks just because
    // the field received focus.
    if (!this.bankSearch.trim()) {
      this.bankSearchStarted = false;
    }
  }

  selectBank(bank: Bank): void {
    this.bankId = bank.id;

    this.bankSearch = `${bank.name} (${bank.code})`;

    this.bankSelected = true;
    this.bankSearchStarted = false;
  }

  clearBank(): void {
    this.bankId = null;
    this.bankSearch = '';
    this.bankSelected = false;
    this.bankSearchStarted = false;
  }

  // ================================
  // BRANCH SEARCH
  // ================================

  onBranchSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.branchSearch = input.value;
    this.branchSearchStarted = this.branchSearch.trim().length > 0;

    this.branchId = null;
    this.branchSelected = false;
  }

  onBranchFocus(): void {
    // Do not display branches just because
    // the field received focus.
    if (!this.branchSearch.trim()) {
      this.branchSearchStarted = false;
    }
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.id;

    this.branchSearch = `${branch.name} (${branch.code})`;

    this.branchSelected = true;
    this.branchSearchStarted = false;
  }

  clearBranch(): void {
    this.branchId = null;
    this.branchSearch = '';
    this.branchSelected = false;
    this.branchSearchStarted = false;
  }

  // ================================
  // FORM
  // ================================

  goBack(): void {
    this.router.navigate(['/bank-accounts']);
  }

  createBankAccount(): void {
    if (!this.bankId || !this.accountName.trim() || !this.accountNumber.trim()) {
      this.toastr.warning('Bank, account name and account number are required.', 'Validation');

      return;
    }

    if (this.commissionRate < 0) {
      this.toastr.warning('Commission rate cannot be negative.', 'Validation');

      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: CreateBankAccountRequest = {
      bankId: this.bankId,
      accountName: this.accountName.trim(),
      accountNumber: this.accountNumber.trim(),
      currency: this.currency,
      openingBalance: Number(this.currentBalance) || 0,
      actionedBy,
    };

    console.log('CreateBankAccountRequest:', request);

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/bank-accounts';

    this.http.post<any>(endpoint, request).subscribe({
      next: (response) => {
        console.log('Bank account created successfully:', response);

        const bankAccountId = this.getCreatedBankAccountId(response);

        if (!bankAccountId) {
          this.loading = false;

          console.error('Bank account was created, but no bank account ID was returned.', response);

          this.toastr.error(
            'Bank account was created, but its ID could not be retrieved. Commission account was not created.',
            'Error',
          );

          return;
        }

        this.createCommissionAccount(bankAccountId, actionedBy);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create bank account:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || error?.error?.error || 'Failed to create bank account.',
          'Error',
        );
      },
    });
  }

  // ================================
  // GET CREATED BANK ACCOUNT ID
  // ================================

  private getCreatedBankAccountId(response: any): number | null {
    const id =
      response?.data?.id ??
      response?.data?.bankAccountId ??
      response?.id ??
      response?.bankAccountId;

    const parsedId = Number(id);

    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return null;
    }

    return parsedId;
  }

  // ================================
  // CREATE COMMISSION ACCOUNT
  // ================================

  private createCommissionAccount(bankAccountId: number, actionedBy: string): void {
    const commissionRequest: CreateCommissionAccountRequest = {
      bankAccountId,
      commissionRate: Number(this.commissionRate) || 0,
      actionedBy,
    };

    console.log('CreateCommissionAccountRequest:', commissionRequest);

    const endpoint = this.masterService.getBackendService() + 'api/v1/commissions/accounts';

    this.http.post(endpoint, commissionRequest).subscribe({
      next: (response) => {
        console.log('Commission account created successfully:', response);

        this.loading = false;

        this.toastr.success('Bank account and commission account created successfully.', 'Success');

        this.router.navigate(['/bank-accounts']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create commission account:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message ||
            error?.error?.error ||
            'Bank account was created, but the commission account could not be created.',
          'Commission Account Error',
        );
      },
    });
  }
}
