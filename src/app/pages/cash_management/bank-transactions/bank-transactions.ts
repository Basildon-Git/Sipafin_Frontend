import { Component, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

export interface BankTransaction {
  id: number;

  bankAccount: {
    id: number;
    accountName: string;
    accountNumber: string;
    currency: string;
  };

  branch: {
    id: number;
    name: string;
    code: string;
  } | null;

  transactionType: string;
  direction: 'IN' | 'OUT';
  amount: number;
  transactionDate: string;
  reference: string | null;
  description: string | null;
}

@Component({
  selector: 'app-bank-transactions',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  templateUrl: './bank-transactions.html',
  styleUrl: './bank-transactions.css',
})
export class BankTransactions {
  searchTerm = signal('');

  transactions = signal<BankTransaction[]>([
    {
      id: 1,
      bankAccount: {
        id: 1,
        accountName: 'GreenFuel Main Account',
        accountNumber: '012345678901',
        currency: 'USD',
      },
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      transactionType: 'COMMISSION_RECEIVED',
      direction: 'IN',
      amount: 12500.5,
      transactionDate: '2026-09-01',
      reference: 'COM-2026-0010',
      description: 'Commission received',
    },
    {
      id: 2,
      bankAccount: {
        id: 1,
        accountName: 'GreenFuel Main Account',
        accountNumber: '012345678901',
        currency: 'USD',
      },
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      transactionType: 'BANK_DEPOSIT',
      direction: 'IN',
      amount: 5000.0,
      transactionDate: '2026-09-02',
      reference: 'DEP-2026-0045',
      description: 'Petty cash deposit',
    },
    {
      id: 3,
      bankAccount: {
        id: 2,
        accountName: 'Operations Account',
        accountNumber: '456789123456',
        currency: 'USD',
      },
      branch: {
        id: 2,
        name: 'Harare Branch',
        code: 'HAR',
      },
      transactionType: 'EXPENSE',
      direction: 'OUT',
      amount: 1850.75,
      transactionDate: '2026-09-02',
      reference: 'EXP-2026-0032',
      description: 'Operational expenses',
    },
    {
      id: 4,
      bankAccount: {
        id: 3,
        accountName: 'Capital Account',
        accountNumber: '789456123012',
        currency: 'USD',
      },
      branch: {
        id: 3,
        name: 'Bulawayo Branch',
        code: 'BYO',
      },
      transactionType: 'BANK_WITHDRAWAL',
      direction: 'OUT',
      amount: 2500.0,
      transactionDate: '2026-09-03',
      reference: 'WD-2026-0015',
      description: 'Cash withdrawal for petty cash',
    },
    {
      id: 5,
      bankAccount: {
        id: 2,
        accountName: 'Operations Account',
        accountNumber: '456789123456',
        currency: 'USD',
      },
      branch: {
        id: 2,
        name: 'Harare Branch',
        code: 'HAR',
      },
      transactionType: 'BRANCH_TRANSFER_IN',
      direction: 'IN',
      amount: 3000.0,
      transactionDate: '2026-09-03',
      reference: 'TRF-2026-0021',
      description: 'Transfer received from Head Office',
    },
    {
      id: 6,
      bankAccount: {
        id: 1,
        accountName: 'GreenFuel Main Account',
        accountNumber: '012345678901',
        currency: 'USD',
      },
      branch: null,
      transactionType: 'LOAN_REPAYMENT',
      direction: 'IN',
      amount: 7500.0,
      transactionDate: '2026-09-04',
      reference: 'LN-REP-0087',
      description: 'Loan repayment received',
    },
    {
      id: 7,
      bankAccount: {
        id: 4,
        accountName: 'Capital Projects Account',
        accountNumber: '001234567890',
        currency: 'USD',
      },
      branch: {
        id: 4,
        name: 'Mutare Branch',
        code: 'MUT',
      },
      transactionType: 'BANK_DEPOSIT',
      direction: 'OUT',
      amount: 1200.0,
      transactionDate: '2026-09-04',
      reference: 'DEP-2026-0052',
      description: 'Transfer to operating account',
    },
  ]);

  filteredTransactions = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.transactions();
    }

    return this.transactions().filter(
      (transaction) =>
        transaction.bankAccount.accountName.toLowerCase().includes(search) ||
        transaction.bankAccount.accountNumber.toLowerCase().includes(search) ||
        transaction.bankAccount.currency.toLowerCase().includes(search) ||
        transaction.branch?.name.toLowerCase().includes(search) ||
        transaction.branch?.code.toLowerCase().includes(search) ||
        transaction.transactionType.toLowerCase().includes(search) ||
        transaction.direction.toLowerCase().includes(search) ||
        transaction.reference?.toLowerCase().includes(search) ||
        transaction.description?.toLowerCase().includes(search),
    );
  });

  totalTransactions = computed(() => this.transactions().length);

  totalIn = computed(() =>
    this.transactions()
      .filter((t) => t.direction === 'IN')
      .reduce((total, t) => total + t.amount, 0),
  );

  totalOut = computed(() =>
    this.transactions()
      .filter((t) => t.direction === 'OUT')
      .reduce((total, t) => total + t.amount, 0),
  );

  netMovement = computed(() => this.totalIn() - this.totalOut());

  constructor(private router: Router) {}

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

    this.transactions.update((items) => items.filter((item) => item.id !== id));
  }

  formatTransactionType(type: string): string {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '—';
    }

    const lastFour = accountNumber.slice(-4);

    return `•••• ${lastFour}`;
  }

  getDirectionClass(direction: string): string {
    return direction === 'IN' ? 'direction-in' : 'direction-out';
  }

  getTransactionClass(type: string): string {
    switch (type) {
      case 'COMMISSION_RECEIVED':
      case 'LOAN_RECEIVED':
      case 'LOAN_REPAYMENT':
      case 'BANK_DEPOSIT':
      case 'BRANCH_TRANSFER_IN':
        return 'transaction-in';

      case 'EXPENSE':
      case 'BANK_WITHDRAWAL':
      case 'BRANCH_TRANSFER_OUT':
        return 'transaction-out';

      case 'ADJUSTMENT':
        return 'transaction-adjustment';

      case 'REVERSAL':
        return 'transaction-reversal';

      default:
        return '';
    }
  }
}
