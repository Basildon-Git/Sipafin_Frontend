import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface BranchFloatAccount {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  currency: string;
  currentBalance: number;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BranchFloatResponse {
  status: number;
  message: string;
  data: BranchFloatAccount[];
  timestamp: string;
}

@Component({
  selector: 'app-cash-floats',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './cash-floats.html',
  styleUrl: './cash-floats.css',
})
export class CashFloats {
  private readonly http = inject(HttpClient);
  private readonly masterService = inject(Master);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  // ============================================================
  // DATA
  // ============================================================

  accounts = signal<BranchFloatAccount[]>([]);

  branchId: number | null = null;
  branchName = '';
  branchCode = '';

  loading = false;

  // ============================================================
  // SEARCH
  // ============================================================

  searchTerm = signal('');

  // ============================================================
  // FILTER
  // ============================================================

  selectedCurrency = signal('ALL');
  selectedStatus = signal('ALL');

  // ============================================================
  // FILTERED ACCOUNTS
  // ============================================================

  filteredAccounts = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    const currency = this.selectedCurrency();
    const status = this.selectedStatus();

    return this.accounts().filter((account) => {
      const matchesSearch =
        !search ||
        account.branchName.toLowerCase().includes(search) ||
        account.branchCode.toLowerCase().includes(search) ||
        account.currency.toLowerCase().includes(search) ||
        String(account.id).includes(search) ||
        (account.actionedBy ?? '').toLowerCase().includes(search);

      const matchesCurrency = currency === 'ALL' || account.currency === currency;

      const matchesStatus =
        status === 'ALL' ||
        (status === 'ACTIVE' && account.active) ||
        (status === 'INACTIVE' && !account.active);

      return matchesSearch && matchesCurrency && matchesStatus;
    });
  });

  // ============================================================
  // CURRENCIES
  // ============================================================

  currencies = computed(() => {
    const values = this.accounts().map((account) => account.currency);

    return [...new Set(values)];
  });

  // ============================================================
  // SUMMARY COUNTS
  // ============================================================

  totalAccounts = computed(() => this.accounts().length);

  activeAccounts = computed(() => this.accounts().filter((account) => account.active).length);

  inactiveAccounts = computed(() => this.accounts().filter((account) => !account.active).length);

  // ============================================================
  // BALANCE
  // ============================================================

  getBalance(currency: string): number {
    return this.accounts()
      .filter((account) => account.currency === currency && account.active)
      .reduce((total, account) => total + Number(account.currentBalance || 0), 0);
  }

  // ============================================================
  // INIT
  // ============================================================

  constructor() {
    this.loadBranchFloats();
  }

  // ============================================================
  // LOAD FLOAT ACCOUNTS
  // ============================================================

  loadBranchFloats(): void {
    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/branch-floats';

    this.http.get<BranchFloatResponse>(endpoint).subscribe({
      next: (response) => {
        this.accounts.set(response.data ?? []);

        this.loading = false;

        if (this.accounts().length > 0) {
          this.branchId = this.accounts()[0].branchId;

          this.branchName = this.accounts()[0].branchName;

          this.branchCode = this.accounts()[0].branchCode;
        }
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to load branch float accounts:', error);

        this.toastr.error(
          error?.error?.message || 'Failed to load branch float accounts.',
          'Error',
        );
      },
    });
  }

  // ============================================================
  // SEARCH
  // ============================================================

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
  }

  // ============================================================
  // NEW FLOAT ACCOUNT
  // ============================================================

  addCashFloat(): void {
    this.router.navigate(['/petty-cash-accounts/new']);
  }

  // ============================================================
  // VIEW ACCOUNT
  // ============================================================

  viewAccount(id: number): void {
    this.router.navigate(['/petty-cash-account', id]);
  }

  // ============================================================
  // ACTIVATE
  // ============================================================

  activateAccount(account: BranchFloatAccount): void {
    const confirmed = confirm(
      `Activate the ${account.currency} float account for ${account.branchName}?`,
    );

    if (!confirmed) {
      return;
    }

    const endpoint =
      this.masterService.getBackendService() + `api/v1/branch-floats/${account.id}/activate`;

    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.toastr.success(`${account.currency} float account activated successfully.`, 'Success');

        this.loadBranchFloats();
      },

      error: (error) => {
        console.error('Failed to activate float account:', error);

        this.toastr.error(error?.error?.message || 'Failed to activate float account.', 'Error');
      },
    });
  }

  // ============================================================
  // DEACTIVATE
  // ============================================================

  deactivateAccount(account: BranchFloatAccount): void {
    const confirmed = confirm(
      `Deactivate the ${account.currency} float account for ${account.branchName}?`,
    );

    if (!confirmed) {
      return;
    }

    const endpoint =
      this.masterService.getBackendService() + `api/v1/branch-floats/${account.id}/deactivate`;

    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.toastr.success(
          `${account.currency} float account deactivated successfully.`,
          'Success',
        );

        this.loadBranchFloats();
      },

      error: (error) => {
        console.error('Failed to deactivate float account:', error);

        this.toastr.error(error?.error?.message || 'Failed to deactivate float account.', 'Error');
      },
    });
  }

  // ============================================================
  // STATUS
  // ============================================================

  getStatusClass(active: boolean): string {
    return active ? 'status-active' : 'status-inactive';
  }

  // ============================================================
  // CURRENCY CLASS
  // ============================================================

  getCurrencyClass(currency: string): string {
    switch (currency) {
      case 'USD':
        return 'currency-usd';

      case 'ZIG':
        return 'currency-zig';

      case 'ZAR':
        return 'currency-zar';

      case 'EUR':
        return 'currency-eur';

      default:
        return '';
    }
  }

  // ============================================================
  // BACK
  // ============================================================

  back(): void {
    this.router.navigate(['/financial-transactions']);
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadBranchFloats();
  }
}
