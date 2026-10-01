import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { Master } from '../../../core/services/master';

interface BranchFloatAccount {
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

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

@Component({
  selector: 'app-petty-cash-branch-accounts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './petty-cash-branch-accounts.html',
  styleUrl: './petty-cash-branch-accounts.css',
})
export class PettyCashBranchAccounts implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly masterService = inject(Master);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  // ============================================================
  // DATA
  // ============================================================

  accounts: BranchFloatAccount[] = [];
  branchId: number | null = null;
  branchName = '';
  branchCode = '';
  loading = false;
  processingAccountId: number | null = null;

  // ============================================================
  // FILTER
  // ============================================================

  selectedCurrency = 'ALL';

  selectedStatus = 'ALL';

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    this.getBranchId();
  }

  // ============================================================
  // GET BRANCH ID FROM LOCAL STORAGE
  // ============================================================

  getBranchId(): void {
    const storedBranchId = localStorage.getItem('branchId');

    if (!storedBranchId) {
      this.toastr.error('Branch information was not found. Please login again.', 'Branch Error');

      return;
    }

    const parsedBranchId = Number(storedBranchId);

    if (!Number.isInteger(parsedBranchId) || parsedBranchId <= 0) {
      this.toastr.error('Invalid branch information. Please login again.', 'Branch Error');

      return;
    }

    this.branchId = parsedBranchId;

    this.loadBranchFloatAccounts();
  }

  // ============================================================
  // NEW FLOAT ACCOUNT
  // ============================================================

  newFloatAccount(): void {
    this.router.navigate(['/petty-cash-accounts/new']);
  }

  newFinancialSummary(): void{
    this.router.navigate(['/financial-transactions/new']);
  }

  // ============================================================
  // LOAD BRANCH FLOAT ACCOUNTS
  // ============================================================

  loadBranchFloatAccounts(): void {
    if (!this.branchId) {
      return;
    }

    this.loading = true;

    const url = this.masterService.getBackendService() + `api/v1/branch-floats/branch/${this.branchId}`;

    this.http.get<ApiResponse<BranchFloatAccount[]>>(url).subscribe({
      next: (response) => {
        this.accounts = response.data ?? [];

        if (this.accounts.length > 0) {
          this.branchName = this.accounts[0].branchName;

          this.branchCode = this.accounts[0].branchCode;
        }

        this.loading = false;
      },

      error: (error) => {
        console.error('Failed to load branch float accounts:', error);

        this.loading = false;

        this.toastr.error(
          error?.error?.message || 'Failed to load branch float accounts.',
          'Error',
        );
      },
    });
  }

  // ============================================================
  // FILTERED ACCOUNTS
  // ============================================================

  get filteredAccounts(): BranchFloatAccount[] {
    let result = [...this.accounts];

    if (this.selectedCurrency !== 'ALL') {
      result = result.filter((account) => account.currency === this.selectedCurrency);
    }

    if (this.selectedStatus === 'ACTIVE') {
      result = result.filter((account) => account.active);
    }

    if (this.selectedStatus === 'INACTIVE') {
      result = result.filter((account) => !account.active);
    }

    return result;
  }

  // ============================================================
  // AVAILABLE CURRENCIES
  // ============================================================

  get currencies(): string[] {
    return [...new Set(this.accounts.map((account) => account.currency))];
  }

  // ============================================================
  // USD ACCOUNT
  // ============================================================

  get usdAccount(): BranchFloatAccount | undefined {
    return this.accounts.find((account) => account.currency === 'USD');
  }

  // ============================================================
  // ZIG ACCOUNT
  // ============================================================

  get zigAccount(): BranchFloatAccount | undefined {
    return this.accounts.find((account) => account.currency === 'ZIG');
  }

  // ============================================================
  // ACTIVE USD BALANCE
  // ============================================================

  getBalance(currency: string): number {
    return this.accounts
      .filter((account) => account.currency === currency && account.active)
      .reduce((total, account) => total + Number(account.currentBalance || 0), 0);
  }

  // ============================================================
  // ACTIVE ACCOUNT COUNT
  // ============================================================

  get activeAccountCount(): number {
    return this.accounts.filter((account) => account.active).length;
  }

  // ============================================================
  // INACTIVE ACCOUNT COUNT
  // ============================================================

  get inactiveAccountCount(): number {
    return this.accounts.filter((account) => !account.active).length;
  }

  // ============================================================
  // ACTIVATE ACCOUNT
  // ============================================================

  activateAccount(account: BranchFloatAccount): void {
    if (account.active) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to activate the ${account.currency} float account for ${account.branchName}?`,
    );

    if (!confirmed) {
      return;
    }

    this.updateAccountStatus(account, 'activate');
  }

  // ============================================================
  // DEACTIVATE ACCOUNT
  // ============================================================

  deactivateAccount(account: BranchFloatAccount): void {
    if (!account.active) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate the ${account.currency} float account for ${account.branchName}?`,
    );

    if (!confirmed) {
      return;
    }

    this.updateAccountStatus(account, 'deactivate');
  }

  // ============================================================
  // UPDATE ACCOUNT STATUS
  // ============================================================

  private updateAccountStatus(
    account: BranchFloatAccount,
    action: 'activate' | 'deactivate',
  ): void {
    this.processingAccountId = account.id;

    const url = this.masterService.getBackendService() + `api/v1/branch-floats/${account.id}/${action}`;

    const actionedBy = localStorage.getItem('fullName') || '';

    /*
     * The activation/deactivation endpoints were supplied
     * without a request body. We therefore send actionedBy
     * as the audit information, consistent with the other
     * Sipafin status endpoints.
     */
    this.http
      .post(url, {
        actionedBy,
      })
      .subscribe({
        next: (response: any) => {
          this.processingAccountId = null;

          this.toastr.success(
            response?.message || `Float account ${action}d successfully.`,
            'Success',
          );

          this.loadBranchFloatAccounts();
        },

        error: (error) => {
          console.error(`Failed to ${action} float account:`, error);

          this.processingAccountId = null;

          this.toastr.error(error?.error?.message || `Failed to ${action} float account.`, 'Error');
        },
      });
  }

  // ============================================================
  // CHECK PROCESSING
  // ============================================================

  isProcessing(accountId: number): boolean {
    return this.processingAccountId === accountId;
  }

  // ============================================================
  // DISPLAY DATE
  // ============================================================

  formatDate(dateValue: string | undefined): string {
    if (!dateValue) {
      return '-';
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // ============================================================
  // DISPLAY DATE TIME
  // ============================================================

  formatDateTime(dateValue: string | undefined): string {
    if (!dateValue) {
      return '-';
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadBranchFloatAccounts();
  }

  // ============================================================
  // BACK
  // ============================================================

  back(): void {
    this.router.navigate(['/financial-transactions']);
  }
}
