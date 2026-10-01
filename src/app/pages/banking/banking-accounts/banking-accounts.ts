import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface BankingAccount {
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

  // Commission
  commissionRate?: number;
}

export interface CommissionAccount {
  id?: number;
  bankAccountId: number;
  commissionRate: number;
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

interface CommissionAccountResponse {
  status: number;
  message: string;
  data: CommissionAccount;
  timestamp: string;
}

@Component({
  selector: 'app-banking-accounts',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './banking-accounts.html',
  styleUrl: './banking-accounts.css',
})
export class BankingAccounts {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  searchTerm = signal('');

  accounts = signal<BankingAccount[]>([]);

  loading = signal(false);

  filteredAccounts = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.accounts();
    }

    return this.accounts().filter(
      (account) =>
        account.accountName.toLowerCase().includes(search) ||
        account.accountNumber.toLowerCase().includes(search) ||
        account.currency.toLowerCase().includes(search) ||
        account.bankName.toLowerCase().includes(search) ||
        account.bankCode.toLowerCase().includes(search) ||
        account.branchName.toLowerCase().includes(search),
    );
  });

  totalAccounts = computed(() => this.accounts().length);

  activeAccounts = computed(() => this.accounts().filter((account) => account.active).length);

  inactiveAccounts = computed(() => this.accounts().filter((account) => !account.active).length);

  totalBalance = computed(() =>
    this.accounts()
      .filter((account) => account.active)
      .reduce((total, account) => total + Number(account.currentBalance || 0), 0),
  );

  constructor() {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);

    const endpoint = this.masterService.getBackendService() + 'api/v1/bank-accounts';

    this.http.get<BankingAccountsResponse>(endpoint).subscribe({
      next: (response) => {
        const accounts = response.data ?? [];

        this.accounts.set(accounts);

        // Load commission accounts for the bank accounts
        this.loadCommissionAccounts(accounts);

        this.loading.set(false);
      },

      error: (error) => {
        this.loading.set(false);

        console.error('Failed to load banking accounts:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load banking accounts.', 'Error');
      },
    });
  }

  // =========================
  // Load Commission Accounts
  // =========================

  loadCommissionAccounts(accounts: BankingAccount[]): void {
    accounts.forEach((account) => {
      const endpoint =
        this.masterService.getBackendService() +
        `api/v1/commissions/accounts/bank-account/${account.id}`;

      this.http.get<CommissionAccountResponse>(endpoint).subscribe({
        next: (response) => {
          const commission = response?.data;

          this.accounts.update((currentAccounts) =>
            currentAccounts.map((item) =>
              item.id === account.id
                ? {
                    ...item,
                    commissionRate: Number(commission?.commissionRate ?? 0),
                  }
                : item,
            ),
          );
        },

        error: (error) => {
          console.error(`Failed to load commission account for bank account ${account.id}:`, error);

          console.error('Status:', error.status);
          console.error('URL:', error.url);
          console.error('Response:', error.error);

          // Keep the banking account visible even if commission
          // information is unavailable.
          this.accounts.update((currentAccounts) =>
            currentAccounts.map((item) =>
              item.id === account.id
                ? {
                    ...item,
                    commissionRate: 0,
                  }
                : item,
            ),
          );
        },
      });
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
  }

  createAccount(): void {
    this.router.navigate(['/bank-accounts/new']);
  }

  viewAccount(account: BankingAccount): void {
    this.router.navigate(['/bank-accounts', account.id]);
  }

  editAccount(account: BankingAccount): void {
    this.router.navigate(['/bank-accounts', account.id, 'edit']);
  }

  toggleStatus(account: BankingAccount): void {
    const activating = !account.active;

    const endpoint =
      this.masterService.getBackendService() +
      `api/v1/bank-accounts/${account.id}/${activating ? 'activate' : 'deactivate'}`;

    const actionedBy = localStorage.getItem('username') || '';

    const payload = {
      actionedBy,
    };

    this.http.put(endpoint, payload).subscribe({
      next: () => {
        this.accounts.update((accounts) =>
          accounts.map((item) =>
            item.id === account.id
              ? {
                  ...item,
                  active: activating,
                }
              : item,
          ),
        );

        this.toastr.success(
          `Banking account ${activating ? 'activated' : 'deactivated'} successfully.`,
          'Success',
        );
      },

      error: (error) => {
        console.error('Banking account status update failed:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message ||
            `Failed to ${activating ? 'activate' : 'deactivate'} banking account.`,
          'Error',
        );
      },
    });
  }

  deleteAccount(account: BankingAccount): void {
    const confirmed = confirm(`Are you sure you want to delete "${account.accountName}"?`);

    if (!confirmed) {
      return;
    }

    this.accounts.update((accounts) => accounts.filter((item) => item.id !== account.id));
  }

  formatBalance(account: BankingAccount): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(account.currentBalance || 0);
  }

  maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) {
      return accountNumber;
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }
}
