import { DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

interface BankTransaction {
  id: number;
  bankAccountId: number;
  accountName: string;
  accountNumber: string;
  bankId: number;
  bankName: string;
  bankCode: string;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  currency: string;
  transactionType: string;
  direction: 'IN' | 'OUT';
  amount: number;
  balanceAfter: number;
  transactionDate: string;
  transactionGroupId: string;
  status: string;
  reference: string | null;
  description: string | null;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface BankTransactionWithBalanceBefore extends BankTransaction {
  balanceBefore: number;
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

interface BankTransactionsResponse {
  status: number;
  message: string;
  data: BankTransaction[];
  timestamp: string;
}

@Component({
  selector: 'app-banking-accounts',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule],
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

  selectedAccount = signal<BankingAccount | null>(null);
  accountTransactions = signal<BankTransaction[]>([]);
  transactionsLoading = signal(false);
  transactionsModalOpen = signal(false);
  selectedTransactionDate = this.getToday();

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

  selectedDayTransactions = computed<BankTransactionWithBalanceBefore[]>(() => {
    return this.accountTransactions()
      .filter((transaction) => transaction.transactionDate === this.selectedTransactionDate)
      .sort((a, b) => {
        const createdCompare = (a.createdAt || '').localeCompare(b.createdAt || '');

        if (createdCompare !== 0) {
          return createdCompare;
        }

        return Number(a.id || 0) - Number(b.id || 0);
      })
      .map((transaction) => ({
        ...transaction,
        balanceBefore: this.calculateBalanceBefore(transaction),
      }));
  });

  selectedDayOpeningBalance = computed(() => {
    const transactions = this.selectedDayTransactions();

    if (transactions.length === 0) {
      return 0;
    }

    return Number(transactions[0].balanceBefore || 0);
  });

  selectedDayClosingBalance = computed(() => {
    const transactions = this.selectedDayTransactions();

    if (transactions.length === 0) {
      return 0;
    }

    return Number(transactions[transactions.length - 1].balanceAfter || 0);
  });

  selectedDayInTotal = computed(() =>
    this.selectedDayTransactions()
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
  );

  selectedDayOutTotal = computed(() =>
    this.selectedDayTransactions()
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
  );

  selectedDayNetTotal = computed(() => this.selectedDayInTotal() - this.selectedDayOutTotal());

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

  editAccount(id: number): void {
    this.router.navigate(['/bank-accounts/edit/', id]);
  }

  openTransactionsModal(account: BankingAccount): void {
    this.selectedAccount.set(account);
    this.selectedTransactionDate = this.getToday();
    this.accountTransactions.set([]);
    this.transactionsModalOpen.set(true);
    this.loadAccountTransactions(account);
  }

  closeTransactionsModal(): void {
    this.transactionsModalOpen.set(false);
    this.selectedAccount.set(null);
    this.accountTransactions.set([]);
    this.transactionsLoading.set(false);
  }

  onTransactionDateChange(): void {
    // Transactions are already loaded for the selected account/currency.
  }

  refreshTransactions(): void {
    const account = this.selectedAccount();

    if (!account) {
      return;
    }

    this.loadAccountTransactions(account);
  }

  private loadAccountTransactions(account: BankingAccount): void {
    this.transactionsLoading.set(true);

    const endpoint =
      this.masterService.getBackendService() +
      `api/v1/money-movements/bank/account/${account.id}/currency/${account.currency}`;

    this.http.get<BankTransactionsResponse>(endpoint).subscribe({
      next: (response) => {
        this.accountTransactions.set(response.data ?? []);
        this.transactionsLoading.set(false);
      },

      error: (error) => {
        this.transactionsLoading.set(false);

        console.error('Failed to load bank account transactions:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || 'Failed to load bank account transactions.',
          'Error',
        );
      },
    });
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

  formatAmount(amount: number | null | undefined): string {
    return Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '';
    }

    if (accountNumber.length <= 4) {
      return accountNumber;
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }

  formatTransactionType(type: string): string {
    return (type || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  getDirectionLabel(direction: string): string {
    return direction === 'IN' ? 'Money In' : 'Money Out';
  }

  private calculateBalanceBefore(transaction: BankTransaction): number {
    const amount = Number(transaction.amount || 0);
    const balanceAfter = Number(transaction.balanceAfter || 0);

    if (transaction.direction === 'IN') {
      return balanceAfter - amount;
    }

    return balanceAfter + amount;
  }

  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
