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
  fromDate = signal('');
  toDate = signal('');
  searchTerm = signal('');

  loadingBranches = signal(false);
  loadingTransactions = signal(false);
  errorMessage = signal('');

  filteredTransactions = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    const list = [...this.transactions()].sort((a, b) => {
      const dateCompare = a.transactionDate.localeCompare(b.transactionDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return Number(a.id) - Number(b.id);
    });

    if (!search) {
      return list;
    }

    return list.filter((transaction) =>
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

  totalTransactions = computed(() => this.filteredTransactions().length);

  totalIn = computed(() =>
    this.filteredTransactions()
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0),
  );

  totalOut = computed(() =>
    this.filteredTransactions()
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0),
  );

  netMovement = computed(() => this.totalIn() - this.totalOut());

  overallBalanceBefore = computed(() => {
    const transactions = this.filteredTransactions();

    if (transactions.length === 0) {
      return 0;
    }

    return this.getBalanceBefore(transactions[0]);
  });

  overallBalanceAfter = computed(() => {
    const transactions = this.filteredTransactions();

    if (transactions.length === 0) {
      return 0;
    }

    return Number(transactions[transactions.length - 1].balanceAfter || 0);
  });

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

        this.selectedBranchId.set(null);
        this.loadTransactions();
      },
      error: (error) => {
        this.loadingBranches.set(false);
        this.transactions.set([]);
        this.errorMessage.set(error?.error?.message ?? 'Failed to load active branches.');
      },
    });
  }

  loadTransactions(): void {
    const branchId = this.selectedBranchId();
    const currency = this.selectedCurrency();
    const fromDate = this.fromDate();
    const toDate = this.toDate();

    if (!currency) {
      this.transactions.set([]);
      return;
    }

    this.loadingTransactions.set(true);
    this.errorMessage.set('');
    this.transactions.set([]);

    let url = '';

    if (branchId === null) {
      if (fromDate && toDate) {
        url =
          `${this.transactionsUrl}/currency/${encodeURIComponent(currency)}/date-range` +
          `?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
      } else {
        url = `${this.transactionsUrl}/currency/${encodeURIComponent(currency)}`;
      }
    } else {
      if (fromDate && toDate) {
        url =
          `${this.transactionsUrl}/branch/${branchId}/currency/${encodeURIComponent(currency)}/date-range` +
          `?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
      } else {
        url = `${this.transactionsUrl}/branch/${branchId}/currency/${encodeURIComponent(currency)}`;
      }
    }

    this.http.get<ApiResponse<BankTransaction[]>>(url).subscribe({
      next: (response) => {
        this.transactions.set(response.data ?? []);
        this.loadingTransactions.set(false);
      },
      error: (error) => {
        this.transactions.set([]);
        this.loadingTransactions.set(false);
        this.errorMessage.set(error?.error?.message ?? 'Failed to load bank transactions.');
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

  onDateFilterChange(): void {
    const fromDate = this.fromDate();
    const toDate = this.toDate();

    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      return;
    }

    this.loadTransactions();
  }

  clearDateFilters(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.loadTransactions();
  }

  clearAllFilters(): void {
    this.selectedBranchId.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.searchTerm.set('');
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

  getBalanceBefore(transaction: BankTransaction): number {
    const balanceAfter = Number(transaction.balanceAfter || 0);
    const amount = Number(transaction.amount || 0);

    if (transaction.direction === 'IN') {
      return balanceAfter - amount;
    }

    return balanceAfter + amount;
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
      case 'TRANSFER_IN':
      case 'COMMISSION_CREDIT':
      case 'CURRENCY_EXCHANGE_IN':
      case 'CLIENT_LOAN_REPAYMENT':
      case 'REVENUE_RECEIPT':
        return 'transaction-in';

      case 'CASH_WITHDRAWAL':
      case 'TRANSFER_OUT':
      case 'EXPENSE_PAYMENT':
      case 'CURRENCY_EXCHANGE_OUT':
      case 'CLIENT_LOAN_ISSUED':
        return 'transaction-out';

      case 'ADJUSTMENT':
      case 'RECONCILIATION_ADJUSTMENT':
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
