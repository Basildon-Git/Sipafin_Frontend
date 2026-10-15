import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../core/services/master';

interface CurrencyBalance {
  currency: string;
  amount: number;
}

interface LoanSummary {
  totalLoans: number;
  activeLoans: number;
  partiallyPaidLoans: number;
  paidLoans: number;
  cancelledLoans: number;
  totalPrincipal: number;
  totalPayable?: number;
  totalReceivable?: number;
  totalOutstanding: number;
}

interface ActivitySummary {
  floatIn: number;
  floatOut: number;
  bankIn: number;
  bankOut: number;
  floatToBankDeposits: number;
  bankToFloatWithdrawals: number;
  expensesFromFloat: number;
  expensesFromBank: number;
  investorLoansReceived: number;
  investorLoanRepayments: number;
  clientLoansIssued: number;
  clientLoanRepayments: number;
  reconciliationAdjustments: number;
}

interface ReconciliationItem {
  reconciliationId: number;
  bankAccountId: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
  currency: string;
  reconciliationDate: string;
  systemBalanceBefore: number;
  statementBalance: number;
  difference: number;
  differenceType: string;
  reconciledAmount: number;
  unreconciledAmount: number;
  systemBalanceAfter?: number;
  status?: string;
  reference: string;
  reason: string;
  actionedBy: string;
}

interface BankAccountHealth {
  bankAccountId: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  currentSystemBalance: number;
  lastReconciliationDate: string | null;
  lastStatus: string | null;
  lastDifferenceType: string | null;
  lastDifference: number;
  lastUnreconciledAmount: number;
  daysSinceLastReconciliation: number;
  healthStatus: string;
}

interface ReconciliationSummary {
  totalReconciliations: number;
  draftCount: number;
  balancedCount: number;
  partiallyReconciledCount: number;
  unresolvedCount: number;
  cancelledCount: number;
  totalDifference: number;
  totalShortAmount: number;
  totalExcessAmount: number;
  totalReconciledAmount: number;
  totalUnreconciledAmount: number;
  statusCounts: { status: string; count: number }[];
  unresolvedItems: ReconciliationItem[];
  bankAccountHealth: BankAccountHealth[];
  recentReconciliations: ReconciliationItem[];
}

interface DashboardData {
  fromDate: string;
  toDate: string;
  floatBalances: CurrencyBalance[];
  bankBalances: CurrencyBalance[];
  totalLiquidity: CurrencyBalance[];
  investorLoans: LoanSummary;
  clientLoans: LoanSummary;
  activity: ActivitySummary;
  reconciliation: ReconciliationSummary;
}

interface DashboardResponse {
  status: number;
  message: string;
  data: DashboardData;
  timestamp: string;
}

interface ActivityItem {
  label: string;
  value: number;
  icon: string;
}

interface ActivityGroup {
  title: string;
  description: string;
  tone: 'income' | 'expense' | 'transfer';
  icon: string;
  items: ActivityItem[];
}

interface LegendItem {
  label: string;
  count: number;
  color: string;
}

type ReconciliationTab = 'unresolved' | 'recent' | 'health';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly masterService = inject(Master);
  private readonly toastr = inject(ToastrService);

  today = new Date();
  fullName = 'User';

  dashboard: DashboardData | null = null;
  loading = false;
  errorMessage = '';

  activeTab: ReconciliationTab = 'unresolved';

  ngOnInit(): void {
    this.loadWelcomeName();
    this.loadDashboard();
  }

  private loadWelcomeName(): void {
    const storedName = localStorage.getItem('fullName');

    this.fullName = storedName?.trim() || 'User';
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    const url = `${this.masterService.getBackendService()}api/v1/dashboard`;

    this.http
      .get<DashboardResponse>(url)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          if (response.status !== 200 || !response.data) {
            this.errorMessage = response.message || 'Unable to load dashboard data.';
            this.toastr.error(this.errorMessage);
            return;
          }

          this.dashboard = response.data;
        },
        error: (error) => {
          console.error('Dashboard API error:', error);

          this.errorMessage =
            error?.error?.message || 'Failed to load dashboard data. Please try again.';

          this.toastr.error(this.errorMessage);
        },
      });
  }

  // ---------- Getters ----------

  get greeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  }

  get floatBalances(): CurrencyBalance[] {
    return this.dashboard?.floatBalances ?? [];
  }

  get bankBalances(): CurrencyBalance[] {
    return this.dashboard?.bankBalances ?? [];
  }

  get totalLiquidity(): CurrencyBalance[] {
    return this.dashboard?.totalLiquidity ?? [];
  }

  get activity(): ActivitySummary | null {
    return this.dashboard?.activity ?? null;
  }

  get reconciliation(): ReconciliationSummary | null {
    return this.dashboard?.reconciliation ?? null;
  }

  get investorLoans(): LoanSummary | null {
    return this.dashboard?.investorLoans ?? null;
  }

  get clientLoans(): LoanSummary | null {
    return this.dashboard?.clientLoans ?? null;
  }

  get unresolvedItems(): ReconciliationItem[] {
    return this.reconciliation?.unresolvedItems ?? [];
  }

  get recentReconciliations(): ReconciliationItem[] {
    return this.reconciliation?.recentReconciliations ?? [];
  }

  get bankAccountHealth(): BankAccountHealth[] {
    return this.reconciliation?.bankAccountHealth ?? [];
  }

  get activityGroups(): ActivityGroup[] {
    const a = this.activity;

    if (!a) {
      return [];
    }

    return [
      {
        title: 'Money In',
        description: 'Funds received during the period',
        tone: 'income',
        icon: 'bi-box-arrow-in-down',
        items: [
          { label: 'Float In', value: a.floatIn, icon: 'bi-box-arrow-in-down' },
          { label: 'Bank In', value: a.bankIn, icon: 'bi-bank' },
          {
            label: 'Investor Loans Received',
            value: a.investorLoansReceived,
            icon: 'bi-cash-coin',
          },
          { label: 'Client Repayments', value: a.clientLoanRepayments, icon: 'bi-check2-circle' },
        ],
      },
      {
        title: 'Money Out',
        description: 'Funds paid out during the period',
        tone: 'expense',
        icon: 'bi-box-arrow-up',
        items: [
          { label: 'Float Out', value: a.floatOut, icon: 'bi-box-arrow-up' },
          { label: 'Bank Out', value: a.bankOut, icon: 'bi-arrow-up-right' },
          { label: 'Expenses from Float', value: a.expensesFromFloat, icon: 'bi-receipt' },
          { label: 'Expenses from Bank', value: a.expensesFromBank, icon: 'bi-credit-card' },
          {
            label: 'Investor Repayments',
            value: a.investorLoanRepayments,
            icon: 'bi-arrow-return-left',
          },
          { label: 'Client Loans Issued', value: a.clientLoansIssued, icon: 'bi-send' },
        ],
      },
      {
        title: 'Transfers & Adjustments',
        description: 'Internal movements and corrections',
        tone: 'transfer',
        icon: 'bi-arrow-left-right',
        items: [
          { label: 'Float to Bank', value: a.floatToBankDeposits, icon: 'bi-arrow-right-circle' },
          { label: 'Bank to Float', value: a.bankToFloatWithdrawals, icon: 'bi-arrow-left-circle' },
          {
            label: 'Reconciliation Adjustments',
            value: a.reconciliationAdjustments,
            icon: 'bi-sliders',
          },
        ],
      },
    ];
  }

  get reconciliationLegend(): LegendItem[] {
    const r = this.reconciliation;

    if (!r) {
      return [];
    }

    return [
      { label: 'Balanced', count: r.balancedCount, color: '#12a36b' },
      { label: 'Partial', count: r.partiallyReconciledCount, color: '#e0a100' },
      { label: 'Unresolved', count: r.unresolvedCount, color: '#d93636' },
      { label: 'Draft', count: r.draftCount, color: '#94a3b8' },
      { label: 'Cancelled', count: r.cancelledCount, color: '#cbd5e1' },
    ];
  }

  get reconciliationDonut(): string {
    const r = this.reconciliation;
    const legend = this.reconciliationLegend;
    const total = legend.reduce((sum, item) => sum + item.count, 0);

    if (!r || total === 0) {
      return 'conic-gradient(#edf1f5 0 100%)';
    }

    let start = 0;
    const stops: string[] = [];

    for (const item of legend) {
      if (item.count === 0) {
        continue;
      }

      const end = start + (item.count / total) * 100;
      stops.push(`${item.color} ${start}% ${end}%`);
      start = end;
    }

    return `conic-gradient(${stops.join(', ')})`;
  }

  get balancedPercent(): number {
    const r = this.reconciliation;

    if (!r || !r.totalReconciliations) {
      return 0;
    }

    return Math.round((r.balancedCount / r.totalReconciliations) * 100);
  }

  // ---------- Helpers ----------

  setTab(tab: ReconciliationTab): void {
    this.activeTab = tab;
  }

  private amountFor(list: CurrencyBalance[], currency: string): number {
    return list.find((item) => item.currency === currency)?.amount ?? 0;
  }

  bankShare(currency: string): number {
    const bank = this.amountFor(this.bankBalances, currency);
    const float = this.amountFor(this.floatBalances, currency);
    const total = bank + float;

    return total > 0 ? Math.round((bank / total) * 100) : 0;
  }

  floatShare(currency: string): number {
    const bank = this.amountFor(this.bankBalances, currency);
    const float = this.amountFor(this.floatBalances, currency);

    return bank + float > 0 ? 100 - this.bankShare(currency) : 0;
  }

  repaidPercent(loan: LoanSummary | null): number {
    if (!loan) {
      return 0;
    }

    const total = loan.totalPayable ?? loan.totalReceivable ?? loan.totalPrincipal;

    if (!total) {
      return 0;
    }

    const percent = ((total - loan.totalOutstanding) / total) * 100;

    return Math.min(100, Math.max(0, Math.round(percent)));
  }

  segmentWidth(loan: LoanSummary, count: number): number {
    return loan.totalLoans ? (count / loan.totalLoans) * 100 : 0;
  }

  formatAmount(amount: number | null | undefined): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0);
  }

  formatCurrency(currency: string, amount: number): string {
    return `${currency} ${this.formatAmount(amount)}`;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) {
      return 'Never';
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  statusClass(status: string | null | undefined): string {
    switch ((status || '').toUpperCase()) {
      case 'BALANCED':
      case 'PAID':
      case 'ACTIVE':
        return 'status-success';

      case 'PARTIALLY_RECONCILED':
      case 'PARTIALLY_PAID':
        return 'status-warning';

      case 'UNRESOLVED':
      case 'CANCELLED':
        return 'status-danger';

      case 'DRAFT':
      case 'NEVER_RECONCILED':
        return 'status-neutral';

      default:
        return 'status-neutral';
    }
  }

  statusLabel(status: string | null | undefined): string {
    return status ? status.replace(/_/g, ' ') : 'N/A';
  }

  healthLabel(status: string): string {
    switch (status) {
      case 'NEVER_RECONCILED':
        return 'Never reconciled';
      case 'UNRESOLVED':
        return 'Unresolved';
      case 'BALANCED':
        return 'Balanced';
      case 'PARTIALLY_RECONCILED':
        return 'Partially reconciled';
      default:
        return status.replace(/_/g, ' ');
    }
  }

  trackCurrency(_: number, item: CurrencyBalance): string {
    return item.currency;
  }

  trackReconciliation(_: number, item: ReconciliationItem): number {
    return item.reconciliationId;
  }

  trackBankAccount(_: number, item: BankAccountHealth): number {
    return item.bankAccountId;
  }

  openNewTransaction(): void {
    // Connect this to your existing transaction creation route.
  }

  openReconciliations(): void {
    // Connect this to your existing bank reconciliation route.
  }

  openBanks(): void {
    // Connect this to your existing bank accounts route.
  }

  openLoans(): void {
    // Connect this to your existing loans route.
  }
}
