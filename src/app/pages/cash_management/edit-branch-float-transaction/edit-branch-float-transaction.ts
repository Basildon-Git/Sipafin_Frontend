import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Master } from '../../../core/services/master';

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp?: string;
}

type MoneyDirection = 'IN' | 'OUT';
type TransactionStatus = 'POSTED' | 'REVERSED' | 'CANCELLED';

interface FloatTransaction {
  id: number;
  branchFloatAccountId: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  currency: string;
  transactionType: string;
  direction: MoneyDirection;
  amount: number;
  balanceAfter: number;
  transactionDate: string;
  transactionGroupId: string;
  status: TransactionStatus;
  reference: string | null;
  description: string | null;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface UpdateFloatTransactionRequest {
  direction: MoneyDirection;
  amount: number;
  transactionDate: string;
  status: TransactionStatus;
  reference: string;
  description: string;
  actionedBy: string;
}

@Component({
  selector: 'app-edit-branch-float-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './edit-branch-float-transaction.html',
  styleUrl: './edit-branch-float-transaction.css',
})
export class EditBranchFloatTransaction implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly masterService = inject(Master);

  private readonly apiUrl =
    this.masterService.getBackendService() + 'api/v1/money-movements/float-transactions';

  transaction = signal<FloatTransaction | null>(null);
  transactionId = signal<number | null>(null);

  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  form = {
    amount: 0,
    status: 'POSTED' as TransactionStatus,
    reference: '',
    description: '',
    actionedBy: '',
  };

  ngOnInit(): void {
    this.form.actionedBy = this.getActionedBy();

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));

      if (!Number.isInteger(id) || id <= 0) {
        this.loading.set(false);
        this.errorMessage.set('Invalid transaction ID in the route.');
        return;
      }

      this.transactionId.set(id);
      this.loadTransaction(id);
    });
  }

  private getActionedBy(): string {
    return (
      localStorage.getItem('username') ||
      localStorage.getItem('userName') ||
      localStorage.getItem('user') ||
      ''
    );
  }

  loadTransaction(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.transaction.set(null);

    this.http.get<ApiResponse<FloatTransaction>>(`${this.apiUrl}/${id}`).subscribe({
      next: (response) => {
        const record = response.data;

        if (!record) {
          this.loading.set(false);
          this.errorMessage.set('The requested transaction was not found.');
          return;
        }

        this.transaction.set(record);

        this.form = {
          amount: Number(record.amount),
          status: record.status,
          reference: record.reference ?? '',
          description: record.description ?? '',
          actionedBy: this.getActionedBy(),
        };

        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          error?.error?.message || 'Unable to load the transaction. Please try again.',
        );
      },
    });
  }

  saveChanges(): void {
    const id = this.transactionId();
    const record = this.transaction();

    if (id === null || !record || this.saving()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    const amount = Number(this.form.amount);

    if (!Number.isFinite(amount)) {
      this.errorMessage.set('Amount must be a valid number.');
      return;
    }

    if (amount < 0) {
      this.errorMessage.set('Amount cannot be negative.');
      return;
    }

    const actionedBy = this.getActionedBy();

    if (!actionedBy.trim()) {
      this.errorMessage.set('Unable to identify the logged-in user. Please sign in again.');
      return;
    }

    const payload: UpdateFloatTransactionRequest = {
      direction: record.direction,
      amount,
      transactionDate: record.transactionDate,
      status: this.form.status,
      reference: this.form.reference.trim(),
      description: this.form.description.trim(),
      actionedBy,
    };

    this.saving.set(true);

    this.http.put<ApiResponse<FloatTransaction>>(`${this.apiUrl}/${id}`, payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.successMessage.set(response.message || 'Transaction updated successfully.');

        if (response.data) {
          this.transaction.set(response.data);

          this.form = {
            amount: Number(response.data.amount),
            status: response.data.status,
            reference: response.data.reference ?? '',
            description: response.data.description ?? '',
            actionedBy: this.getActionedBy(),
          };
        }

        setTimeout(() => {
          this.router.navigate(['/branch-float-transactions']);
        }, 700);
      },
      error: (error) => {
        this.saving.set(false);

        const validationFields = error?.error?.fields;
        const firstValidationMessage = validationFields
          ? Object.values(validationFields)[0]
          : null;

        this.errorMessage.set(
          String(firstValidationMessage || error?.error?.message || 'Unable to update the transaction. Please try again.'),
        );
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/branch-float-transactions']);
  }

  reload(): void {
    const id = this.transactionId();

    if (id !== null) {
      this.loadTransaction(id);
    }
  }

  formatTransactionType(type: string): string {
    return (type || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
