import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Master } from '../../../core/services/master';

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

interface BankTransaction {
  id: number;
  bankAccountId: number;
  accountName: string;
  accountNumber: string;
  bankId: number;
  bankName: string;
  bankCode: string;
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
  selector: 'app-bank-transactions',
  standalone: true,
  imports: [DecimalPipe, DatePipe, CommonModule],
  templateUrl: './bank-transactions.html',
  styleUrl: './bank-transactions.css',
})
export class BankTransactions implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private masterService = inject(Master);

  private readonly branchesUrl = this.masterService.getBackendService() + 'api/v1/branches/active';
  private readonly transactionsUrl = this.masterService.getBackendService() + 'api/v1/money-movements/bank';

  currencies = ['USD', 'ZIG', 'ZAR', 'EUR'];

  branches = signal<Branch[]>([]);
  transactions = signal<BankTransaction[]>([]);

  selectedBranchId = signal<number | null>(null);
  selectedCurrency = signal('USD');
  searchTerm = signal('');

  loadingBranches = signal(false);
  loadingTransactions = signal(false);
  errorMessage = signal('');

  filteredTransactions = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.transactions();
    }

    return this.transactions().filter((transaction) =>
      [
        transaction.accountName,
        transaction.accountNumber,
        transaction.bankName,
        transaction.bankCode,
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

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loadingBranches.set(true);
    this.errorMessage.set('');

    this.http.get<ApiResponse<Branch[]>>(this.branchesUrl).subscribe({
      next: (response) => {
        const activeBranches = (response.data ?? []).filter((branch) => branch.active);

        this.branches.set(activeBranches);
        this.loadingBranches.set(false);

        if (activeBranches.length > 0) {
          const currentId = this.selectedBranchId();

          const branchExists =
            currentId !== null && activeBranches.some((branch) => branch.id === currentId);

          const branchId = branchExists ? currentId : activeBranches[0].id;

          this.selectedBranchId.set(branchId);
          this.loadTransactions();
        } else {
          this.transactions.set([]);
          this.errorMessage.set('No active branches were found.');
        }
      },
      error: (error) => {
        this.loadingBranches.set(false);
        this.transactions.set([]);
        this.errorMessage = error?.error?.message ?? 'Failed to load active branches.';
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

    this.http.get<ApiResponse<BankTransaction[]>>(url).subscribe({
      next: (response) => {
        this.transactions.set(response.data ?? []);
        this.loadingTransactions.set(false);
      },
      error: (error) => {
        this.transactions.set([]);
        this.loadingTransactions.set(false);
        this.errorMessage = error?.error?.message ?? 'Failed to load bank transactions.';
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

  addTransaction(): void {
    this.router.navigate(['/bank-transactions/new']);
  }

  viewTransaction(id: number): void {
    this.router.navigate(['/bank-transactions', id]);
  }

  editTransaction(id: number): void {
    this.router.navigate(['/bank-transactions/edit', id]);
  }

  deleteTransaction(id: number): void {
    const confirmed = confirm('Are you sure you want to delete this bank transaction?');

    if (!confirmed) {
      return;
    }

    // Connect this to the backend DELETE endpoint before using it
    // to delete persistent records.
    alert('Backend delete endpoint has not been configured yet.');
  }

  formatTransactionType(type: string): string {
    return (type ?? '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '—';
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }

  getDirectionClass(direction: string): string {
    return direction === 'IN' ? 'direction-in' : 'direction-out';
  }

  getTransactionClass(type: string): string {
    switch (type) {
      case 'CASH_DEPOSIT':
      case 'BANK_DEPOSIT':
      case 'LOAN_RECEIVED':
      case 'LOAN_REPAYMENT':
      case 'COMMISSION_RECEIVED':
        return 'transaction-in';

      case 'CASH_WITHDRAWAL':
      case 'BANK_WITHDRAWAL':
      case 'EXPENSE':
        return 'transaction-out';

      case 'ADJUSTMENT':
        return 'transaction-adjustment';

      case 'REVERSAL':
        return 'transaction-reversal';

      default:
        return '';
    }
  }

  getStatusClass(status: string): string {
    switch ((status ?? '').toUpperCase()) {
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
}
