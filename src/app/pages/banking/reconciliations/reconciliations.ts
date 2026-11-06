import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

import { Master } from '../../../core/services/master';
import { Router } from '@angular/router';

interface ReconciliationItem {
  id: number;
  bankAccountId: number;
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  branchId: number | null;
  branchName: string | null;
  currency: string;
  reconciliationDate: string;
  systemBalanceBefore: number;
  statementBalance: number;
  difference: number;
  differenceType: string;
  reconciledAmount: number;
  unreconciledAmount: number;
  systemBalanceAfter: number;
  transactionGroupId: string;
  status: string;
  reference: string;
  reason: string;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
  items: any[];
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
  direction: string;
  amount: number;
  balanceAfter: number;
  transactionDate: string;
  transactionGroupId: string;
  status: string;
  reference: string;
  description: string;
  actionedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

@Component({
  selector: 'app-reconciliations',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, NgbPaginationModule],
  templateUrl: './reconciliations.html',
  styleUrl: './reconciliations.css',
})
export class Reconciliations implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly masterService = inject(Master);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  reconciliations: ReconciliationItem[] = [];
  filteredList: ReconciliationItem[] = [];
  pagedList: ReconciliationItem[] = [];

  loading = false;
  errorMessage = '';

  searchTerm = '';
  selectedStatus = '';
  selectedCurrency = '';
  fromDate = '';
  toDate = '';

  page = 1;
  pageSize: number | string = 10;
  pageSizeOptions: (number | string)[] = [5, 10, 20, 50, 100, 'All'];

  selectedReconciliation: ReconciliationItem | null = null;
  showDetails = false;

  selectedTransactionReconciliation: ReconciliationItem | null = null;
  showTransactions = false;
  transactionLoading = false;
  transactionError = '';
  transactionDateFilter = '';
  bankTransactions: BankTransaction[] = [];
  filteredBankTransactions: BankTransaction[] = [];

  readonly statuses = [
    'DRAFT',
    'BALANCED',
    'PARTIALLY_RECONCILED',
    'UNRESOLVED',
    'CANCELLED',
    'RECONCILED',
    'RESOLVED',
  ];

  readonly currencies = ['USD', 'ZIG', 'ZAR', 'EUR'];

  ngOnInit(): void {
    this.loadReconciliations();
  }

  newBankStatement(): void {
    this.router.navigate(['/banking/new-bank-statement']);
  }

  newBankReconciliation(id: number, bankId: number): void {
    this.router.navigate(['/banking/new-bank-reconciliation/' + id + '/' + bankId]);
  }

  loadReconciliations(): void {
    this.loading = true;
    this.errorMessage = '';

    const url = this.masterService.getBackendService() + 'api/v1/bank-reconciliations/all';

    this.http.get<ApiResponse<ReconciliationItem[]>>(url).subscribe({
      next: (response) => {
        this.reconciliations = Array.isArray(response.data) ? response.data : [];
        this.loading = false;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading bank reconciliations:', error);

        this.loading = false;
        this.reconciliations = [];
        this.filteredList = [];
        this.pagedList = [];

        this.errorMessage = error?.error?.message || 'Failed to load bank reconciliations.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredList = this.reconciliations.filter((item) => {
      const matchesSearch =
        !search ||
        [
          item.bankName,
          item.bankCode,
          item.accountName,
          item.accountNumber,
          item.branchName,
          item.currency,
          item.reference,
          item.reason,
          item.transactionGroupId,
          item.actionedBy,
        ].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(search),
        );

      const matchesStatus = !this.selectedStatus || item.status === this.selectedStatus;
      const matchesCurrency = !this.selectedCurrency || item.currency === this.selectedCurrency;
      const matchesFromDate = !this.fromDate || item.reconciliationDate >= this.fromDate;
      const matchesToDate = !this.toDate || item.reconciliationDate <= this.toDate;

      return matchesSearch && matchesStatus && matchesCurrency && matchesFromDate && matchesToDate;
    });

    this.page = 1;
    this.updatePagedList();
  }

  updatePagedList(): void {
    if (this.pageSize === 'All') {
      this.pagedList = [...this.filteredList];
      return;
    }

    const size = Number(this.pageSize);
    const start = (this.page - 1) * size;

    this.pagedList = this.filteredList.slice(start, start + size);
  }

  onPageChange(page: number): void {
    this.page = page;
    this.updatePagedList();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.updatePagedList();
  }

  get paginationSize(): number {
    return this.pageSize === 'All' ? Math.max(this.filteredList.length, 1) : Number(this.pageSize);
  }

  get recordStart(): number {
    if (this.filteredList.length === 0) {
      return 0;
    }

    if (this.pageSize === 'All') {
      return 1;
    }

    return (this.page - 1) * Number(this.pageSize) + 1;
  }

  get recordEnd(): number {
    if (this.pageSize === 'All') {
      return this.filteredList.length;
    }

    return Math.min(this.page * Number(this.pageSize), this.filteredList.length);
  }

  get totalRecords(): number {
    return this.reconciliations.length;
  }

  get unresolvedCount(): number {
    return this.reconciliations.filter((item) => item.status === 'UNRESOLVED').length;
  }

  get reconciledCount(): number {
    return this.reconciliations.filter(
      (item) =>
        item.status === 'RECONCILED' ||
        item.status === 'RESOLVED' ||
        item.status === 'BALANCED',
    ).length;
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'RECONCILED':
      case 'RESOLVED':
      case 'BALANCED':
        return 'status-reconciled';

      case 'PARTIALLY_RECONCILED':
        return 'status-partial';

      case 'UNRESOLVED':
        return 'status-unresolved';

      case 'CANCELLED':
        return 'status-cancelled';

      default:
        return 'status-default';
    }
  }

  getDifferenceClass(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'SHORT':
        return 'difference-short';

      case 'OVER':
      case 'EXCESS':
        return 'difference-over';

      default:
        return 'difference-balanced';
    }
  }

  getDirectionClass(direction: string): string {
    return direction === 'IN' ? 'direction-in' : 'direction-out';
  }

  formatLabel(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  viewDetails(item: ReconciliationItem): void {
    this.selectedReconciliation = item;
    this.showDetails = true;
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedReconciliation = null;
  }

  openTransactions(item: ReconciliationItem): void {
    this.selectedTransactionReconciliation = item;
    this.transactionDateFilter = item.reconciliationDate;
    this.showTransactions = true;
    this.loadBankTransactions(item);
  }

  closeTransactions(): void {
    this.showTransactions = false;
    this.selectedTransactionReconciliation = null;
    this.transactionDateFilter = '';
    this.bankTransactions = [];
    this.filteredBankTransactions = [];
    this.transactionError = '';
  }

  loadBankTransactions(item: ReconciliationItem): void {
    this.transactionLoading = true;
    this.transactionError = '';
    this.bankTransactions = [];
    this.filteredBankTransactions = [];

    const url =
      this.masterService.getBackendService() +
      `api/v1/money-movements/bank/account/${item.bankAccountId}/currency/${item.currency}`;

    this.http.get<ApiResponse<BankTransaction[]>>(url).subscribe({
      next: (response) => {
        this.bankTransactions = Array.isArray(response.data) ? response.data : [];
        this.transactionLoading = false;
        this.applyTransactionDateFilter();
      },
      error: (error) => {
        console.error('Error loading bank transactions:', error);

        this.transactionLoading = false;
        this.transactionError = error?.error?.message || 'Failed to load bank transactions.';
        this.toastr.error(this.transactionError, 'Error');
      },
    });
  }

  applyTransactionDateFilter(): void {
    this.filteredBankTransactions = this.bankTransactions
      .filter((transaction) => {
        if (!this.transactionDateFilter) {
          return true;
        }

        return transaction.transactionDate === this.transactionDateFilter;
      })
      .sort((a, b) => {
        const dateCompare = a.transactionDate.localeCompare(b.transactionDate);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return Number(a.id) - Number(b.id);
      });
  }

  get transactionInTotal(): number {
    return this.filteredBankTransactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get transactionOutTotal(): number {
    return this.filteredBankTransactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get transactionBalanceBefore(): number {
    if (this.filteredBankTransactions.length === 0) {
      return 0;
    }

    return this.getTransactionBalanceBefore(this.filteredBankTransactions[0]);
  }

  get transactionBalanceAfter(): number {
    if (this.filteredBankTransactions.length === 0) {
      return 0;
    }

    const lastTransaction = this.filteredBankTransactions[this.filteredBankTransactions.length - 1];

    return Number(lastTransaction.balanceAfter || 0);
  }

  getTransactionBalanceBefore(transaction: BankTransaction): number {
    const balanceAfter = Number(transaction.balanceAfter || 0);
    const amount = Number(transaction.amount || 0);

    if (transaction.direction === 'IN') {
      return balanceAfter - amount;
    }

    return balanceAfter + amount;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedCurrency = '';
    this.fromDate = '';
    this.toDate = '';

    this.applyFilters();
  }

  clearDateFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.selectedStatus ||
      this.selectedCurrency ||
      this.fromDate ||
      this.toDate
    );
  }

  trackById(index: number, item: ReconciliationItem): number {
    return item.id;
  }

  trackByTransactionId(index: number, item: BankTransaction): number {
    return item.id;
  }
}
