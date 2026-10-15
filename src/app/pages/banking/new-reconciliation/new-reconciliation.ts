import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

import { Master } from '../../../core/services/master';

type ReconciliationCategory =
  'EXPENSE' | 'BANK_CHARGE' | 'SUSPENSE' | 'CAPITAL' | 'REVERSAL' | 'OTHER';

type ReconciliationEffect = 'BANK_IN' | 'BANK_OUT' | 'NO_BALANCE_EFFECT';

interface ReconciliationItemForm {
  category: ReconciliationCategory | '';
  effect: ReconciliationEffect | '';
  amount: number | null;
  transactionDate: string;
  reference: string;
  description: string;
  actionedBy: string;
}

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp?: string;
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
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-new-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-reconciliation.html',
  styleUrl: './new-reconciliation.css',
})
export class NewReconciliation implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  reconciliationId: number | null = null;

  saving = false;
  submitted = false;
  errorMessage = '';

  bankAccountId: number | null = null;
  bankAccount: BankAccount | null = null;
  loadingBankAccount = false;
  bankAccountError = '';

  readonly categories: {
    value: ReconciliationCategory;
    label: string;
  }[] = [
    { value: 'EXPENSE', label: 'Expense' },
    { value: 'BANK_CHARGE', label: 'Bank Charge' },
    { value: 'SUSPENSE', label: 'Suspense' },
    { value: 'CAPITAL', label: 'Capital' },
    { value: 'REVERSAL', label: 'Reversal' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly effects: {
    value: ReconciliationEffect;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      value: 'BANK_IN',
      label: 'Bank In',
      description: 'Increase the bank balance',
      icon: 'bi-arrow-down-left',
    },
    {
      value: 'BANK_OUT',
      label: 'Bank Out',
      description: 'Decrease the bank balance',
      icon: 'bi-arrow-up-right',
    },
    {
      value: 'NO_BALANCE_EFFECT',
      label: 'No Balance Effect',
      description: 'Record without changing the bank balance',
      icon: 'bi-dash-circle',
    },
  ];

  form: ReconciliationItemForm = this.createEmptyForm();

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const reconciliationIdParam = params.get('id');
      const reconciliationId = Number(reconciliationIdParam);

      if (
        !reconciliationIdParam ||
        !Number.isSafeInteger(reconciliationId) ||
        reconciliationId <= 0
      ) {
        this.reconciliationId = null;

        this.errorMessage =
          'Invalid reconciliation ID. Please open this page from a reconciliation record.';

        return;
      }

      this.reconciliationId = reconciliationId;

      this.errorMessage = '';

      // Bank Account ID
      const bankAccountIdParam = params.get('bankAccountId');

      const bankAccountId = Number(bankAccountIdParam);

      this.bankAccount = null;
      this.bankAccountId = null;

      if (!bankAccountIdParam || !Number.isSafeInteger(bankAccountId) || bankAccountId <= 0) {
        this.bankAccountError = 'Invalid bank account ID.';

        return;
      }

      this.bankAccountId = bankAccountId;

      this.loadBankAccount();
    });
  }

  loadBankAccount(): void {
    if (!this.bankAccountId) {
      return;
    }

    this.loadingBankAccount = true;
    this.bankAccountError = '';
    this.bankAccount = null;

    const url =
      this.masterService.getBackendService() + `api/v1/bank-accounts/${this.bankAccountId}`;

    this.http.get<ApiResponse<BankAccount>>(url).subscribe({
      next: (response) => {
        this.loadingBankAccount = false;

        if (!response.data) {
          this.bankAccountError = 'Bank account details were not found.';

          return;
        }

        this.bankAccount = response.data;
      },

      error: (error) => {
        console.error('Failed to load bank account:', error);
        this.loadingBankAccount = false;
        this.bankAccountError = error?.error?.message || 'Failed to load bank account details.';
        this.toastr.error(this.bankAccountError, 'Error');
      },
    });
  }

  private createEmptyForm(): ReconciliationItemForm {
    return {
      category: '',
      effect: '',
      amount: null,
      transactionDate: this.getToday(),
      reference: '',
      description: '',
      actionedBy: this.getActionedBy(),
    };
  }

  get isFormValid(): boolean {
    return !!(
      this.reconciliationId &&
      this.form.category &&
      this.form.effect &&
      this.form.transactionDate &&
      this.form.amount !== null &&
      this.form.amount !== undefined &&
      Number.isFinite(Number(this.form.amount)) &&
      Number(this.form.amount) > 0 &&
      this.form.reference.trim() &&
      this.form.description.trim()
    );
  }

  selectEffect(effect: ReconciliationEffect): void {
    if (this.saving) {
      return;
    }

    this.form.effect = effect;
  }

  saveReconciliation(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.reconciliationId) {
      this.errorMessage = 'Invalid reconciliation ID.';
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
      category: this.form.category,
      effect: this.form.effect,
      amount: Number(this.form.amount),
      transactionDate: this.form.transactionDate,
      reference: this.form.reference.trim(),
      description: this.form.description.trim(),
      actionedBy: this.getActionedBy(),
    };

    const url =
      this.masterService.getBackendService() +
      `api/v1/bank-reconciliations/${this.reconciliationId}/items`;

    this.http.post<ApiResponse<unknown>>(url, payload).subscribe({
      next: (response) => {
        this.saving = false;

        this.toastr.success(
          response?.message || 'Reconciliation item saved successfully.',
          'Success',
        );

        // Keep the reconciliation ID so more items
        // can be captured against the same record.
        this.resetForm();
      },

      error: (error) => {
        console.error('Failed to save reconciliation item:', error);

        this.saving = false;

        this.errorMessage = error?.error?.message || 'Failed to save reconciliation item.';

        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  resetForm(): void {
    this.form = this.createEmptyForm();

    this.submitted = false;
    this.errorMessage = '';
  }

  cancel(): void {
    this.location.back();
  }

  private getActionedBy(): string {
    return localStorage.getItem('username') || localStorage.getItem('fullName') || '';
  }

  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
