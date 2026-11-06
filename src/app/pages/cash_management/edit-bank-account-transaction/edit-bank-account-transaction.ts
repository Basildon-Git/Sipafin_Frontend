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

type Direction = 'IN' | 'OUT';
type TransactionStatus = 'POSTED' | 'REVERSED' | 'CANCELLED' | 'PENDING' | 'FAILED';

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
  direction: Direction;
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

interface UpdateBankTransactionRequest {
  direction: Direction;
  amount: number;
  balanceBefore: number;
  transactionDate: string;
  status: TransactionStatus;
  reference: string;
  description: string;
  actionedBy: string;
}

@Component({
  selector: 'app-edit-bank-account-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './edit-bank-account-transaction.html',
  styleUrl: './edit-bank-account-transaction.css',
})
export class EditBankAccountTransaction implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly masterService = inject(Master);

  private readonly apiUrl =
    this.masterService.getBackendService() + 'api/v1/money-movements/bank-transactions';

  transaction = signal<BankTransaction | null>(null);
  transactionId = signal<number | null>(null);

  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  statuses: TransactionStatus[] = ['POSTED', 'REVERSED', 'CANCELLED'];

  form = {
    direction: 'IN' as Direction,
    amount: 0,
    balanceBefore: 0,
    transactionDate: '',
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

    this.http.get<ApiResponse<BankTransaction>>(`${this.apiUrl}/${id}`).subscribe({
      next: (response) => {
        const record = response.data;

        if (!record) {
          this.loading.set(false);
          this.errorMessage.set('The requested bank transaction was not found.');
          return;
        }

        this.transaction.set(record);

        this.form = {
          direction: record.direction,
          amount: Number(record.amount || 0),
          balanceBefore: this.getBalanceBefore(record),
          transactionDate: record.transactionDate,
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
          error?.error?.message || 'Unable to load the bank transaction. Please try again.',
        );
      },
    });
  }

  get computedBalanceAfter(): number {
    const balanceBefore = Number(this.form.balanceBefore || 0);
    const amount = Number(this.form.amount || 0);

    if (this.form.direction === 'IN') {
      return balanceBefore + amount;
    }

    return balanceBefore - amount;
  }

  getBalanceBefore(record: BankTransaction): number {
    const balanceAfter = Number(record.balanceAfter || 0);
    const amount = Number(record.amount || 0);

    if (record.direction === 'IN') {
      return balanceAfter - amount;
    }

    return balanceAfter + amount;
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
    const balanceBefore = Number(this.form.balanceBefore);

    if (!Number.isFinite(amount)) {
      this.errorMessage.set('Amount must be a valid number.');
      return;
    }

    if (amount < 0) {
      this.errorMessage.set('Amount cannot be negative.');
      return;
    }

    if (!Number.isFinite(balanceBefore)) {
      this.errorMessage.set('Balance before must be a valid number.');
      return;
    }

    if (balanceBefore < 0) {
      this.errorMessage.set('Balance before cannot be negative.');
      return;
    }

    if (this.computedBalanceAfter < 0) {
      this.errorMessage.set('Balance after cannot be negative.');
      return;
    }

    if (!this.form.transactionDate) {
      this.errorMessage.set('Transaction date is required.');
      return;
    }

    const actionedBy = this.getActionedBy();

    if (!actionedBy.trim()) {
      this.errorMessage.set('Unable to identify the logged-in user. Please sign in again.');
      return;
    }

    const payload: UpdateBankTransactionRequest = {
      direction: this.form.direction,
      amount,
      balanceBefore,
      transactionDate: this.form.transactionDate,
      status: this.form.status,
      reference: this.form.reference.trim(),
      description: this.form.description.trim(),
      actionedBy,
    };

    this.saving.set(true);

    this.http.put<ApiResponse<BankTransaction>>(`${this.apiUrl}/${id}`, payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.successMessage.set(response.message || 'Bank transaction updated successfully.');

        if (response.data) {
          this.transaction.set(response.data);

          this.form = {
            direction: response.data.direction,
            amount: Number(response.data.amount || 0),
            balanceBefore: this.getBalanceBefore(response.data),
            transactionDate: response.data.transactionDate,
            status: response.data.status,
            reference: response.data.reference ?? '',
            description: response.data.description ?? '',
            actionedBy: this.getActionedBy(),
          };
        }

        setTimeout(() => {
          this.router.navigate(['/bank-transactions']);
        }, 700);
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          error?.error?.message || 'Unable to update the bank transaction. Please try again.',
        );
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/bank-transactions']);
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
