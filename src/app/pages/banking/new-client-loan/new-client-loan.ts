import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface CreateClientLoanRequest {
  branchId: number;
  clientName: string;
  clientPhone: string;
  currency: string;
  principalAmount: number;
  interestRate: number;
  fundingSource: string;
  fundingBankAccountId: number | null;
  dateIssued: string;
  dueDate: string | null;
  reference: string;
  description: string;
  actionedBy: string;
}

@Component({
  selector: 'app-new-client-loan',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-client-loan.html',
  styleUrl: './new-client-loan.css',
})
export class NewClientLoan {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  // =========================
  // Client fields
  // =========================

  clientName = '';
  clientPhone = '';

  // =========================
  // Loan fields
  // =========================

  currency = 'USD';
  principalAmount = 0;
  interestRate = 0;

  dateIssued = this.getToday();
  dueDate = '';

  reference = '';
  description = '';

  // =========================
  // Funding
  // =========================

  fundingSource = 'BRANCH_FLOAT';

  fundingBankAccountId: number | null = null;

  fundingSources = ['BRANCH_FLOAT', 'BANK_ACCOUNT'];

  // =========================
  // Bank accounts
  // =========================

  bankAccounts: any[] = [];
  bankAccountsLoading = false;

  // =========================
  // Branch
  // =========================

  branchId: number | null = null;
  branchName = '';

  // =========================
  // Currency options
  // =========================

  currencies = ['USD', 'ZIG', 'ZAR', 'EUR'];

  // =========================
  // Form state
  // =========================

  loading = false;

  constructor() {
    this.loadLocalBranch();
  }

  // =========================
  // Load branch from localStorage
  // =========================

  loadLocalBranch(): void {
    const storedBranchId = localStorage.getItem('branchId');

    if (!storedBranchId) {
      return;
    }

    const parsedBranchId = Number(storedBranchId);

    if (!Number.isFinite(parsedBranchId) || parsedBranchId <= 0) {
      return;
    }

    this.branchId = parsedBranchId;

    const storedBranchName = localStorage.getItem('branchName');

    if (storedBranchName) {
      this.branchName = storedBranchName;
    }
  }

  // =========================
  // Currency change
  // =========================

  onCurrencyChange(): void {
    this.fundingBankAccountId = null;
    this.bankAccounts = [];

    if (this.fundingSource === 'BANK_ACCOUNT') {
      this.loadBankAccounts();
    }
  }

  // =========================
  // Load bank accounts
  // =========================

  loadBankAccounts(): void {
    if (!this.currency) {
      this.bankAccounts = [];
      return;
    }

    this.bankAccountsLoading = true;

    const endpoint =
      this.masterService.getBackendService() + 'api/v1/bank-accounts/currency/' + this.currency;

    this.http.get<any>(endpoint).subscribe({
      next: (response) => {
        this.bankAccounts = response?.data || [];

        this.bankAccountsLoading = false;

        if (this.bankAccounts.length === 0) {
          this.toastr.info(`No active bank accounts found for ${this.currency}.`, 'Bank Accounts');
        }
      },

      error: (error) => {
        this.bankAccounts = [];
        this.bankAccountsLoading = false;

        console.error('Failed to load bank accounts:', error);

        this.toastr.error(
          error?.error?.message || `Failed to load ${this.currency} bank accounts.`,
          'Error',
        );
      },
    });
  }

  // =========================
  // Funding source
  // =========================

  onFundingSourceChange(): void {
    if (this.fundingSource === 'BRANCH_FLOAT') {
      this.fundingBankAccountId = null;
      this.bankAccounts = [];
    }

    if (this.fundingSource === 'BANK_ACCOUNT') {
      this.loadBankAccounts();
    }
  }

  // =========================
  // Navigation
  // =========================

  goBack(): void {
    this.router.navigate(['/client-loans']);
  }

  // =========================
  // Create client loan
  // =========================

  createClientLoan(): void {
    if (
      !this.branchId ||
      !this.clientName.trim() ||
      !this.clientPhone.trim() ||
      !this.currency ||
      this.principalAmount <= 0 ||
      !this.dateIssued
    ) {
      this.toastr.warning(
        'Please enter the client details, select a currency and enter a valid principal amount.',
        'Validation',
      );

      return;
    }

    if (this.fundingSource === 'BANK_ACCOUNT' && !this.fundingBankAccountId) {
      this.toastr.warning('Please select the funding bank account.', 'Validation');

      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: CreateClientLoanRequest = {
      branchId: this.branchId,
      clientName: this.clientName.trim(),
      clientPhone: this.clientPhone.trim(),
      currency: this.currency,
      principalAmount: Number(this.principalAmount) || 0,
      interestRate: Number(this.interestRate) || 0,
      fundingSource: this.fundingSource,

      fundingBankAccountId:
        this.fundingSource === 'BANK_ACCOUNT' ? Number(this.fundingBankAccountId) || null : null,

      dateIssued: this.dateIssued,
      dueDate: this.dueDate || null,
      reference: this.reference.trim(),
      description: this.description.trim(),
      actionedBy: actionedBy,
    };

    console.log('CreateClientLoanRequest:', request);

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/client-loans/issue';

    this.http.post(endpoint, request).subscribe({
      next: (response) => {
        console.log('Client loan created successfully:', response);

        this.loading = false;

        this.toastr.success('Client loan issued successfully.', 'Success');

        this.router.navigate(['/client-loans']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create client loan:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to issue client loan.', 'Error');
      },
    });
  }

  // =========================
  // Today
  // =========================

  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
