import { Component, computed, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

export interface PettyCashTransaction {
  id: number;
  branch: {
    id: number;
    name: string;
    code: string;
  };
  transactionType: string;
  direction: 'IN' | 'OUT';
  amount: number;
  transactionDate: string;
  reference: string | null;
  description: string | null;
}

@Component({
  selector: 'app-petty-cash-flow',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  templateUrl: './petty-cash-flow.html',
  styleUrl: './petty-cash-flow.css',
})
export class PettyCashFlow {
  searchTerm = signal('');

  transactions = signal<PettyCashTransaction[]>([
    {
      id: 1,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      transactionType: 'OPENING_BALANCE',
      direction: 'IN',
      amount: 5000,
      transactionDate: '2026-09-01',
      reference: 'PC-OPEN-0001',
      description: 'Opening petty cash balance',
    },
    {
      id: 2,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      transactionType: 'COMMISSION_RECEIVED',
      direction: 'IN',
      amount: 1250,
      transactionDate: '2026-09-01',
      reference: 'COM-2026-0010',
      description: 'Commission received',
    },
    {
      id: 3,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      transactionType: 'EXPENSE',
      direction: 'OUT',
      amount: 350.75,
      transactionDate: '2026-09-02',
      reference: 'EXP-2026-0021',
      description: 'Office stationery',
    },
    {
      id: 4,
      branch: {
        id: 2,
        name: 'Harare Branch',
        code: 'HAR',
      },
      transactionType: 'LOAN_RECEIVED',
      direction: 'IN',
      amount: 2500,
      transactionDate: '2026-09-02',
      reference: 'LN-2026-0045',
      description: 'Loan repayment received',
    },
    {
      id: 5,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      transactionType: 'CASH_DISBURSEMENT',
      direction: 'OUT',
      amount: 750,
      transactionDate: '2026-09-03',
      reference: 'CD-2026-0004',
      description: 'Cash disbursement',
    },
    {
      id: 6,
      branch: {
        id: 2,
        name: 'Harare Branch',
        code: 'HAR',
      },
      transactionType: 'BANK_DEPOSIT',
      direction: 'OUT',
      amount: 1500,
      transactionDate: '2026-09-03',
      reference: 'DEP-2026-0007',
      description: 'Petty cash deposited into bank',
    },
    {
      id: 7,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      transactionType: 'BANK_WITHDRAWAL',
      direction: 'IN',
      amount: 2000,
      transactionDate: '2026-09-04',
      reference: 'WD-2026-0002',
      description: 'Cash withdrawn from bank',
    },
  ]);

  filteredTransactions = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.transactions();
    }

    return this.transactions().filter(
      (transaction) =>
        transaction.branch.name.toLowerCase().includes(search) ||
        transaction.branch.code.toLowerCase().includes(search) ||
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
      .reduce((sum, t) => sum + t.amount, 0),
  );

  totalOut = computed(() =>
    this.transactions()
      .filter((t) => t.direction === 'OUT')
      .reduce((sum, t) => sum + t.amount, 0),
  );

  currentBalance = computed(() => this.totalIn() - this.totalOut());

  constructor(private router: Router) {}

  addTransaction(): void {
    this.router.navigate(['/financial-transactions/new']);
  }

  viewTransaction(id: number): void {
    this.router.navigate(['/financial-transactions', id]);
  }

  editTransaction(id: number): void {
    this.router.navigate(['/financial-transactions', id, 'edit']);
  }

  deleteTransaction(id: number): void {
    const confirmed = confirm('Are you sure you want to delete this petty cash transaction?');

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

  getDirectionClass(direction: string): string {
    return direction === 'IN' ? 'direction-in' : 'direction-out';
  }

  getTransactionClass(type: string): string {
    switch (type) {
      case 'OPENING_BALANCE':
        return 'transaction-opening';

      case 'LOAN_RECEIVED':
      case 'LOAN_REPAYMENT':
      case 'COMMISSION_RECEIVED':
      case 'BANK_WITHDRAWAL':
      case 'BRANCH_TRANSFER_IN':
        return 'transaction-in';

      case 'EXPENSE':
      case 'CASH_DISBURSEMENT':
      case 'BANK_DEPOSIT':
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
