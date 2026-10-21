import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Master } from '../../../core/services/master';
import { Router } from '@angular/router';

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp?: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  location?: string;
  active: boolean;
}

interface FloatTransaction {
  id: number;
  branchFloatAccountId: number;
  branchId: number;
  branchName: string;
  branchCode: string;
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

@Component({
  selector: 'app-branch-float-transactions',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './branch-float-transactions.html',
  styleUrl: './branch-float-transactions.css',
})
export class BranchFloatTransactions implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  private readonly branchesUrl = this.masterService.getBackendService() + 'api/v1/branches/active';
  private readonly transactionsUrl =
    this.masterService.getBackendService() + 'api/v1/money-movements/float';

  readonly currencies = ['USD', 'ZIG', 'ZAR', 'EUR'];

  branches = signal<Branch[]>([]);
  transactions = signal<FloatTransaction[]>([]);

  selectedBranchId = signal<number | null>(null);
  selectedCurrency = signal('USD');
  searchTerm = signal('');

  loadingBranches = signal(false);
  loadingTransactions = signal(false);
  errorMessage = signal('');

  filteredTransactions = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const records = this.transactions();

    if (!search) {
      return records;
    }

    return records.filter((transaction) =>
      [
        transaction.branchName,
        transaction.branchCode,
        transaction.currency,
        transaction.transactionType,
        transaction.direction,
        transaction.status,
        transaction.reference,
        transaction.description,
        transaction.actionedBy,
        transaction.transactionGroupId,
        transaction.branchFloatAccountId,
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search),
      ),
    );
  });

  totalTransactions = computed(() => this.transactions().length);

  totalIn = computed(() =>
    this.transactions()
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0),
  );

  totalOut = computed(() =>
    this.transactions()
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0),
  );

  netMovement = computed(() => this.totalIn() - this.totalOut());

  latestBalance = computed(() => {
    const records = this.transactions();

    if (!records.length) {
      return 0;
    }

    const latest = [...records].sort((a, b) => {
      const dateDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      return dateDifference || b.id - a.id;
    })[0];

    return Number(latest.balanceAfter || 0);
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  editTransaction(transactionId: number): void {
    this.router.navigate(['/branch-float-transactions/edit/', transactionId]);
  }

  loadBranches(): void {
    this.loadingBranches.set(true);
    this.errorMessage.set('');

    this.http.get<ApiResponse<Branch[]>>(this.branchesUrl).subscribe({
      next: (response) => {
        const activeBranches = (response.data ?? []).filter((branch) => branch.active);

        this.branches.set(activeBranches);
        this.loadingBranches.set(false);

        if (!activeBranches.length) {
          this.selectedBranchId.set(null);
          this.transactions.set([]);
          this.errorMessage.set('No active branches were found.');
          return;
        }

        const currentBranchId = this.selectedBranchId();
        const branchExists = activeBranches.some((branch) => branch.id === currentBranchId);

        const branchId = branchExists ? currentBranchId : activeBranches[0].id;

        this.selectedBranchId.set(branchId);
        this.loadTransactions();
      },
      error: (error) => {
        this.loadingBranches.set(false);
        this.transactions.set([]);
        this.errorMessage.set(
          error?.error?.message || 'Unable to load active branches. Please try again.',
        );
      },
    });
  }

  loadTransactions(): void {
    const branchId = this.selectedBranchId();
    const currency = this.selectedCurrency();

    if (branchId === null || !currency) {
      this.transactions.set([]);
      return;
    }

    this.loadingTransactions.set(true);
    this.errorMessage.set('');
    this.transactions.set([]);

    const url = `${this.transactionsUrl}/branch/${branchId}/currency/${encodeURIComponent(currency)}`;

    this.http.get<ApiResponse<FloatTransaction[]>>(url).subscribe({
      next: (response) => {
        this.transactions.set(response.data ?? []);
        this.loadingTransactions.set(false);
      },
      error: (error) => {
        this.transactions.set([]);
        this.loadingTransactions.set(false);
        this.errorMessage.set(
          error?.error?.message || 'Unable to load float transactions. Please try again.',
        );
      },
    });
  }

  onBranchChange(value: string): void {
    const branchId = value ? Number(value) : null;

    this.selectedBranchId.set(branchId !== null && Number.isFinite(branchId) ? branchId : null);

    this.loadTransactions();
  }

  onCurrencyChange(value: string): void {
    this.selectedCurrency.set(value);
    this.loadTransactions();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  refresh(): void {
    this.loadTransactions();
  }

  formatTransactionType(type: string): string {
    return (type || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  getDirectionClass(direction: string): string {
    return direction === 'IN' ? 'direction-in' : 'direction-out';
  }

  getTransactionClass(type: string): string {
    const normalizedType = (type || '').toUpperCase();

    if (
      normalizedType.includes('TRANSFER_IN') ||
      normalizedType.includes('DEPOSIT') ||
      normalizedType.includes('RECEIVED') ||
      normalizedType.includes('CASH_IN')
    ) {
      return 'transaction-in';
    }

    if (
      normalizedType.includes('TRANSFER_OUT') ||
      normalizedType.includes('WITHDRAWAL') ||
      normalizedType.includes('PAYMENT') ||
      normalizedType.includes('EXPENSE') ||
      normalizedType.includes('CASH_OUT')
    ) {
      return 'transaction-out';
    }

    if (normalizedType.includes('REVERSAL') || normalizedType.includes('ADJUSTMENT')) {
      return 'transaction-adjustment';
    }

    return 'transaction-default';
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'POSTED':
        return 'status-posted';
      case 'PENDING':
        return 'status-pending';
      case 'REVERSED':
      case 'CANCELLED':
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-default';
    }
  }

  trackByTransactionId(index: number, transaction: FloatTransaction): number {
    return transaction.id;
  }
}
