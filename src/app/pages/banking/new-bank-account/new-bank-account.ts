import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
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

interface BankAccount {
  id: number;
  bankId: number;
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BankAccountResponse {
  status: number;
  message: string;
  data: BankAccount;
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

export interface UpdateBankAccountRequest {
  bankId: number;
  accountName: string;
  accountNumber: string;
  currency: string;
  openingBalance: number;
  active: boolean;
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
  private readonly route = inject(ActivatedRoute);

  // ================================
  // EDIT MODE
  // ================================

  accountId: number | null = null;
  isEditMode = false;
  loadingAccount = false;
  accountLoadFailed = false;

  // ================================
  // FORM
  // ================================

  accountName = '';
  accountNumber = '';
  currency = 'USD';
  currentBalance: number | null = 0;

  // Commission rate
  commissionRate: number | null = 0;

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

  filteredBanks(): Bank[] {
    const search = this.bankSearch.trim().toLowerCase();

    if (!search || !this.bankSearchStarted) {
      return [];
    }

    return this.banks().filter(
      (bank) =>
        bank.active &&
        (bank.name.toLowerCase().includes(search) || bank.code.toLowerCase().includes(search)),
    );
  }

  // ================================
  // FILTERED BRANCHES
  // ================================

  filteredBranches(): Branch[] {
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
  }

  // ================================
  // CONSTRUCTOR
  // ================================

  constructor() {
    this.loadBanks();
    this.loadBranches();
    this.loadLocalBranch();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (id !== null) {
        const parsedId = Number(id);

        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          this.toastr.error('Invalid bank account ID.', 'Error');
          this.goBack();
          return;
        }

        this.accountId = parsedId;
        this.isEditMode = true;

        this.loadBankAccount(parsedId);
      } else {
        this.accountId = null;
        this.isEditMode = false;
        this.loadingAccount = false;
        this.accountLoadFailed = false;

        this.bankId = null;
        this.bankSearch = '';
        this.bankSelected = false;
        this.bankSearchStarted = false;

        this.accountName = '';
        this.accountNumber = '';
        this.currency = 'USD';
        this.currentBalance = 0;
        this.commissionRate = 0;
        this.active = true;
      }
    });
  }

  // ================================
  // LOAD BANK ACCOUNT BY ID
  // ================================

  loadBankAccount(id: number): void {
    this.loadingAccount = true;
    this.accountLoadFailed = false;

    const endpoint = this.masterService.getBackendService() + `api/v1/bank-accounts/${id}`;

    this.http.get<BankAccountResponse>(endpoint).subscribe({
      next: (response) => {
        if (this.accountId !== id || !this.isEditMode) {
          return;
        }

        const account = response.data;

        if (!account) {
          this.loadingAccount = false;
          this.accountLoadFailed = true;

          this.toastr.error('Bank account details not found.', 'Error');
          return;
        }

        // Populate bank
        this.bankId = account.bankId;
        this.bankSearch = `${account.bankName} (${account.bankCode})`;
        this.bankSelected = true;
        this.bankSearchStarted = false;

        // Populate form
        this.accountName = account.accountName ?? '';
        this.accountNumber = account.accountNumber ?? '';
        this.currency = account.currency ?? 'USD';
        this.currentBalance = account.currentBalance ?? 0;
        this.active = account.active;

        this.loadingAccount = false;

        console.log('Bank account loaded successfully:', account);
      },

      error: (error) => {
        if (this.accountId !== id || !this.isEditMode) {
          return;
        }

        this.loadingAccount = false;
        this.accountLoadFailed = true;

        console.error('Failed to load bank account:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load bank account.', 'Error');
      },
    });
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

  // ================================
  // VALIDATE BALANCE
  // ================================

  isBalanceValid(): boolean {
    return (
      this.currentBalance !== null &&
      Number.isFinite(Number(this.currentBalance)) &&
      Number(this.currentBalance) >= 0
    );
  }

  // ================================
  // SAVE BANK ACCOUNT
  // ================================

  saveBankAccount(): void {
    if (this.loading || this.loadingAccount || this.accountLoadFailed) {
      return;
    }

    if (this.isEditMode) {
      this.updateBankAccount();
    } else {
      this.createBankAccount();
    }
  }

  // ================================
  // CREATE BANK ACCOUNT
  // ================================

  createBankAccount(): void {
    if (!this.bankId || !this.accountName.trim() || !this.accountNumber.trim()) {
      this.toastr.warning('Bank, account name and account number are required.', 'Validation');
      return;
    }

    if (!this.isBalanceValid()) {
      this.toastr.warning('Please enter a valid non-negative opening balance.', 'Validation');
      return;
    }

    if (
      this.commissionRate === null ||
      !Number.isFinite(Number(this.commissionRate)) ||
      Number(this.commissionRate) < 0
    ) {
      this.toastr.warning('Commission rate cannot be negative.', 'Validation');
      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: CreateBankAccountRequest = {
      bankId: this.bankId,
      accountName: this.accountName.trim(),
      accountNumber: this.accountNumber.trim(),
      currency: this.currency,
      openingBalance: Number(this.currentBalance),
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
  // UPDATE BANK ACCOUNT
  // ================================

  updateBankAccount(): void {
    if (!this.accountId) {
      this.toastr.warning('Bank account ID is missing.', 'Validation');
      return;
    }

    if (!this.bankId || !this.accountName.trim() || !this.accountNumber.trim()) {
      this.toastr.warning('Bank, account name and account number are required.', 'Validation');
      return;
    }

    if (!this.isBalanceValid()) {
      this.toastr.warning('Please enter a valid non-negative opening balance.', 'Validation');
      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: UpdateBankAccountRequest = {
      bankId: this.bankId,
      accountName: this.accountName.trim(),
      accountNumber: this.accountNumber.trim(),
      currency: this.currency,
      openingBalance: Number(this.currentBalance),
      active: this.active,
      actionedBy,
    };

    console.log('UpdateBankAccountRequest:', request);

    this.loading = true;

    const endpoint =
      this.masterService.getBackendService() + `api/v1/bank-accounts/${this.accountId}`;

    this.http.put<any>(endpoint, request).subscribe({
      next: (response) => {
        this.loading = false;

        console.log('Bank account updated successfully:', response);

        this.toastr.success(response?.message || 'Bank account updated successfully.', 'Success');

        this.router.navigate(['/bank-accounts']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to update bank account:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || error?.error?.error || 'Failed to update bank account.',
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
      commissionRate: Number(this.commissionRate),
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
