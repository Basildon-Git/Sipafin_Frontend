import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { Master } from '../../../core/services/master';

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
}

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp?: string;
}

interface StatementForm {
  bankAccountId: number | null;
  currency: string;
  reconciliationDate: string;
  statementBalance: number | null;
  reference: string;
  reason: string;
  actionedBy: string;
}

@Component({
  selector: 'app-new-statement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-statement.html',
  styleUrl: './new-statement.css',
})
export class NewStatement implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  bankAccounts: BankAccount[] = [];
  filteredBankAccounts: BankAccount[] = [];

  selectedBankAccount: BankAccount | null = null;

  bankSearch = '';
  showBankDropdown = false;

  loadingBanks = false;
  saving = false;
  submitted = false;

  errorMessage = '';

  form: StatementForm = this.createEmptyForm();

  ngOnInit(): void {
    this.loadBankAccounts();
  }

  private createEmptyForm(): StatementForm {
    return {
      bankAccountId: null,
      currency: '',
      reconciliationDate: this.getToday(),
      statementBalance: null,
      reference: '',
      reason: '',
      actionedBy: this.getActionedBy(),
    };
  }

  loadBankAccounts(): void {
    this.loadingBanks = true;

    const url = this.masterService.getBackendService() + 'api/v1/bank-accounts/active';

    this.http.get<ApiResponse<BankAccount[]> | BankAccount[]>(url).subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : (response.data ?? []);

        this.bankAccounts = data.filter((account) => account.active);
        this.filteredBankAccounts = [...this.bankAccounts];
        this.loadingBanks = false;
      },

      error: (error) => {
        console.error('Failed to load active bank accounts:', error);

        this.loadingBanks = false;

        this.toastr.error(error?.error?.message || 'Failed to load bank accounts.', 'Error');
      },
    });
  }


  onBankSearch(): void {
    const search = this.bankSearch.trim().toLowerCase();

    /*
     * If the user changes the search after selecting
     * an account, clear the old account selection.
     */
    this.selectedBankAccount = null;

    this.form.bankAccountId = null;
    this.form.currency = '';

    this.filteredBankAccounts = this.bankAccounts.filter((account) => {
      const searchableText = [
        account.bankName,
        account.bankCode,
        account.accountName,
        account.accountNumber,
        account.currency,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(search);
    });

    this.showBankDropdown = true;
  }

  openBankDropdown(): void {
    if (this.loadingBanks) {
      return;
    }

    const search = this.bankSearch.trim().toLowerCase();

    this.filteredBankAccounts = this.bankAccounts.filter((account) =>
      [
        account.bankName,
        account.bankCode,
        account.accountName,
        account.accountNumber,
        account.currency,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );

    this.showBankDropdown = true;
  }


  selectBankAccount(account: BankAccount): void {
    this.selectedBankAccount = account;
    this.form.bankAccountId = account.id;
    this.form.currency = account.currency;
    this.bankSearch = `${account.bankName} - ${account.accountName} (${account.accountNumber})`;
    this.showBankDropdown = false;
  }


  clearBankSelection(): void {
    this.selectedBankAccount = null;
    this.form.bankAccountId = null;
    this.form.currency = '';
    this.bankSearch = '';
    this.filteredBankAccounts = [...this.bankAccounts];
    this.showBankDropdown = false;
  }


  get isFormValid(): boolean {
    return !!(
      this.form.bankAccountId &&
      this.form.currency &&
      this.form.reconciliationDate &&
      this.form.statementBalance !== null &&
      this.form.statementBalance !== undefined &&
      Number.isFinite(Number(this.form.statementBalance)) &&
      Number(this.form.statementBalance) >= 0 &&
      this.form.reference.trim() &&
      this.form.reason.trim()
    );
  }

  saveStatement(): void {
    this.submitted = true;

    this.errorMessage = '';

    if (!this.selectedBankAccount || !this.form.bankAccountId) {
      this.errorMessage = 'Please select a valid bank account.';

      return;
    }

    if (!this.isFormValid) {
      this.errorMessage = 'Please complete all required fields correctly.';

      return;
    }

    if (this.saving) {
      return;
    }

    this.saving = true;

    const payload = {
      bankAccountId: this.form.bankAccountId,
      currency: this.selectedBankAccount.currency,
      reconciliationDate: this.form.reconciliationDate,
      statementBalance: Number(this.form.statementBalance),
      reference: this.form.reference.trim(),
      reason: this.form.reason.trim(),
      actionedBy: this.getActionedBy(),
    };

    const url = this.masterService.getBackendService() + 'api/v1/bank-reconciliations';

    this.http.post<ApiResponse<any>>(url, payload).subscribe({
      next: (response) => {
        this.saving = false;

        this.toastr.success(
          response?.message || 'Bank statement captured successfully.',
          'Success',
        );

        this.router.navigate(['/reconciliations']);
      },

      error: (error) => {
        console.error('Failed to capture bank statement:', error);

        this.saving = false;

        this.errorMessage = error?.error?.message || 'Failed to capture bank statement.';

        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }


  resetForm(): void {
    this.form = this.createEmptyForm();
    this.selectedBankAccount = null;
    this.bankSearch = '';
    this.filteredBankAccounts = [...this.bankAccounts];
    this.showBankDropdown = false;
    this.submitted = false;
    this.errorMessage = '';
  }


  cancel(): void {
    this.router.navigate(['/reconciliations']);
  }


  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }


  private getActionedBy(): string {
    return localStorage.getItem('fullName') || localStorage.getItem('username') || '';
  }


  formatAmount(amount: number | null | undefined): string {
    return Number(amount ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  trackBankAccount(index: number, account: BankAccount): number {
    return account.id;
  }
}
