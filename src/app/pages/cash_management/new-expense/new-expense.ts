import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface Branch {
  id: number;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
}

export interface BankingAccount {
  id: number;
  bank: {
    id: number;
    name: string;
    code: string;
  };
  accountName: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  active: boolean;
}

export interface CreateExpenseRequest {
  branchId: number;
  bankAccountId: number | null;
  category: string;
  amount: number;
  expenseDate: string;
  paymentSource: string;
  status: string;
  reference: string;
  description: string;
}

@Component({
  selector: 'app-new-expense',
  imports: [FormsModule],
  templateUrl: './new-expense.html',
  styleUrl: './new-expense.css',
})
export class NewExpense {
  constructor(private router: Router) {}

  // =========================================================
  // FORM
  // =========================================================

  branchId: number | null = null;
  bankAccountId: number | null = null;

  category = 'OTHER';
  amount: number | null = null;

  expenseDate = this.getToday();

  paymentSource = 'PETTY_CASH';
  status = 'POSTED';

  reference = '';
  description = '';

  // =========================================================
  // SEARCH
  // =========================================================

  branchSearch = '';
  bankAccountSearch = '';

  branchSelected = false;
  bankAccountSelected = false;

  // IMPORTANT:
  // Dropdowns are hidden when the component loads.
  branchSearchFocused = false;
  bankAccountSearchFocused = false;

  // =========================================================
  // MOCK BRANCHES
  // =========================================================

  branches = signal<Branch[]>([
    {
      id: 1,
      name: 'Head Office',
      code: 'HO',
      location: 'Harare',
      active: true,
    },
    {
      id: 2,
      name: 'Harare Branch',
      code: 'HAR',
      location: 'Harare',
      active: true,
    },
    {
      id: 3,
      name: 'Mutare Branch',
      code: 'MUT',
      location: 'Mutare',
      active: true,
    },
    {
      id: 4,
      name: 'Gweru Branch',
      code: 'GWE',
      location: 'Gweru',
      active: true,
    },
    {
      id: 5,
      name: 'Bulawayo Branch',
      code: 'BYO',
      location: 'Bulawayo',
      active: false,
    },
  ]);

  // =========================================================
  // MOCK BANK ACCOUNTS
  // =========================================================

  bankAccounts = signal<BankingAccount[]>([
    {
      id: 1,
      bank: {
        id: 1,
        name: 'CBZ Bank',
        code: 'CBZ',
      },
      accountName: 'GreenFuel Main Account',
      accountNumber: '012345678901',
      currency: 'USD',
      currentBalance: 125000.5,
      active: true,
    },
    {
      id: 2,
      bank: {
        id: 2,
        name: 'FBC Bank',
        code: 'FBC',
      },
      accountName: 'Operations Account',
      accountNumber: '456789123456',
      currency: 'USD',
      currentBalance: 87500,
      active: true,
    },
    {
      id: 3,
      bank: {
        id: 3,
        name: 'Stanbic Bank Zimbabwe',
        code: 'STANBIC',
      },
      accountName: 'Collections Account',
      accountNumber: '789123456789',
      currency: 'USD',
      currentBalance: 65200.75,
      active: true,
    },
    {
      id: 4,
      bank: {
        id: 4,
        name: 'Nedbank Zimbabwe',
        code: 'NED',
      },
      accountName: 'Capital Projects Account',
      accountNumber: '001234567890',
      currency: 'USD',
      currentBalance: 150000,
      active: true,
    },
    {
      id: 5,
      bank: {
        id: 1,
        name: 'CBZ Bank',
        code: 'CBZ',
      },
      accountName: 'Petroleum Operations Account',
      accountNumber: '009876543210',
      currency: 'USD',
      currentBalance: 72000,
      active: true,
    },
  ]);

  // =========================================================
  // FILTERED BRANCHES
  // =========================================================

  filteredBranches = computed(() => {
    const search = this.branchSearch.trim().toLowerCase();

    return this.branches()
      .filter((branch) => branch.active)
      .filter((branch) => {
        if (!search) {
          return true;
        }

        return (
          branch.name.toLowerCase().includes(search) ||
          branch.code.toLowerCase().includes(search) ||
          (branch.location ?? '').toLowerCase().includes(search)
        );
      });
  });

  // =========================================================
  // FILTERED BANK ACCOUNTS
  // =========================================================

  filteredBankAccounts = computed(() => {
    const search = this.bankAccountSearch.trim().toLowerCase();

    return this.bankAccounts()
      .filter((account) => account.active)
      .filter((account) => {
        if (!search) {
          return true;
        }

        return (
          account.accountName.toLowerCase().includes(search) ||
          account.accountNumber.toLowerCase().includes(search) ||
          account.bank.name.toLowerCase().includes(search) ||
          account.bank.code.toLowerCase().includes(search)
        );
      });
  });

  // =========================================================
  // BRANCH SEARCH
  // =========================================================

  onBranchFocus(): void {
    this.branchSearchFocused = true;
  }

  onBranchBlur(): void {
    setTimeout(() => {
      this.branchSearchFocused = false;
    }, 150);
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.id;
    this.branchSearch = `${branch.name} (${branch.code})`;
    this.branchSelected = true;
    this.branchSearchFocused = false;
  }

  clearBranch(): void {
    this.branchId = null;
    this.branchSearch = '';
    this.branchSelected = false;
  }

  // =========================================================
  // BANK ACCOUNT SEARCH
  // =========================================================

  onBankAccountFocus(): void {
    if (this.paymentSource !== 'BANK_ACCOUNT') {
      return;
    }

    this.bankAccountSearchFocused = true;
  }

  onBankAccountBlur(): void {
    setTimeout(() => {
      this.bankAccountSearchFocused = false;
    }, 150);
  }

  selectBankAccount(account: BankingAccount): void {
    this.bankAccountId = account.id;
    this.bankAccountSearch = `${account.accountName} (${this.maskAccountNumber(account.accountNumber)})`;
    this.bankAccountSelected = true;
    this.bankAccountSearchFocused = false;
  }

  clearBankAccount(): void {
    this.bankAccountId = null;
    this.bankAccountSearch = '';
    this.bankAccountSelected = false;
  }

  // =========================================================
  // PAYMENT SOURCE
  // =========================================================

  onPaymentSourceChange(): void {
    if (this.paymentSource !== 'BANK_ACCOUNT') {
      this.bankAccountId = null;
      this.bankAccountSearch = '';
      this.bankAccountSelected = false;
      this.bankAccountSearchFocused = false;
    }
  }

  // =========================================================
  // SAVE
  // =========================================================

  saveExpense(): void {
    if (!this.branchId) {
      alert('Please select a branch.');
      return;
    }

    if (!this.amount || this.amount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    if (!this.expenseDate) {
      alert('Please select the expense date.');
      return;
    }

    if (this.paymentSource === 'BANK_ACCOUNT' && !this.bankAccountId) {
      alert('Please select a bank account.');
      return;
    }

    const payload: CreateExpenseRequest = {
      branchId: this.branchId,
      bankAccountId: this.paymentSource === 'BANK_ACCOUNT' ? this.bankAccountId : null,
      category: this.category,
      amount: Number(this.amount),
      expenseDate: this.expenseDate,
      paymentSource: this.paymentSource,
      status: this.status,
      reference: this.reference.trim(),
      description: this.description.trim(),
    };

    console.log('Create Expense Payload:', payload);

    // Replace with API call later.

    this.router.navigate(['/expenses']);
  }

  cancel(): void {
    this.router.navigate(['/expenses']);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '';
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }
}
