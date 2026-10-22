import {CommonModule} from '@angular/common';
import {Component, inject, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {catchError, forkJoin, of} from 'rxjs';
import {Master} from '../../../core/services/master';

type Currency = 'USD' | 'ZIG' | 'ZAR' | 'EUR';

type TransactionType =
  | 'BANK_WITHDRAWAL'
  | 'BANK_DEPOSIT'
  | 'FLOAT_TRANSFER'
  | 'MONEY_MOVEMENT'
  | 'CURRENCY_EXCHANGE'
  | 'EXPENSE'
  | 'REVENUE'
  | 'OPENING_BALANCE';

type Direction = 'IN' | 'OUT';

type MoneySource = 'BRANCH_FLOAT' | 'BANK_ACCOUNT';

type ExpenseCategory =
  | 'AIRTIME'
  | 'TRANSPORT'
  | 'STATIONERY'
  | 'RENT'
  | 'INTERNET'
  | 'BANK_CHARGES'
  | 'UTILITIES'
  | 'REPAIRS'
  | 'STAFF_WELFARE'
  | 'OTHER';

type RevenueCategory =
  | 'SERVICE_FEE'
  | 'COMMISSION'
  | 'EXCHANGE_GAIN'
  | 'INTEREST_INCOME'
  | 'PENALTY'
  | 'CAPITAL_INJECTION'
  | 'OTHER';

interface Branch {
  id: number;
  name: string;
  code: string;
  location?: string | null;
  active: boolean;
}

interface BankAccount {
  id: number;
  bankId: number;
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  currency: Currency;
  currentBalance: number;
  active: boolean;
}

interface BranchFloat {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  currency: Currency;
  currentBalance: number;
  active: boolean;
}

interface FloatTransaction {
  id: number;
  branchFloatAccountId: number;
  branchId: number;
  branchName?: string;
  branchCode?: string;
  currency: Currency;
  transactionType: string;
  direction: Direction;
  amount: number;
  balanceAfter?: number;
  transactionDate: string;
  transactionGroupId?: string;
  status?: string;
  reference?: string;
  description?: string;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
  branchName?: string;
  branchCode?: string;
  currency: Currency;
  transactionType: string;
  direction: Direction;
  amount: number;
  balanceAfter?: number;
  transactionDate: string;
  transactionGroupId?: string;
  status?: string;
  reference?: string;
  description?: string;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BranchCurrencyTransactionsResponse {
  branchId: number;
  currency: Currency;
  floatTransactions: FloatTransaction[];
  bankTransactions: BankTransaction[];
}

interface DisplayTransaction {
  id: string;
  date: string;
  type: string;
  typeLabel: string;
  context: string;
  reference: string;
  description: string;
  amount: number;
  direction: Direction;
  bankAccountId?: number;
  transaction?: FloatTransaction;
  bankTransaction?: BankTransaction;
  transactionGroupId?: string;
}

interface ClientLoan {
  id: number;
  branchId: number;
  branchName: string;
  clientName: string;
  clientPhone: string;
  currency: Currency;
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  totalReceivable: number;
  outstandingBalance: number;
  fundingSource: MoneySource;
  fundingBankAccountId?: number | null;
  fundingBankAccountName?: string | null;
  status: string;
  dateIssued: string;
  dueDate?: string | null;
  description?: string;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DayColumn {
  key: string;
  label: string;
  date: string;
}

interface SummaryRow {
  key: string;
  label: string;
  section?: 'INFLOW' | 'OUTFLOW';
  values: number[];
  total: number;
  bold?: boolean;
}

@Component({
  selector: 'app-new-financial-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-financial-transaction.html',
  styleUrl: './new-financial-transaction.css',
})
export class NewFinancialTransaction implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly masterService = inject(Master);

  readonly currencies: Currency[] = ['USD', 'ZIG', 'ZAR', 'EUR'];

  readonly expenseCategories: ExpenseCategory[] = [
    'AIRTIME',
    'TRANSPORT',
    'STATIONERY',
    'RENT',
    'INTERNET',
    'BANK_CHARGES',
    'UTILITIES',
    'REPAIRS',
    'STAFF_WELFARE',
    'OTHER',
  ];

  readonly revenueCategories: RevenueCategory[] = [
    'SERVICE_FEE',
    'COMMISSION',
    'EXCHANGE_GAIN',
    'INTEREST_INCOME',
    'PENALTY',
    'CAPITAL_INJECTION',
    'OTHER',
  ];

  readonly daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  branchId: number | null = null;
  selectedBranch: Branch | null = null;
  branchFloat: BranchFloat | null = null;
  account: BranchFloat | null = null;

  selectedCurrency: Currency = 'USD';
  selectedWeekStart = this.getMonday(new Date());

  days: DayColumn[] = [];

  bankAccounts: BankAccount[] = [];
  filteredBankAccounts: BankAccount[] = [];
  branches: Branch[] = [];

  floatTransactions: FloatTransaction[] = [];
  bankTransactions: BankTransaction[] = [];

  loanReceivedTransactions: FloatTransaction[] = [];
  loanRepaymentTransactions: FloatTransaction[] = [];
  clientLoanRepaymentTransactions: FloatTransaction[] = [];

  clientLoans: ClientLoan[] = [];

  displayTransactions: DisplayTransaction[] = [];
  summaryRows: SummaryRow[] = [];

  loading = false;
  saving = false;

  errorMessage = '';
  error = '';

  showTransactionForm = false;
  selectedTransactionType: TransactionType | null = null;
  formTitle = '';

  transactionForm = this.createEmptyForm();

  ngOnInit(): void {
    this.branchId = this.getBranchId();
    this.buildWeek();

    if (!this.branchId) {
      this.errorMessage = 'Branch ID was not found in localStorage.';
      return;
    }

    this.loadInitialData();
    this.loadBranchFloat(this.branchId);
  }

  loadBranchFloat(branchId: number): void {
    this.loading = true;
    this.error = '';

    const url = this.masterService.getBackendService() + `api/v1/branch-floats/branch/${branchId}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        const accounts: BranchFloat[] = response?.data ?? [];

        this.branchFloat =
          accounts.find((item) => item.currency === this.selectedCurrency && item.active) ?? null;

        this.account = this.branchFloat;
        this.loading = false;

        if (!this.branchFloat) {
          this.error = `No active ${this.selectedCurrency} branch float account was found.`;
        }
      },
      error: (err) => {
        console.error('Failed to load branch float:', err);

        this.error = err?.error?.message || 'Failed to load branch float account.';
        this.branchFloat = null;
        this.account = null;
        this.loading = false;
      },
    });
  }

  private loadInitialData(): void {
    this.loading = true;
    this.errorMessage = '';

    const baseUrl = this.masterService.getBackendService();

    forkJoin({
      branches: this.http.get<any>(`${baseUrl}api/v1/branches/active`),
      bankAccounts: this.http.get<any>(`${baseUrl}api/v1/bank-accounts/active`),
    }).subscribe({
      next: (response) => {
        this.branches = response.branches?.data ?? [];
        this.bankAccounts = response.bankAccounts?.data ?? [];

        this.selectedBranch =
          this.branches.find((branch) => Number(branch.id) === Number(this.branchId)) ?? null;

        this.filterBankAccounts();
        this.loadWeekData();
      },
      error: (error) => {
        console.error('Failed to load initial financial data', error);

        this.errorMessage = error?.error?.message || 'Failed to load financial transaction data.';
        this.loading = false;
      },
    });
  }

  private loadWeekData(): void {
    if (!this.branchId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const baseUrl = this.masterService.getBackendService();

    this.http
      .get<any>(
        `${baseUrl}api/v1/money-movements/transfers/branch/${this.branchId}/currency/${this.selectedCurrency}`,
      )
      .pipe(
        catchError((error) => {
          console.error('Failed to load money movement transactions', error);
          return of({data: {floatTransactions: [], bankTransactions: []}});
        }),
      )
      .subscribe({
        next: (response) => {
          const data: BranchCurrencyTransactionsResponse = response?.data ?? {
            branchId: this.branchId,
            currency: this.selectedCurrency,
            floatTransactions: [],
            bankTransactions: [],
          };

          this.floatTransactions = this.sortFloatTransactions(
            (data.floatTransactions ?? []).filter(
              (transaction) =>
                this.isDateInsideCurrentWeek(transaction.transactionDate) &&
                (!transaction.status || transaction.status === 'POSTED'),
            ),
          );

          this.bankTransactions = this.sortBankTransactions(
            (data.bankTransactions ?? []).filter(
              (transaction) =>
                this.isDateInsideCurrentWeek(transaction.transactionDate) &&
                (!transaction.status || transaction.status === 'POSTED'),
            ),
          );

          this.loadLoanTransactions();
        },
      });
  }

  private loadLoanTransactions(): void {
    if (!this.branchId) {
      return;
    }

    const baseUrl = this.masterService.getBackendService();

    forkJoin({
      received: this.http
        .get<any>(
          `${baseUrl}api/v1/money-movements/float/loans-received/branch/${this.branchId}/currency/${this.selectedCurrency}`,
        )
        .pipe(
          catchError((error) => {
            console.error('Failed to load loan received transactions', error);
            return of({data: []});
          }),
        ),
      repayments: this.http
        .get<any>(
          `${baseUrl}api/v1/money-movements/float/loan-repayments/branch/${this.branchId}/currency/${this.selectedCurrency}`,
        )
        .pipe(
          catchError((error) => {
            console.error('Failed to load loan repayment transactions', error);
            return of({data: []});
          }),
        ),
      clientLoanRepayments: this.http
        .get<any>(
          `${baseUrl}api/v1/money-movements/float/client-loan-repayments/branch/${this.branchId}/currency/${this.selectedCurrency}`,
        )
        .pipe(
          catchError((error) => {
            console.error('Failed to load client loan repayment transactions', error);
            return of({data: []});
          }),
        ),
    }).subscribe({
      next: (response) => {
        this.loanReceivedTransactions = this.prepareLoanTransactions(response.received?.data ?? []);
        this.loanRepaymentTransactions = this.prepareLoanTransactions(response.repayments?.data ?? []);
        this.clientLoanRepaymentTransactions = this.prepareLoanTransactions(
          response.clientLoanRepayments?.data ?? [],
        );

        this.loadClientLoans();
      },
      error: (error) => {
        console.error('Failed to load loan transactions', error);

        this.loanReceivedTransactions = [];
        this.loanRepaymentTransactions = [];
        this.clientLoanRepaymentTransactions = [];

        this.loadClientLoans();
      },
    });
  }

  private prepareLoanTransactions(transactions: FloatTransaction[]): FloatTransaction[] {
    const map = new Map<number, FloatTransaction>();

    for (const transaction of transactions) {
      if (transaction.status && transaction.status !== 'POSTED') {
        continue;
      }

      if (!this.isDateInsideCurrentWeek(transaction.transactionDate)) {
        continue;
      }

      const id = Number(transaction.id);

      if (!map.has(id)) {
        map.set(id, transaction);
      }
    }

    return this.sortFloatTransactions(Array.from(map.values()));
  }

  private loadClientLoans(): void {
    if (!this.branchId) {
      return;
    }

    const baseUrl = this.masterService.getBackendService();

    this.http
      .get<any>(
        `${baseUrl}api/v1/client-loans/branch/${this.branchId}/currency/${this.selectedCurrency}`,
      )
      .subscribe({
        next: (response) => {
          const data: ClientLoan[] = response?.data ?? [];

          this.clientLoans = data.filter(
            (loan) =>
              loan.currency === this.selectedCurrency &&
              Number(loan.branchId) === Number(this.branchId),
          );

          this.filterBankAccounts();
          this.buildDisplayTransactions();
          this.buildSummary();

          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load client loans', error);

          this.clientLoans = [];

          this.filterBankAccounts();
          this.buildDisplayTransactions();
          this.buildSummary();

          this.loading = false;
        },
      });
  }

  private buildDisplayTransactions(): void {
    const result: DisplayTransaction[] = [];

    for (const transaction of this.floatTransactions) {
      if (
        transaction.transactionType === 'LOAN_RECEIVED' ||
        transaction.transactionType === 'LOAN_REPAYMENT' ||
        transaction.transactionType === 'CLIENT_LOAN_REPAYMENT'
      ) {
        continue;
      }

      let context = '';
      let bankAccountId: number | undefined;

      if (
        transaction.transactionType === 'BANK_WITHDRAWAL' ||
        transaction.transactionType === 'BANK_DEPOSIT' ||
        transaction.transactionType === 'TRANSFER_IN' ||
        transaction.transactionType === 'TRANSFER_OUT'
      ) {
        const bankTransaction = this.findBankTransaction(transaction);

        if (bankTransaction) {
          context =
            `${bankTransaction.bankName} — ` +
            `${bankTransaction.accountName} — ` +
            `${bankTransaction.accountNumber}`;

          bankAccountId = bankTransaction.bankAccountId;
        } else {
          context = transaction.branchName || transaction.branchCode || 'Money movement';
        }
      } else if (
        transaction.transactionType === 'BRANCH_TRANSFER_IN' ||
        transaction.transactionType === 'BRANCH_TRANSFER_OUT'
      ) {
        context = transaction.branchName || transaction.branchCode || 'Branch transfer';
      } else if (transaction.transactionType === 'EXPENSE') {
        context = 'Branch Float';
      } else if (transaction.transactionType === 'REVENUE_RECEIPT') {
        context = 'Branch Float';
      } else if (
        transaction.transactionType === 'CURRENCY_EXCHANGE_IN' ||
        transaction.transactionType === 'CURRENCY_EXCHANGE_OUT'
      ) {
        context = 'Currency Exchange';
      } else {
        context = 'Branch Float';
      }

      result.push({
        id: `FLOAT-${transaction.id}`,
        date: transaction.transactionDate,
        type: transaction.transactionType,
        typeLabel: this.transactionTypeLabel(transaction.transactionType),
        context,
        reference: transaction.reference || '',
        description: transaction.description || '',
        amount: Number(transaction.amount || 0),
        direction: transaction.direction,
        bankAccountId,
        transaction,
        transactionGroupId: transaction.transactionGroupId,
      });
    }

    for (const transaction of this.bankTransactions) {
      if (
        transaction.transactionType !== 'REVENUE_RECEIPT' &&
        transaction.transactionType !== 'TRANSFER_IN' &&
        transaction.transactionType !== 'TRANSFER_OUT' &&
        transaction.transactionType !== 'CURRENCY_EXCHANGE_IN' &&
        transaction.transactionType !== 'CURRENCY_EXCHANGE_OUT'
      ) {
        continue;
      }

      const hasFloatSide =
        transaction.transactionGroupId &&
        this.floatTransactions.some(
          (floatTransaction) =>
            floatTransaction.transactionGroupId === transaction.transactionGroupId,
        );

      if (
        hasFloatSide &&
        (transaction.transactionType === 'TRANSFER_IN' ||
          transaction.transactionType === 'TRANSFER_OUT' ||
          transaction.transactionType === 'CURRENCY_EXCHANGE_IN' ||
          transaction.transactionType === 'CURRENCY_EXCHANGE_OUT')
      ) {
        continue;
      }

      result.push({
        id: `BANK-${transaction.transactionType}-${transaction.id}`,
        date: transaction.transactionDate,
        type: transaction.transactionType,
        typeLabel: this.transactionTypeLabel(transaction.transactionType),
        context:
          `${transaction.bankName} — ` +
          `${transaction.accountName} — ` +
          `${transaction.accountNumber}`,
        reference: transaction.reference || '',
        description: transaction.description || '',
        amount: Number(transaction.amount || 0),
        direction: transaction.direction,
        bankAccountId: transaction.bankAccountId,
        bankTransaction: transaction,
        transactionGroupId: transaction.transactionGroupId,
      });
    }

    for (const transaction of this.loanReceivedTransactions) {
      result.push({
        id: `LOAN-RECEIVED-${transaction.id}`,
        date: transaction.transactionDate,
        type: 'LOAN_RECEIVED',
        typeLabel: this.transactionTypeLabel('LOAN_RECEIVED'),
        context: 'Loan Received',
        reference: transaction.reference || '',
        description: transaction.description || '',
        amount: Number(transaction.amount || 0),
        direction: 'IN',
        transaction,
        transactionGroupId: transaction.transactionGroupId,
      });
    }

    for (const transaction of this.loanRepaymentTransactions) {
      result.push({
        id: `LOAN-REPAYMENT-${transaction.id}`,
        date: transaction.transactionDate,
        type: 'LOAN_REPAYMENT',
        typeLabel: this.transactionTypeLabel('LOAN_REPAYMENT'),
        context: 'Loan Repayment',
        reference: transaction.reference || '',
        description: transaction.description || '',
        amount: Number(transaction.amount || 0),
        direction: 'OUT',
        transaction,
        transactionGroupId: transaction.transactionGroupId,
      });
    }

    for (const transaction of this.clientLoanRepaymentTransactions) {
      result.push({
        id: `CLIENT-LOAN-REPAYMENT-${transaction.id}`,
        date: transaction.transactionDate,
        type: 'CLIENT_LOAN_REPAYMENT',
        typeLabel: this.transactionTypeLabel('CLIENT_LOAN_REPAYMENT'),
        context: 'Client Loan Repayment',
        reference: transaction.reference || '',
        description: transaction.description || '',
        amount: Number(transaction.amount || 0),
        direction: 'IN',
        transaction,
        transactionGroupId: transaction.transactionGroupId,
      });
    }

    this.displayTransactions = result.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.id.localeCompare(b.id);
    });
  }

  private findBankTransaction(floatTransaction: FloatTransaction): BankTransaction | undefined {
    if (floatTransaction.transactionGroupId) {
      const groupMatch = this.bankTransactions.find(
        (bank) => bank.transactionGroupId === floatTransaction.transactionGroupId,
      );

      if (groupMatch) {
        return groupMatch;
      }
    }

    const expectedType =
      floatTransaction.transactionType === 'BANK_WITHDRAWAL'
        ? 'CASH_WITHDRAWAL'
        : floatTransaction.transactionType === 'BANK_DEPOSIT'
          ? 'CASH_DEPOSIT'
          : floatTransaction.transactionType === 'TRANSFER_IN'
            ? 'TRANSFER_OUT'
            : floatTransaction.transactionType === 'TRANSFER_OUT'
              ? 'TRANSFER_IN'
              : floatTransaction.transactionType === 'CURRENCY_EXCHANGE_IN'
                ? 'CURRENCY_EXCHANGE_OUT'
                : floatTransaction.transactionType === 'CURRENCY_EXCHANGE_OUT'
                  ? 'CURRENCY_EXCHANGE_IN'
                  : '';

    let matches = this.bankTransactions.filter(
      (bank) =>
        (!expectedType || bank.transactionType === expectedType) &&
        bank.currency === this.selectedCurrency &&
        bank.transactionDate === floatTransaction.transactionDate &&
        Number(bank.amount) === Number(floatTransaction.amount),
    );

    if (floatTransaction.reference) {
      const referenceMatches = matches.filter((bank) => bank.reference === floatTransaction.reference);

      if (referenceMatches.length > 0) {
        matches = referenceMatches;
      }
    }

    return matches[0];
  }

  get withdrawalTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'BANK_DEPOSIT');
  }

  get depositTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'BANK_WITHDRAWAL');
  }

  get floatTransferTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter(
      (transaction) =>
        transaction.type === 'BRANCH_TRANSFER_IN' || transaction.type === 'BRANCH_TRANSFER_OUT',
    );
  }

  get moneyMovementTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter(
      (transaction) => transaction.type === 'TRANSFER_IN' || transaction.type === 'TRANSFER_OUT',
    );
  }

  get currencyExchangeTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter(
      (transaction) =>
        transaction.type === 'CURRENCY_EXCHANGE_IN' ||
        transaction.type === 'CURRENCY_EXCHANGE_OUT',
    );
  }

  get expenseTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'EXPENSE');
  }

  get revenueTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'REVENUE_RECEIPT');
  }

  get loanReceivedDisplayTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'LOAN_RECEIVED');
  }

  get loanRepaymentDisplayTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'LOAN_REPAYMENT');
  }

  get clientLoanRepaymentDisplayTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter(
      (transaction) => transaction.type === 'CLIENT_LOAN_REPAYMENT',
    );
  }

  getBankDailyTotal(
    transactions: DisplayTransaction[],
    bankAccountId: number,
    date: string,
  ): number {
    return transactions
      .filter(
        (transaction) => transaction.bankAccountId === bankAccountId && transaction.date === date,
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  getBankWeeklyTotal(transactions: DisplayTransaction[], bankAccountId: number): number {
    return transactions
      .filter((transaction) => transaction.bankAccountId === bankAccountId)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  getSectionDayTotal(transactions: DisplayTransaction[], date: string): number {
    return transactions
      .filter((transaction) => transaction.date === date)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  getSectionTotal(transactions: DisplayTransaction[]): number {
    return transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get clientLoansFromFloat(): ClientLoan[] {
    return this.clientLoans.filter((loan) => loan.fundingSource === 'BRANCH_FLOAT');
  }

  get clientLoansFromBank(): ClientLoan[] {
    return this.clientLoans.filter((loan) => loan.fundingSource === 'BANK_ACCOUNT');
  }

  getClientLoanReceivedAmount(loan: ClientLoan): number {
    const totalReceivable = Number(loan.totalReceivable || 0);
    const outstandingBalance = Number(loan.outstandingBalance || 0);

    return Math.max(0, totalReceivable - outstandingBalance);
  }

  getClientLoanIssuedTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.principalAmount || 0),
      0,
    );
  }

  getClientLoanReceivedTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + this.getClientLoanReceivedAmount(loan),
      0,
    );
  }

  getClientLoanOutstandingTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.outstandingBalance || 0),
      0,
    );
  }

  getClientLoanPrincipalTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.principalAmount || 0),
      0,
    );
  }

  getClientLoanInterestTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.interestAmount || 0),
      0,
    );
  }

  getClientLoanReceivableTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.totalReceivable || 0),
      0,
    );
  }

  private getClientLoansIssuedForDate(date: string): number {
    return this.clientLoansFromFloat
      .filter((loan) => loan.dateIssued === date)
      .reduce((sum, loan) => sum + Number(loan.principalAmount || 0), 0);
  }

  private getClientLoanRepaymentsForDate(date: string): number {
    return this.clientLoanRepaymentTransactions
      .filter((transaction) => transaction.transactionDate === date)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  private buildSummary(): void {
    const rows: SummaryRow[] = [];

    const openingValues: number[] = [];

    const customerDepositValues: number[] = [];
    const transferInValues: number[] = [];
    const moneyMovementInValues: number[] = [];
    const exchangeInValues: number[] = [];
    const revenueValues: number[] = [];
    const loanReceivedValues: number[] = [];
    const clientLoanRepaymentValues: number[] = [];

    const customerWithdrawalValues: number[] = [];
    const transferOutValues: number[] = [];
    const moneyMovementOutValues: number[] = [];
    const exchangeOutValues: number[] = [];
    const expenseValues: number[] = [];
    const loanRepaymentValues: number[] = [];
    const clientLoanIssuedValues: number[] = [];

    let previousClosing: number | null = null;

    this.days.forEach((day, index) => {
      const dayTransactions = this.floatTransactions.filter(
        (transaction) => transaction.transactionDate === day.date,
      );

      const clientLoansIssued = this.getClientLoansIssuedForDate(day.date);
      const clientLoanRepayments = this.getClientLoanRepaymentsForDate(day.date);

      const opening = this.calculateOpeningBalance(
        day.date,
        dayTransactions,
        previousClosing,
        index,
      );

      const customerDeposits = this.sumTransactions(dayTransactions, 'BANK_WITHDRAWAL', 'IN');
      const transfersIn = this.sumTransactions(dayTransactions, 'BRANCH_TRANSFER_IN', 'IN');
      const moneyMovementIn = this.sumTransactions(dayTransactions, 'TRANSFER_IN', 'IN');
      const exchangeIn = this.sumTransactions(dayTransactions, 'CURRENCY_EXCHANGE_IN', 'IN');
      const loansReceived = this.sumLoanTransactions(this.loanReceivedTransactions, day.date);
      const revenue = this.sumTransactions(dayTransactions, 'REVENUE_RECEIPT', 'IN');

      const customerWithdrawals = this.sumTransactions(dayTransactions, 'BANK_DEPOSIT', 'OUT');
      const transfersOut = this.sumTransactions(dayTransactions, 'BRANCH_TRANSFER_OUT', 'OUT');
      const moneyMovementOut = this.sumTransactions(dayTransactions, 'TRANSFER_OUT', 'OUT');
      const exchangeOut = this.sumTransactions(dayTransactions, 'CURRENCY_EXCHANGE_OUT', 'OUT');
      const loanRepayments = this.sumLoanTransactions(this.loanRepaymentTransactions, day.date);
      const expenses = this.sumTransactions(dayTransactions, 'EXPENSE', 'OUT');

      const totalInflow =
        customerDeposits +
        transfersIn +
        moneyMovementIn +
        exchangeIn +
        loansReceived +
        clientLoanRepayments +
        revenue;

      const totalOutflow =
        customerWithdrawals +
        transfersOut +
        moneyMovementOut +
        exchangeOut +
        loanRepayments +
        clientLoansIssued +
        expenses;

      const closing = opening + totalInflow - totalOutflow;

      openingValues.push(opening);

      customerDepositValues.push(customerDeposits);
      transferInValues.push(transfersIn);
      moneyMovementInValues.push(moneyMovementIn);
      exchangeInValues.push(exchangeIn);
      revenueValues.push(revenue);
      loanReceivedValues.push(loansReceived);
      clientLoanRepaymentValues.push(clientLoanRepayments);

      customerWithdrawalValues.push(customerWithdrawals);
      transferOutValues.push(transfersOut);
      moneyMovementOutValues.push(moneyMovementOut);
      exchangeOutValues.push(exchangeOut);
      expenseValues.push(expenses);
      loanRepaymentValues.push(loanRepayments);
      clientLoanIssuedValues.push(clientLoansIssued);

      previousClosing = closing;
    });

    rows.push({
      key: 'opening',
      label: 'OPENING BALANCE',
      values: openingValues,
      total: openingValues[0] ?? 0,
      bold: true,
    });

    rows.push({
      key: 'customerDeposits',
      label: 'CUSTOMER DEPOSITS',
      values: customerDepositValues,
      total: this.total(customerDepositValues),
    });

    rows.push({
      key: 'transferIn',
      label: 'FLOAT TRANSFERS IN',
      values: transferInValues,
      total: this.total(transferInValues),
    });

    rows.push({
      key: 'moneyMovementIn',
      label: 'MONEY MOVEMENT IN',
      values: moneyMovementInValues,
      total: this.total(moneyMovementInValues),
    });

    rows.push({
      key: 'exchangeIn',
      label: 'CURRENCY EXCHANGE IN',
      values: exchangeInValues,
      total: this.total(exchangeInValues),
    });

    rows.push({
      key: 'loanReceived',
      label: 'LOANS RECEIVED',
      values: loanReceivedValues,
      total: this.total(loanReceivedValues),
    });

    rows.push({
      key: 'clientLoanRepayment',
      label: 'CLIENT LOAN REPAYMENTS',
      values: clientLoanRepaymentValues,
      total: this.total(clientLoanRepaymentValues),
    });

    rows.push({
      key: 'revenue',
      label: 'REVENUE',
      values: revenueValues,
      total: this.total(revenueValues),
    });

    const totalInflowValues = this.sumArrays([
      customerDepositValues,
      transferInValues,
      moneyMovementInValues,
      exchangeInValues,
      loanReceivedValues,
      clientLoanRepaymentValues,
      revenueValues,
    ]);

    rows.push({
      key: 'totalInflow',
      label: 'TOTAL INFLOW',
      values: totalInflowValues,
      total: this.total(totalInflowValues),
      bold: true,
    });

    rows.push({
      key: 'customerWithdrawals',
      label: 'CUSTOMER WITHDRAWALS',
      values: customerWithdrawalValues,
      total: this.total(customerWithdrawalValues),
    });

    rows.push({
      key: 'transferOut',
      label: 'FLOAT TRANSFERS OUT',
      values: transferOutValues,
      total: this.total(transferOutValues),
    });

    rows.push({
      key: 'moneyMovementOut',
      label: 'MONEY MOVEMENT OUT',
      values: moneyMovementOutValues,
      total: this.total(moneyMovementOutValues),
    });

    rows.push({
      key: 'exchangeOut',
      label: 'CURRENCY EXCHANGE OUT',
      values: exchangeOutValues,
      total: this.total(exchangeOutValues),
    });

    rows.push({
      key: 'clientLoanIssued',
      label: 'CLIENT LOANS ISSUED',
      values: clientLoanIssuedValues,
      total: this.total(clientLoanIssuedValues),
    });

    rows.push({
      key: 'loanRepayment',
      label: 'LOAN REPAYMENTS',
      values: loanRepaymentValues,
      total: this.total(loanRepaymentValues),
    });

    rows.push({
      key: 'expenses',
      label: 'EXPENSES',
      values: expenseValues,
      total: this.total(expenseValues),
    });

    const totalOutflowValues = this.sumArrays([
      customerWithdrawalValues,
      transferOutValues,
      moneyMovementOutValues,
      exchangeOutValues,
      loanRepaymentValues,
      clientLoanIssuedValues,
      expenseValues,
    ]);

    rows.push({
      key: 'totalOutflow',
      label: 'TOTAL OUTFLOW',
      values: totalOutflowValues,
      total: this.total(totalOutflowValues),
      bold: true,
    });

    const closingValues: number[] = [];

    for (let i = 0; i < this.days.length; i++) {
      const opening = openingValues[i] ?? 0;
      const closing = opening + (totalInflowValues[i] ?? 0) - (totalOutflowValues[i] ?? 0);

      closingValues.push(closing);
    }

    rows.push({
      key: 'closing',
      label: 'CLOSING BALANCE',
      values: closingValues,
      total: closingValues[closingValues.length - 1] ?? 0,
      bold: true,
    });

    rows.push({
      key: 'cashCount',
      label: 'CASH COUNT BALANCE',
      values: closingValues,
      total: closingValues[closingValues.length - 1] ?? 0,
      bold: true,
    });

    this.summaryRows = rows;
  }

  private calculateOpeningBalance(
    date: string,
    transactions: FloatTransaction[],
    previousClosing: number | null,
    index: number,
  ): number {
    const explicitOpening = transactions.find(
      (transaction) => transaction.transactionType === 'OPENING_BALANCE',
    );

    if (explicitOpening) {
      return Number(explicitOpening.amount || 0);
    }

    if (transactions.length > 0) {
      const sorted = this.sortFloatTransactions(transactions);
      const last = sorted[sorted.length - 1];

      const totalIn = sorted
        .filter((transaction) => transaction.direction === 'IN')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const totalOut = sorted
        .filter((transaction) => transaction.direction === 'OUT')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      if (last.balanceAfter !== undefined) {
        return Number(last.balanceAfter) - totalIn + totalOut;
      }
    }

    if (previousClosing !== null) {
      return previousClosing;
    }

    if (index === 0 && this.branchFloat) {
      return Number(this.branchFloat.currentBalance || 0);
    }

    return 0;
  }

  private sumTransactions(
    transactions: FloatTransaction[],
    type: string,
    direction: Direction,
  ): number {
    return transactions
      .filter(
        (transaction) =>
          transaction.transactionType === type && transaction.direction === direction,
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  private sumLoanTransactions(transactions: FloatTransaction[], date: string): number {
    return transactions
      .filter(
        (transaction) =>
          transaction.transactionDate === date &&
          (!transaction.status || transaction.status === 'POSTED'),
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  openTransactionForm(type: TransactionType, bankAccountId?: number): void {
    this.selectedTransactionType = type;
    this.transactionForm = this.createEmptyForm();
    this.transactionForm.date = this.formatDateForInput(new Date());

    if (bankAccountId) {
      this.transactionForm.bankAccountId = bankAccountId;
      this.transactionForm.toBankAccountId = bankAccountId;
      this.transactionForm.fromBankAccountId = bankAccountId;
    }

    switch (type) {
      case 'BANK_WITHDRAWAL':
        this.formTitle = 'Customer Withdrawal — Cash Out, Bank In';
        break;

      case 'BANK_DEPOSIT':
        this.formTitle = 'Customer Deposit — Cash In, Bank Out';
        break;

      case 'FLOAT_TRANSFER':
        this.formTitle = 'Float Transfer';
        break;

      case 'MONEY_MOVEMENT':
        this.formTitle = 'Money Movement';
        break;

      case 'CURRENCY_EXCHANGE':
        this.formTitle = 'Currency Exchange';
        break;

      case 'EXPENSE':
        this.formTitle = 'Expense';
        break;

      case 'REVENUE':
        this.formTitle = 'Revenue';
        break;

      case 'OPENING_BALANCE':
        this.formTitle = 'Opening Balance';
        break;
    }

    this.showTransactionForm = true;
  }

  closeTransactionForm(): void {
    if (this.saving) {
      return;
    }

    this.showTransactionForm = false;
    this.selectedTransactionType = null;
    this.formTitle = '';
  }

  saveTransaction(): void {
    if (!this.selectedTransactionType || !this.branchId) {
      return;
    }

    if (!this.transactionForm.date) {
      this.errorMessage = 'Transaction date is required.';
      return;
    }

    if (!this.transactionForm.amount && this.selectedTransactionType !== 'CURRENCY_EXCHANGE') {
      this.errorMessage = 'Amount is required.';
      return;
    }

    if (this.selectedTransactionType === 'MONEY_MOVEMENT') {
      if (!this.transactionForm.fromType || !this.transactionForm.toType) {
        this.errorMessage = 'Source and destination are required.';
        return;
      }

      if (
        this.transactionForm.fromType === 'BRANCH_FLOAT' &&
        !this.transactionForm.fromBranchId
      ) {
        this.errorMessage = 'Source branch is required.';
        return;
      }

      if (
        this.transactionForm.fromType === 'BANK_ACCOUNT' &&
        !this.transactionForm.fromBankAccountId
      ) {
        this.errorMessage = 'Source bank account is required.';
        return;
      }

      if (this.transactionForm.toType === 'BRANCH_FLOAT' && !this.transactionForm.toBranchId) {
        this.errorMessage = 'Destination branch is required.';
        return;
      }

      if (
        this.transactionForm.toType === 'BANK_ACCOUNT' &&
        !this.transactionForm.toBankAccountId
      ) {
        this.errorMessage = 'Destination bank account is required.';
        return;
      }

      if (
        this.transactionForm.fromType === 'BRANCH_FLOAT' &&
        this.transactionForm.toType === 'BRANCH_FLOAT' &&
        Number(this.transactionForm.fromBranchId) === Number(this.transactionForm.toBranchId)
      ) {
        this.errorMessage = 'Cannot transfer between the same branch float account.';
        return;
      }

      if (
        this.transactionForm.fromType === 'BANK_ACCOUNT' &&
        this.transactionForm.toType === 'BANK_ACCOUNT' &&
        Number(this.transactionForm.fromBankAccountId) ===
        Number(this.transactionForm.toBankAccountId)
      ) {
        this.errorMessage = 'Cannot transfer between the same bank account.';
        return;
      }
    }

    if (this.selectedTransactionType === 'CURRENCY_EXCHANGE') {
      if (!this.transactionForm.receivedAmount) {
        this.errorMessage = 'Received amount is required.';
        return;
      }

      if (!this.transactionForm.paidAmount) {
        this.errorMessage = 'Paid amount is required.';
        return;
      }

      if (!this.transactionForm.exchangeRate) {
        this.errorMessage = 'Exchange rate is required.';
        return;
      }

      if (this.transactionForm.receivedCurrency === this.transactionForm.paidCurrency) {
        this.errorMessage = 'Received currency and paid currency cannot be the same.';
        return;
      }

      if (
        this.transactionForm.receivedTo === 'BANK_ACCOUNT' &&
        !this.transactionForm.receivedBankAccountId
      ) {
        this.errorMessage = 'Received bank account is required.';
        return;
      }

      if (
        this.transactionForm.paidFrom === 'BANK_ACCOUNT' &&
        !this.transactionForm.paidBankAccountId
      ) {
        this.errorMessage = 'Paid bank account is required.';
        return;
      }
    }

    if (
      this.selectedTransactionType === 'REVENUE' &&
      this.transactionForm.source === 'BANK_ACCOUNT' &&
      !this.transactionForm.bankAccountId
    ) {
      this.errorMessage = 'Bank account is required when revenue source is bank account.';
      return;
    }

    const endpoint = this.getSaveEndpoint();

    if (!endpoint) {
      this.errorMessage = 'Invalid transaction type.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload = this.buildPayload();
    const baseUrl = this.masterService.getBackendService();

    this.http.post(`${baseUrl}${endpoint}`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showTransactionForm = false;
        this.selectedTransactionType = null;

        if (this.branchId) {
          this.loadBranchFloat(this.branchId);
        }

        this.loadWeekData();
      },
      error: (error) => {
        console.error('Failed to save transaction', error);

        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to save transaction.';
      },
    });
  }

  calculatePaidAmount(): void {
    // Paid amount is entered manually because exchange direction/rate basis can vary.
    // Keep this method for template compatibility.
  }

  private buildPayload(): any {
    const actionedBy = localStorage.getItem('username') || '';
    const form = this.transactionForm;

    switch (this.selectedTransactionType) {
      case 'BANK_WITHDRAWAL':
      case 'BANK_DEPOSIT':
        return {
          branchId: this.branchId,
          currency: this.selectedCurrency,
          bankAccountId: form.bankAccountId,
          amount: Number(form.amount),
          transactionDate: form.date,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'FLOAT_TRANSFER':
        return {
          fromBranchId: this.branchId,
          toBranchId: form.toBranchId,
          currency: this.selectedCurrency,
          amount: Number(form.amount),
          transactionDate: form.date,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'MONEY_MOVEMENT':
        return {
          fromType: form.fromType,
          fromBranchId: form.fromType === 'BRANCH_FLOAT' ? form.fromBranchId : form.fromBranchId,
          fromBankAccountId:
            form.fromType === 'BANK_ACCOUNT' ? form.fromBankAccountId : null,
          toType: form.toType,
          toBranchId: form.toType === 'BRANCH_FLOAT' ? form.toBranchId : form.toBranchId,
          toBankAccountId: form.toType === 'BANK_ACCOUNT' ? form.toBankAccountId : null,
          currency: this.selectedCurrency,
          amount: Number(form.amount),
          transactionDate: form.date,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'CURRENCY_EXCHANGE':
        return {
          branchId: this.branchId,
          receivedCurrency: form.receivedCurrency,
          receivedAmount: Number(form.receivedAmount),
          receivedTo: form.receivedTo,
          receivedBankAccountId:
            form.receivedTo === 'BANK_ACCOUNT' ? form.receivedBankAccountId : null,
          paidCurrency: form.paidCurrency,
          paidAmount: Number(form.paidAmount),
          exchangeRate: Number(form.exchangeRate),
          paidFrom: form.paidFrom,
          paidBankAccountId:
            form.paidFrom === 'BANK_ACCOUNT' ? form.paidBankAccountId : null,
          transactionDate: form.date,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'EXPENSE':
        return {
          branchId: this.branchId,
          currency: this.selectedCurrency,
          paymentSource: form.paymentSource,
          bankAccountId: form.paymentSource === 'BANK_ACCOUNT' ? form.bankAccountId : null,
          amount: Number(form.amount),
          transactionDate: form.date,
          category: form.category,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'REVENUE':
        return {
          branchId: this.branchId,
          currency: this.selectedCurrency,
          source: form.source,
          bankAccountId: form.source === 'BANK_ACCOUNT' ? form.bankAccountId : null,
          amount: Number(form.amount),
          revenueDate: form.date,
          category: form.revenueCategory,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'OPENING_BALANCE':
        return {
          branchId: this.branchId,
          currency: this.selectedCurrency,
          amount: Number(form.amount),
          transactionDate: form.date,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      default:
        return {};
    }
  }

  private getSaveEndpoint(): string {
    switch (this.selectedTransactionType) {
      case 'BANK_WITHDRAWAL':
        return 'api/v1/money-movements/float-to-bank';

      case 'BANK_DEPOSIT':
        return 'api/v1/money-movements/bank-to-float';

      case 'FLOAT_TRANSFER':
        return 'api/v1/money-movements/float-transfer';

      case 'MONEY_MOVEMENT':
        return 'api/v1/money-movements/transfers';

      case 'CURRENCY_EXCHANGE':
        return 'api/v1/money-movements/currency-exchange';

      case 'EXPENSE':
        return this.transactionForm.paymentSource === 'BANK_ACCOUNT'
          ? 'api/v1/money-movements/expense/from-bank'
          : 'api/v1/money-movements/expense/from-float';

      case 'REVENUE':
        return 'api/v1/money-movements/revenue';

      case 'OPENING_BALANCE':
        return 'api/v1/money-movements/float/opening-balance';

      default:
        return '';
    }
  }

  buildWeek(): void {
    const monday = new Date(this.selectedWeekStart);

    this.days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);

      date.setDate(monday.getDate() + i);

      this.days.push({
        key: this.daysOfWeek[i],
        label: `${this.daysOfWeek[i]} ${this.formatDisplayDate(date)}`,
        date: this.formatDateForInput(date),
      });
    }
  }

  previousWeek(): void {
    const date = new Date(this.selectedWeekStart);

    date.setDate(date.getDate() - 7);

    this.selectedWeekStart = date;

    this.buildWeek();
    this.loadWeekData();
  }

  nextWeek(): void {
    const date = new Date(this.selectedWeekStart);

    date.setDate(date.getDate() + 7);

    this.selectedWeekStart = date;

    this.buildWeek();
    this.loadWeekData();
  }

  currentWeek(): void {
    this.selectedWeekStart = this.getMonday(new Date());

    this.buildWeek();
    this.loadWeekData();
  }

  onCurrencyChange(): void {
    this.filterBankAccounts();

    if (this.branchId) {
      this.loadBranchFloat(this.branchId);
    }

    this.loadWeekData();
  }

  onMoneyMovementFromTypeChange(): void {
    this.transactionForm.fromBranchId =
      this.transactionForm.fromType === 'BRANCH_FLOAT'
        ? this.branchId
        : this.transactionForm.fromBranchId;

    if (this.transactionForm.fromType === 'BRANCH_FLOAT') {
      this.transactionForm.fromBankAccountId = null;
    } else {
      this.transactionForm.fromBranchId = this.branchId;
    }
  }

  onMoneyMovementToTypeChange(): void {
    if (this.transactionForm.toType === 'BANK_ACCOUNT') {
      this.transactionForm.toBranchId = this.branchId;
    } else {
      this.transactionForm.toBankAccountId = null;
    }
  }

  private getBranchId(): number | null {
    const value = localStorage.getItem('branchId');

    if (!value) {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private createEmptyForm(): any {
    return {
      date: '',
      bankAccountId: null,
      toBranchId: null,
      amount: null,

      fromType: 'BRANCH_FLOAT' as MoneySource,
      fromBranchId: this.branchId,
      fromBankAccountId: null,
      toType: 'BANK_ACCOUNT' as MoneySource,
      toBankAccountId: null,

      receivedCurrency: this.selectedCurrency,
      receivedAmount: null,
      receivedTo: 'BRANCH_FLOAT' as MoneySource,
      receivedBankAccountId: null,

      paidCurrency: this.selectedCurrency === 'USD' ? 'ZIG' : 'USD',
      paidAmount: null,
      exchangeRate: null,
      paidFrom: 'BRANCH_FLOAT' as MoneySource,
      paidBankAccountId: null,

      paymentSource: 'BRANCH_FLOAT' as MoneySource,

      source: 'BRANCH_FLOAT' as MoneySource,
      revenueCategory: 'SERVICE_FEE' as RevenueCategory,

      category: 'OTHER' as ExpenseCategory,

      reference: '',
      description: '',
    };
  }

  private getMonday(date: Date): Date {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);

    return result;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatDisplayDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}`;
  }

  private isDateInsideCurrentWeek(date: string): boolean {
    return this.days.some((day) => day.date === date);
  }

  private sortFloatTransactions(transactions: FloatTransaction[]): FloatTransaction[] {
    return [...transactions].sort((a, b) => {
      const dateCompare = a.transactionDate.localeCompare(b.transactionDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const aCreated = a.createdAt || '';
      const bCreated = b.createdAt || '';

      return aCreated.localeCompare(bCreated);
    });
  }

  private sortBankTransactions(transactions: BankTransaction[]): BankTransaction[] {
    return [...transactions].sort((a, b) => {
      const dateCompare = a.transactionDate.localeCompare(b.transactionDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const aCreated = a.createdAt || '';
      const bCreated = b.createdAt || '';

      return aCreated.localeCompare(bCreated);
    });
  }

  private total(values: number[]): number {
    return values.reduce((sum, value) => sum + Number(value || 0), 0);
  }

  private sumArrays(arrays: number[][]): number[] {
    return this.days.map((_, index) =>
      arrays.reduce((sum, array) => sum + Number(array[index] || 0), 0),
    );
  }

  transactionTypeLabel(type: string): string {
    switch (type) {
      case 'BANK_DEPOSIT':
        return 'Customer Withdrawal';

      case 'BANK_WITHDRAWAL':
        return 'Customer Deposit';

      case 'BRANCH_TRANSFER_IN':
        return 'Float Transfer In';

      case 'BRANCH_TRANSFER_OUT':
        return 'Float Transfer Out';

      case 'TRANSFER_IN':
        return 'Money Movement In';

      case 'TRANSFER_OUT':
        return 'Money Movement Out';

      case 'CASH_DEPOSIT':
        return 'Cash Deposit';

      case 'CASH_WITHDRAWAL':
        return 'Cash Withdrawal';

      case 'CURRENCY_EXCHANGE_IN':
        return 'Currency Exchange In';

      case 'CURRENCY_EXCHANGE_OUT':
        return 'Currency Exchange Out';

      case 'EXPENSE':
      case 'EXPENSE_PAYMENT':
        return 'Expense';

      case 'REVENUE_RECEIPT':
        return 'Revenue';

      case 'OPENING_BALANCE':
        return 'Opening Balance';

      case 'LOAN_RECEIVED':
        return 'Loan Received';

      case 'LOAN_REPAYMENT':
        return 'Loan Repayment';

      case 'CLIENT_LOAN_ISSUED':
        return 'Client Loan Issued';

      case 'CLIENT_LOAN_REPAYMENT':
        return 'Client Loan Repayment';

      case 'COMMISSION_RECEIVED':
      case 'COMMISSION_CREDIT':
        return 'Commission Received';

      case 'CASH_SALE_IN':
        return 'Cash Sale In';

      case 'CASH_SALE_OUT':
        return 'Cash Sale Out';

      default:
        return type;
    }
  }

  formatAmount(amount: number | null | undefined): string {
    return Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatBalance(balance: number): string {
    return Number(balance || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  getSummaryValue(row: SummaryRow, index: number): number {
    return row.values[index] ?? 0;
  }

  getTransactionAmountClass(transaction: DisplayTransaction): string {
    return transaction.direction === 'IN' ? 'amount-in' : 'amount-out';
  }

  getFormBankAccounts(): BankAccount[] {
    return this.filteredBankAccounts;
  }

  getBankAccountsByCurrency(currency: Currency): BankAccount[] {
    return this.bankAccounts.filter(
      (account) => account.active && account.currency === currency,
    );
  }

  getDestinationBranches(): Branch[] {
    return this.branches.filter(
      (branch) => branch.active && Number(branch.id) !== Number(this.branchId),
    );
  }

  filterBankAccounts(): void {
    this.filteredBankAccounts = this.bankAccounts.filter(
      (account) => account.active && account.currency === this.selectedCurrency,
    );
  }

  isBankTransactionForm(): boolean {
    return (
      this.selectedTransactionType === 'BANK_WITHDRAWAL' ||
      this.selectedTransactionType === 'BANK_DEPOSIT'
    );
  }

  isCurrencyExchangeForm(): boolean {
    return this.selectedTransactionType === 'CURRENCY_EXCHANGE';
  }

  isExpenseForm(): boolean {
    return this.selectedTransactionType === 'EXPENSE';
  }

  isRevenueForm(): boolean {
    return this.selectedTransactionType === 'REVENUE';
  }

  isFloatTransferForm(): boolean {
    return this.selectedTransactionType === 'FLOAT_TRANSFER';
  }

  isMoneyMovementForm(): boolean {
    return this.selectedTransactionType === 'MONEY_MOVEMENT';
  }

  isAdjustmentForm(): boolean {
    return false;
  }

  isOpeningBalanceForm(): boolean {
    return this.selectedTransactionType === 'OPENING_BALANCE';
  }

  trackByTransaction(index: number, transaction: DisplayTransaction): string {
    return transaction.id;
  }
}
