import { Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

export interface Expense {
  id: number;

  branch: {
    id: number;
    name: string;
    code: string;
  };

  bankAccount: {
    id: number;
    accountName: string;
    accountNumber: string;
    currency: string;
  } | null;

  category:
    | 'FUEL'
    | 'TRANSPORT'
    | 'UTILITIES'
    | 'RENT'
    | 'SALARIES'
    | 'OFFICE_SUPPLIES'
    | 'MAINTENANCE'
    | 'MARKETING'
    | 'BANK_CHARGES'
    | 'OTHER';

  amount: number;

  expenseDate: string;

  paymentSource: 'PETTY_CASH' | 'BANK_ACCOUNT' | 'CASH' | 'OTHER';

  status: 'POSTED' | 'PENDING' | 'CANCELLED';

  reference: string | null;

  description: string | null;
}

@Component({
  selector: 'app-expenses',
  imports: [DecimalPipe],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class Expenses {
  constructor(private router: Router) {}

  // =========================================================
  // MOCK DATA
  // =========================================================

  expenses = signal<Expense[]>([
    {
      id: 1,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      bankAccount: {
        id: 1,
        accountName: 'GreenFuel Main Account',
        accountNumber: '012345678901',
        currency: 'USD',
      },
      category: 'UTILITIES',
      amount: 1250.5,
      expenseDate: '2026-08-28',
      paymentSource: 'BANK_ACCOUNT',
      status: 'POSTED',
      reference: 'EXP-2026-0001',
      description: 'Monthly electricity bill',
    },
    {
      id: 2,
      branch: {
        id: 2,
        name: 'Harare Branch',
        code: 'HAR',
      },
      bankAccount: null,
      category: 'OFFICE_SUPPLIES',
      amount: 450.0,
      expenseDate: '2026-08-25',
      paymentSource: 'PETTY_CASH',
      status: 'POSTED',
      reference: 'EXP-2026-0002',
      description: 'Stationery and office supplies',
    },
    {
      id: 3,
      branch: {
        id: 3,
        name: 'Mutare Branch',
        code: 'MUT',
      },
      bankAccount: {
        id: 3,
        accountName: 'Collections Account',
        accountNumber: '789123456789',
        currency: 'USD',
      },
      category: 'BANK_CHARGES',
      amount: 185.75,
      expenseDate: '2026-08-20',
      paymentSource: 'BANK_ACCOUNT',
      status: 'POSTED',
      reference: 'EXP-2026-0003',
      description: 'Monthly bank charges',
    },
    {
      id: 4,
      branch: {
        id: 4,
        name: 'Gweru Branch',
        code: 'GWE',
      },
      bankAccount: null,
      category: 'TRANSPORT',
      amount: 875.0,
      expenseDate: '2026-08-18',
      paymentSource: 'PETTY_CASH',
      status: 'PENDING',
      reference: 'EXP-2026-0004',
      description: 'Local transportation expenses',
    },
    {
      id: 5,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      bankAccount: {
        id: 1,
        accountName: 'GreenFuel Main Account',
        accountNumber: '012345678901',
        currency: 'USD',
      },
      category: 'MAINTENANCE',
      amount: 2300.0,
      expenseDate: '2026-08-12',
      paymentSource: 'BANK_ACCOUNT',
      status: 'CANCELLED',
      reference: 'EXP-2026-0005',
      description: 'Equipment maintenance',
    },
  ]);

  // =========================================================
  // SEARCH
  // =========================================================

  searchTerm = signal('');

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  // =========================================================
  // FILTERED EXPENSES
  // =========================================================

  filteredExpenses = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.expenses();
    }

    return this.expenses().filter((expense) => {
      const branch = `${expense.branch.name} ${expense.branch.code}`.toLowerCase();

      const bankAccount = expense.bankAccount
        ? `${expense.bankAccount.accountName}
             ${expense.bankAccount.accountNumber}
             ${expense.bankAccount.currency}`.toLowerCase()
        : '';

      const category = this.getCategoryLabel(expense.category).toLowerCase();

      const paymentSource = this.getPaymentSourceLabel(expense.paymentSource).toLowerCase();

      const status = expense.status.toLowerCase();

      const reference = expense.reference?.toLowerCase() ?? '';

      const description = expense.description?.toLowerCase() ?? '';

      return (
        branch.includes(search) ||
        bankAccount.includes(search) ||
        category.includes(search) ||
        paymentSource.includes(search) ||
        status.includes(search) ||
        reference.includes(search) ||
        description.includes(search)
      );
    });
  });

  // =========================================================
  // SUMMARY CARDS
  // =========================================================

  totalExpenses = computed(() => this.expenses().length);

  postedExpenses = computed(
    () => this.expenses().filter((expense) => expense.status === 'POSTED').length,
  );

  pendingExpenses = computed(
    () => this.expenses().filter((expense) => expense.status === 'PENDING').length,
  );

  totalAmount = computed(() =>
    this.expenses()
      .filter((expense) => expense.status !== 'CANCELLED')
      .reduce((total, expense) => total + expense.amount, 0),
  );

  // =========================================================
  // NAVIGATION
  // =========================================================

  createExpense(): void {
    this.router.navigate(['/expenses/new']);
  }

  viewExpense(expense: Expense): void {
    this.router.navigate(['/expenses', expense.id]);
  }

  editExpense(expense: Expense): void {
    this.router.navigate(['/expenses/edit', expense.id]);
  }

  deleteExpense(expense: Expense): void {
    const confirmed = confirm(
      `Are you sure you want to delete expense ${expense.reference ?? '#' + expense.id}?`,
    );

    if (!confirmed) {
      return;
    }

    this.expenses.update((items) => items.filter((item) => item.id !== expense.id));
  }

  // =========================================================
  // LABEL HELPERS
  // =========================================================

  getCategoryLabel(category: string): string {
    return category
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getPaymentSourceLabel(source: string): string {
    return source
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getPaymentSourceClass(source: string): string {
    return source.toLowerCase();
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '';
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }
}
