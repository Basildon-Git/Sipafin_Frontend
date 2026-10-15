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

  page = 1;
  pageSize: number | string = 10;

  pageSizeOptions: (number | string)[] = [5, 10, 20, 50, 100, 'All'];

  selectedReconciliation: ReconciliationItem | null = null;
  showDetails = false;

  readonly statuses = ['UNRESOLVED', 'PARTIALLY_RECONCILED', 'RECONCILED', 'RESOLVED'];
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

  // =====================================================
  // LOAD RECONCILIATIONS
  // =====================================================

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

  // =====================================================
  // FILTERING
  // =====================================================

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

      return matchesSearch && matchesStatus && matchesCurrency;
    });

    this.page = 1;
    this.updatePagedList();
  }

  // =====================================================
  // PAGINATION
  // =====================================================

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

  // =====================================================
  // SUMMARY COUNTS
  // =====================================================

  get totalRecords(): number {
    return this.reconciliations.length;
  }

  get unresolvedCount(): number {
    return this.reconciliations.filter((item) => item.status === 'UNRESOLVED').length;
  }

  get reconciledCount(): number {
    return this.reconciliations.filter(
      (item) => item.status === 'RECONCILED' || item.status === 'RESOLVED',
    ).length;
  }

  // =====================================================
  // STATUS
  // =====================================================

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'RECONCILED':
      case 'RESOLVED':
        return 'status-reconciled';

      case 'PARTIALLY_RECONCILED':
        return 'status-partial';

      case 'UNRESOLVED':
        return 'status-unresolved';

      default:
        return 'status-default';
    }
  }

  getDifferenceClass(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'SHORT':
        return 'difference-short';

      case 'OVER':
        return 'difference-over';

      default:
        return 'difference-balanced';
    }
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

  // =====================================================
  // DETAILS
  // =====================================================

  viewDetails(item: ReconciliationItem): void {
    this.selectedReconciliation = item;
    this.showDetails = true;
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedReconciliation = null;
  }

  // =====================================================
  // RESET
  // =====================================================

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedCurrency = '';

    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedStatus || this.selectedCurrency);
  }

  trackById(index: number, item: ReconciliationItem): number {
    return item.id;
  }
}
