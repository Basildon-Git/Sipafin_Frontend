import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Master } from '../../../core/services/master';

type Currency = 'USD' | 'ZIG' | 'ZAR' | 'EUR';

type TransactionType =
  | 'BANK_WITHDRAWAL'
  | 'BANK_DEPOSIT'
  | 'FLOAT_TRANSFER'
  | 'CURRENCY_EXCHANGE'
  | 'EXPENSE'
  | 'FLOAT_ADJUSTMENT'
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

  selectedCurrency: Currency = 'USD';

  selectedWeekStart = this.getMonday(new Date());

  days: DayColumn[] = [];

  bankAccounts: BankAccount[] = [];
  filteredBankAccounts: BankAccount[] = [];

  branches: Branch[] = [];

  floatTransactions: FloatTransaction[] = [];
  bankTransactions: BankTransaction[] = [];

  /**
   * Dedicated loan cash movements.
   *
   * LOAN_RECEIVED:
   * Money received by the branch from a lender.
   *
   * LOAN_REPAYMENT:
   * Money paid by the branch back to a lender.
   *
   * CLIENT LOAN REPAYMENT:
   * Money received from clients.
   */
  loanReceivedTransactions: FloatTransaction[] = [];
  loanRepaymentTransactions: FloatTransaction[] = [];
  clientLoanRepaymentTransactions: FloatTransaction[] = [];

  /**
   * Client loan portfolio returned by:
   *
   * /api/v1/client-loans/branch/{branchId}/currency/{currency}
   */
  clientLoans: ClientLoan[] = [];

  displayTransactions: DisplayTransaction[] = [];

  summaryRows: SummaryRow[] = [];

  loading = false;
  saving = false;

  errorMessage = '';

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
  }

  // ---------------------------------------------------------
  // INITIAL DATA
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // WEEK DATA
  // ---------------------------------------------------------

  private loadWeekData(): void {
    if (!this.branchId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const baseUrl = this.masterService.getBackendService();

    const requests = this.days.map((day) =>
      this.http.get<any>(
        `${baseUrl}api/v1/money-movements/float/branch/${this.branchId}/currency/${this.selectedCurrency}/date/${day.date}`,
      ),
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const transactionMap = new Map<number, FloatTransaction>();

        responses.forEach((response, index) => {
          const requestedDate = this.days[index].date;

          const data: FloatTransaction[] = response?.data ?? [];

          data.forEach((transaction) => {
            if (transaction.status && transaction.status !== 'POSTED') {
              return;
            }

            if (transaction.transactionDate !== requestedDate) {
              return;
            }

            transactionMap.set(Number(transaction.id), transaction);
          });
        });

        this.floatTransactions = this.sortTransactions(Array.from(transactionMap.values()));

        this.loadLoanTransactions();
      },

      error: (error) => {
        console.error('Failed to load float transactions', error);

        this.floatTransactions = [];

        this.loadLoanTransactions();
      },
    });
  }

  // ---------------------------------------------------------
  // BANK TRANSACTIONS
  // ---------------------------------------------------------

  private loadBankTransactions(): void {
    if (!this.branchId) {
      return;
    }

    const baseUrl = this.masterService.getBackendService();

    this.http
      .get<any>(
        `${baseUrl}api/v1/money-movements/bank/branch/${this.branchId}/currency/${this.selectedCurrency}`,
      )
      .subscribe({
        next: (response) => {
          const data: BankTransaction[] = response?.data ?? [];

          this.bankTransactions = data.filter(
            (transaction) =>
              this.isDateInsideCurrentWeek(transaction.transactionDate) &&
              (!transaction.status || transaction.status === 'POSTED'),
          );

          this.filterBankAccounts();

          this.buildDisplayTransactions();

          this.buildSummary();

          this.loading = false;
        },

        error: (error) => {
          console.error('Failed to load bank transactions', error);

          this.bankTransactions = [];

          this.buildDisplayTransactions();

          this.buildSummary();

          this.loading = false;
        },
      });
  }

  // ---------------------------------------------------------
  // BANK ACCOUNTS
  // ---------------------------------------------------------

  filterBankAccounts(): void {
    this.filteredBankAccounts = this.bankAccounts.filter(
      (account) => account.active && account.currency === this.selectedCurrency,
    );
  }

  // ---------------------------------------------------------
  // LOAN TRANSACTIONS
  // ---------------------------------------------------------

  private loadLoanTransactions(): void {
    if (!this.branchId) {
      return;
    }

    const baseUrl = this.masterService.getBackendService();

    forkJoin({
      received: this.http.get<any>(
        `${baseUrl}api/v1/money-movements/float/loans-received/branch/${this.branchId}/currency/${this.selectedCurrency}`,
      ),

      repayments: this.http.get<any>(
        `${baseUrl}api/v1/money-movements/float/loan-repayments/branch/${this.branchId}/currency/${this.selectedCurrency}`,
      ),

      /**
       * IMPORTANT:
       *
       * This endpoint name may differ in your backend.
       *
       * The important part is that client repayments should
       * come from an actual transaction endpoint, NOT from
       * loan.updatedAt.
       */
      clientLoanRepayments: this.http.get<any>(
        `${baseUrl}api/v1/money-movements/float/client-loan-repayments/branch/${this.branchId}/currency/${this.selectedCurrency}`,
      ),
    }).subscribe({
      next: (response) => {
        this.loanReceivedTransactions = this.prepareLoanTransactions(response.received?.data ?? []);

        this.loanRepaymentTransactions = this.prepareLoanTransactions(
          response.repayments?.data ?? [],
        );

        this.clientLoanRepaymentTransactions = this.prepareLoanTransactions(
          response.clientLoanRepayments?.data ?? [],
        );

        this.loadClientLoans();
      },

      error: (error) => {
        console.error('Failed to load loan transactions', error);

        this.loanReceivedTransactions = [];
        this.loanRepaymentTransactions = [];

        /**
         * If the backend does not yet have the client-loan
         * repayment endpoint, keep this empty rather than
         * incorrectly using updatedAt.
         */
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

    return this.sortTransactions(Array.from(map.values()));
  }

  // ---------------------------------------------------------
  // CLIENT LOANS
  // ---------------------------------------------------------

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

          this.loadBankTransactions();
        },

        error: (error) => {
          console.error('Failed to load client loans', error);

          this.clientLoans = [];

          this.loadBankTransactions();
        },
      });
  }

  // ---------------------------------------------------------
  // DISPLAY TRANSACTIONS
  // ---------------------------------------------------------

  private buildDisplayTransactions(): void {
    const result: DisplayTransaction[] = [];

    for (const transaction of this.floatTransactions) {
      /**
       * Dedicated loan records are displayed separately
       * below so they are not duplicated.
       */
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
        transaction.transactionType === 'BANK_DEPOSIT'
      ) {
        const bankTransaction = this.findBankTransaction(transaction);

        if (bankTransaction) {
          context =
            `${bankTransaction.bankName} — ` +
            `${bankTransaction.accountName} — ` +
            `${bankTransaction.accountNumber}`;

          bankAccountId = bankTransaction.bankAccountId;
        } else {
          context = 'Bank account not found';
        }
      } else if (
        transaction.transactionType === 'BRANCH_TRANSFER_IN' ||
        transaction.transactionType === 'BRANCH_TRANSFER_OUT'
      ) {
        context = transaction.branchName || transaction.branchCode || 'Branch transfer';
      } else if (transaction.transactionType === 'EXPENSE') {
        context = 'Branch Float';
      } else if (
        transaction.transactionType === 'CURRENCY_EXCHANGE_IN' ||
        transaction.transactionType === 'CURRENCY_EXCHANGE_OUT'
      ) {
        context = 'Currency Exchange';
      } else if (transaction.transactionType === 'ADJUSTMENT') {
        context = 'Float Adjustment';
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
      });
    }

    // LOAN RECEIVED
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
      });
    }

    // LOAN REPAYMENT
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
      });
    }

    // CLIENT LOAN REPAYMENT
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
    const expectedType =
      floatTransaction.transactionType === 'BANK_WITHDRAWAL' ? 'CASH_WITHDRAWAL' : 'CASH_DEPOSIT';

    let matches = this.bankTransactions.filter(
      (bank) =>
        bank.transactionType === expectedType &&
        bank.currency === this.selectedCurrency &&
        bank.transactionDate === floatTransaction.transactionDate &&
        Number(bank.amount) === Number(floatTransaction.amount),
    );

    if (floatTransaction.reference) {
      const referenceMatches = matches.filter(
        (bank) => bank.reference === floatTransaction.reference,
      );

      if (referenceMatches.length > 0) {
        matches = referenceMatches;
      }
    }

    return matches[0];
  }

  // ---------------------------------------------------------
  // TRANSACTION SECTIONS
  // ---------------------------------------------------------

  get withdrawalTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'BANK_WITHDRAWAL');
  }

  get depositTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'BANK_DEPOSIT');
  }

  get floatTransferTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter(
      (transaction) =>
        transaction.type === 'BRANCH_TRANSFER_IN' || transaction.type === 'BRANCH_TRANSFER_OUT',
    );
  }

  get currencyExchangeTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter(
      (transaction) =>
        transaction.type === 'CURRENCY_EXCHANGE_IN' || transaction.type === 'CURRENCY_EXCHANGE_OUT',
    );
  }

  get expenseTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'EXPENSE');
  }

  get adjustmentTransactions(): DisplayTransaction[] {
    return this.displayTransactions.filter((transaction) => transaction.type === 'ADJUSTMENT');
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

  // ---------------------------------------------------------
  // BANK DAILY TOTALS
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // CLIENT LOAN HELPERS
  // ---------------------------------------------------------

  get clientLoansFromFloat(): ClientLoan[] {
    return this.clientLoans.filter((loan) => loan.fundingSource === 'BRANCH_FLOAT');
  }

  get clientLoansFromBank(): ClientLoan[] {
    return this.clientLoans.filter((loan) => loan.fundingSource === 'BANK_ACCOUNT');
  }

  /**
   * Amount already received from a client.
   *
   * Example:
   *
   * totalReceivable = 256
   * outstandingBalance = 246
   *
   * received = 10
   */
  getClientLoanReceivedAmount(loan: ClientLoan): number {
    const totalReceivable = Number(loan.totalReceivable || 0);

    const outstandingBalance = Number(loan.outstandingBalance || 0);

    return Math.max(0, totalReceivable - outstandingBalance);
  }

  /**
   * Total principal currently issued from branch float.
   *
   * This is the amount that leaves the float.
   */
  getClientLoanIssuedTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.principalAmount || 0),
      0,
    );
  }

  /**
   * Total currently received from clients
   * according to the loan portfolio.
   *
   * NOTE:
   * This is a cumulative portfolio figure.
   * For daily cash summary use the actual
   * clientLoanRepaymentTransactions.
   */
  getClientLoanReceivedTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + this.getClientLoanReceivedAmount(loan),
      0,
    );
  }

  /**
   * Total outstanding client-loan principal/receivable
   * for branch-float funded loans.
   */
  getClientLoanOutstandingTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.outstandingBalance || 0),
      0,
    );
  }

  /**
   * Total principal issued from float.
   */
  getClientLoanPrincipalTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.principalAmount || 0),
      0,
    );
  }

  /**
   * Total interest expected.
   */
  getClientLoanInterestTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.interestAmount || 0),
      0,
    );
  }

  /**
   * Total amount receivable.
   */
  getClientLoanReceivableTotal(): number {
    return this.clientLoansFromFloat.reduce(
      (sum, loan) => sum + Number(loan.totalReceivable || 0),
      0,
    );
  }

  // ---------------------------------------------------------
  // DAILY CLIENT LOAN VALUES
  // ---------------------------------------------------------

  private getClientLoansIssuedForDate(date: string): number {
    return this.clientLoansFromFloat
      .filter((loan) => loan.dateIssued === date)
      .reduce((sum, loan) => sum + Number(loan.principalAmount || 0), 0);
  }

  /**
   * IMPORTANT:
   *
   * Do NOT calculate daily repayments using:
   *
   * loan.updatedAt
   *
   * because updatedAt does not prove that a repayment
   * happened on that date.
   *
   * Instead use the actual client-loan repayment
   * transactions.
   */
  private getClientLoanRepaymentsForDate(date: string): number {
    return this.clientLoanRepaymentTransactions
      .filter((transaction) => transaction.transactionDate === date)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------

  private buildSummary(): void {
    const rows: SummaryRow[] = [];

    const openingValues: number[] = [];

    const bankWithdrawalValues: number[] = [];
    const transferInValues: number[] = [];
    const exchangeInValues: number[] = [];
    const adjustmentInValues: number[] = [];
    const loanReceivedValues: number[] = [];

    const clientLoanRepaymentValues: number[] = [];

    const bankDepositValues: number[] = [];
    const transferOutValues: number[] = [];
    const exchangeOutValues: number[] = [];
    const expenseValues: number[] = [];
    const adjustmentOutValues: number[] = [];
    const loanRepaymentValues: number[] = [];

    const clientLoanIssuedValues: number[] = [];

    let previousClosing: number | null = null;

    this.days.forEach((day, index) => {
      const dayTransactions = this.floatTransactions.filter(
        (transaction) => transaction.transactionDate === day.date,
      );

      /**
       * CLIENT LOAN ISSUED
       *
       * Only BRANCH_FLOAT funded loans affect
       * branch float.
       *
       * BANK_ACCOUNT funded loans are deliberately
       * excluded from the float summary.
       */
      const clientLoansIssued = this.getClientLoansIssuedForDate(day.date);

      /**
       * CLIENT LOAN REPAYMENT
       *
       * Money received from clients back into
       * branch float.
       */
      const clientLoanRepayments = this.getClientLoanRepaymentsForDate(day.date);

      const opening = this.calculateOpeningBalance(
        day.date,
        dayTransactions,
        previousClosing,
        index,
      );

      const bankWithdrawals = this.sumTransactions(dayTransactions, 'BANK_WITHDRAWAL', 'IN');

      const transfersIn = this.sumTransactions(dayTransactions, 'BRANCH_TRANSFER_IN', 'IN');

      const loansReceived = this.sumLoanTransactions(this.loanReceivedTransactions, day.date);

      const exchangeIn = this.sumTransactions(dayTransactions, 'CURRENCY_EXCHANGE_IN', 'IN');

      const adjustmentIn = this.sumDirectionAndType(dayTransactions, 'ADJUSTMENT', 'IN');

      const bankDeposits = this.sumTransactions(dayTransactions, 'BANK_DEPOSIT', 'OUT');

      const transfersOut = this.sumTransactions(dayTransactions, 'BRANCH_TRANSFER_OUT', 'OUT');

      const loanRepayments = this.sumLoanTransactions(this.loanRepaymentTransactions, day.date);

      const exchangeOut = this.sumTransactions(dayTransactions, 'CURRENCY_EXCHANGE_OUT', 'OUT');

      const expenses = this.sumTransactions(dayTransactions, 'EXPENSE', 'OUT');

      const adjustmentOut = this.sumDirectionAndType(dayTransactions, 'ADJUSTMENT', 'OUT');

      /**
       * TOTAL INFLOW
       *
       * Client loan repayments are IN because
       * clients are paying money back into the float.
       */
      const totalInflow =
        bankWithdrawals +
        transfersIn +
        loansReceived +
        clientLoanRepayments +
        exchangeIn +
        adjustmentIn;

      /**
       * TOTAL OUTFLOW
       *
       * Client loans issued from branch float
       * are OUT because money leaves the float
       * and goes to the client.
       */
      const totalOutflow =
        bankDeposits +
        transfersOut +
        loanRepayments +
        clientLoansIssued +
        exchangeOut +
        expenses +
        adjustmentOut;

      const closing = opening + totalInflow - totalOutflow;

      openingValues.push(opening);

      bankWithdrawalValues.push(bankWithdrawals);

      transferInValues.push(transfersIn);

      exchangeInValues.push(exchangeIn);

      adjustmentInValues.push(adjustmentIn);

      loanReceivedValues.push(loansReceived);

      clientLoanRepaymentValues.push(clientLoanRepayments);

      bankDepositValues.push(bankDeposits);

      transferOutValues.push(transfersOut);

      exchangeOutValues.push(exchangeOut);

      expenseValues.push(expenses);

      adjustmentOutValues.push(adjustmentOut);

      loanRepaymentValues.push(loanRepayments);

      clientLoanIssuedValues.push(clientLoansIssued);

      previousClosing = closing;
    });

    // -------------------------------------------------------
    // INFLOW ROWS
    // -------------------------------------------------------

    rows.push({
      key: 'opening',
      label: 'OPENING BALANCE',
      values: openingValues,
      total: openingValues[0] ?? 0,
      bold: true,
    });

    rows.push({
      key: 'bankWithdrawals',
      label: 'BANK WITHDRAWALS',
      values: bankWithdrawalValues,
      total: this.total(bankWithdrawalValues),
    });

    rows.push({
      key: 'transferIn',
      label: 'FLOAT TRANSFERS IN',
      values: transferInValues,
      total: this.total(transferInValues),
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
      key: 'exchangeIn',
      label: 'CURRENCY EXCHANGE IN',
      values: exchangeInValues,
      total: this.total(exchangeInValues),
    });

    rows.push({
      key: 'adjustmentIn',
      label: 'FLOAT ADJUSTMENT IN',
      values: adjustmentInValues,
      total: this.total(adjustmentInValues),
    });

    const totalInflowValues = this.sumArrays([
      bankWithdrawalValues,
      transferInValues,
      loanReceivedValues,
      clientLoanRepaymentValues,
      exchangeInValues,
      adjustmentInValues,
    ]);

    rows.push({
      key: 'totalInflow',
      label: 'TOTAL INFLOW',
      values: totalInflowValues,
      total: this.total(totalInflowValues),
      bold: true,
    });

    // -------------------------------------------------------
    // OUTFLOW ROWS
    // -------------------------------------------------------

    rows.push({
      key: 'bankDeposits',
      label: 'BANK DEPOSITS',
      values: bankDepositValues,
      total: this.total(bankDepositValues),
    });

    rows.push({
      key: 'transferOut',
      label: 'FLOAT TRANSFERS OUT',
      values: transferOutValues,
      total: this.total(transferOutValues),
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
      key: 'exchangeOut',
      label: 'CURRENCY EXCHANGE OUT',
      values: exchangeOutValues,
      total: this.total(exchangeOutValues),
    });

    rows.push({
      key: 'expenses',
      label: 'EXPENSES',
      values: expenseValues,
      total: this.total(expenseValues),
    });

    rows.push({
      key: 'adjustmentOut',
      label: 'FLOAT ADJUSTMENT OUT',
      values: adjustmentOutValues,
      total: this.total(adjustmentOutValues),
    });

    const totalOutflowValues = this.sumArrays([
      bankDepositValues,
      transferOutValues,
      loanRepaymentValues,
      clientLoanIssuedValues,
      exchangeOutValues,
      expenseValues,
      adjustmentOutValues,
    ]);

    rows.push({
      key: 'totalOutflow',
      label: 'TOTAL OUTFLOW',
      values: totalOutflowValues,
      total: this.total(totalOutflowValues),
      bold: true,
    });

    // -------------------------------------------------------
    // CLOSING
    // -------------------------------------------------------

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

  // ---------------------------------------------------------
  // OPENING BALANCE
  // ---------------------------------------------------------

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
      const sorted = this.sortTransactions(transactions);

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

  // ---------------------------------------------------------
  // SUM HELPERS
  // ---------------------------------------------------------

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

  private sumDirectionAndType(
    transactions: FloatTransaction[],
    type: string,
    direction: Direction,
  ): number {
    return this.sumTransactions(transactions, type, direction);
  }

  // ---------------------------------------------------------
  // TRANSACTION FORMS
  // ---------------------------------------------------------

  openTransactionForm(type: TransactionType, bankAccountId?: number): void {
    this.selectedTransactionType = type;

    this.transactionForm = this.createEmptyForm();

    this.transactionForm.date = this.formatDateForInput(new Date());

    if (bankAccountId) {
      this.transactionForm.bankAccountId = bankAccountId;
    }

    switch (type) {
      case 'BANK_WITHDRAWAL':
        this.formTitle = 'Bank Withdrawal — Float to Bank';
        break;

      case 'BANK_DEPOSIT':
        this.formTitle = 'Bank Deposit — Bank to Float';
        break;

      case 'FLOAT_TRANSFER':
        this.formTitle = 'Float Transfer';
        break;

      case 'CURRENCY_EXCHANGE':
        this.formTitle = 'Currency Exchange';
        break;

      case 'EXPENSE':
        this.formTitle = 'Expense';
        break;

      case 'FLOAT_ADJUSTMENT':
        this.formTitle = 'Float Adjustment';
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

    if (
      this.selectedTransactionType === 'CURRENCY_EXCHANGE' &&
      (!this.transactionForm.receivedAmount ||
        !this.transactionForm.paidAmount ||
        !this.transactionForm.exchangeRate)
    ) {
      this.errorMessage = 'Received amount, paid amount and exchange rate are required.';

      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload = this.buildPayload();

    const endpoint = this.getSaveEndpoint();

    const baseUrl = this.masterService.getBackendService();

    this.http.post(`${baseUrl}${endpoint}`, payload).subscribe({
      next: () => {
        this.saving = false;

        this.showTransactionForm = false;

        this.selectedTransactionType = null;

        this.loadWeekData();
      },

      error: (error) => {
        console.error('Failed to save transaction', error);

        this.saving = false;

        this.errorMessage = error?.error?.message || 'Failed to save transaction.';
      },
    });
  }

  private buildPayload(): any {
    const actionedBy = localStorage.getItem('username') || '';

    const form = this.transactionForm;

    switch (this.selectedTransactionType) {
      case 'BANK_WITHDRAWAL':
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

      case 'CURRENCY_EXCHANGE':
        return {
          branchId: this.branchId,
          receivedCurrency: form.receivedCurrency,
          receivedAmount: Number(form.receivedAmount),
          paidCurrency: form.paidCurrency,
          paidAmount: Number(form.paidAmount),
          exchangeRate: Number(form.exchangeRate),
          paidFrom: form.paidFrom,
          paidBankAccountId: form.paidFrom === 'BANK_ACCOUNT' ? form.paidBankAccountId : null,
          transactionDate: form.date,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'EXPENSE':
        if (form.paymentSource === 'BANK_ACCOUNT') {
          return {
            branchId: this.branchId,
            currency: this.selectedCurrency,
            paymentSource: 'BANK_ACCOUNT',
            bankAccountId: form.bankAccountId,
            amount: Number(form.amount),
            transactionDate: form.date,
            category: form.category,
            reference: form.reference,
            description: form.description,
            actionedBy,
          };
        }

        return {
          branchId: this.branchId,
          currency: this.selectedCurrency,
          paymentSource: 'BRANCH_FLOAT',
          bankAccountId: null,
          amount: Number(form.amount),
          transactionDate: form.date,
          category: form.category,
          reference: form.reference,
          description: form.description,
          actionedBy,
        };

      case 'FLOAT_ADJUSTMENT':
        return {
          branchId: this.branchId,
          currency: this.selectedCurrency,
          direction: form.direction,
          amount: Number(form.amount),
          transactionDate: form.date,
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
        return 'api/v1/money-movements/bank-to-float';

      case 'BANK_DEPOSIT':
        return 'api/v1/money-movements/float-to-bank';

      case 'FLOAT_TRANSFER':
        return 'api/v1/money-movements/float-transfer';

      case 'CURRENCY_EXCHANGE':
        return 'api/v1/money-movements/currency-exchange';

      case 'EXPENSE':
        return this.transactionForm.paymentSource === 'BANK_ACCOUNT'
          ? 'api/v1/money-movements/expense/from-bank'
          : 'api/v1/money-movements/expense/from-float';

      case 'FLOAT_ADJUSTMENT':
        return 'api/v1/money-movements/float-adjustment';

      case 'OPENING_BALANCE':
        return 'api/v1/money-movements/float/opening-balance';

      default:
        return '';
    }
  }

  // ---------------------------------------------------------
  // WEEK
  // ---------------------------------------------------------

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

    this.loadWeekData();
  }

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

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

      receivedCurrency: this.selectedCurrency,

      receivedAmount: null,

      paidCurrency: this.selectedCurrency,

      paidAmount: null,

      exchangeRate: null,

      paidFrom: 'BRANCH_FLOAT' as MoneySource,

      paidBankAccountId: null,

      paymentSource: 'BRANCH_FLOAT' as MoneySource,

      direction: 'IN' as Direction,

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

  private sortTransactions(transactions: FloatTransaction[]): FloatTransaction[] {
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
      case 'BANK_WITHDRAWAL':
        return 'Bank Withdrawal';

      case 'BANK_DEPOSIT':
        return 'Bank Deposit';

      case 'BRANCH_TRANSFER_IN':
        return 'Float Transfer In';

      case 'BRANCH_TRANSFER_OUT':
        return 'Float Transfer Out';

      case 'CURRENCY_EXCHANGE_IN':
        return 'Currency Exchange In';

      case 'CURRENCY_EXCHANGE_OUT':
        return 'Currency Exchange Out';

      case 'EXPENSE':
        return 'Expense';

      case 'ADJUSTMENT':
        return 'Float Adjustment';

      case 'OPENING_BALANCE':
        return 'Opening Balance';

      case 'LOAN_RECEIVED':
        return 'Loan Received';

      case 'LOAN_REPAYMENT':
        return 'Loan Repayment';

      case 'CLIENT_LOAN_REPAYMENT':
        return 'Client Loan Repayment';

      case 'COMMISSION_RECEIVED':
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

  getSummaryValue(row: SummaryRow, index: number): number {
    return row.values[index] ?? 0;
  }

  getTransactionAmountClass(transaction: DisplayTransaction): string {
    return transaction.direction === 'IN' ? 'amount-in' : 'amount-out';
  }

  getFormBankAccounts(): BankAccount[] {
    return this.filteredBankAccounts;
  }

  getDestinationBranches(): Branch[] {
    return this.branches.filter(
      (branch) => branch.active && Number(branch.id) !== Number(this.branchId),
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

  isFloatTransferForm(): boolean {
    return this.selectedTransactionType === 'FLOAT_TRANSFER';
  }

  isAdjustmentForm(): boolean {
    return this.selectedTransactionType === 'FLOAT_ADJUSTMENT';
  }

  isOpeningBalanceForm(): boolean {
    return this.selectedTransactionType === 'OPENING_BALANCE';
  }

  trackByTransaction(index: number, transaction: DisplayTransaction): string {
    return transaction.id;
  }
}
