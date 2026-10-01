import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Bank {
  id: number;
  name: string;
  code: string;
}

interface BankingAccount {
  id: number;
  bank: Bank;
  accountName: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  active: boolean;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
}

interface CreateBankTransactionRequest {
  bankAccountId: number;
  branchId: number | null;
  transactionType: string;
  direction: string;
  amount: number;
  transactionDate: string;
  reference: string;
  description: string;
}

@Component({
  selector: 'app-new-bank-transaction',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './new-bank-transaction.html',
  styleUrl: './new-bank-transaction.css',
})
export class NewBankTransaction {
  constructor(private router: Router) {}

  // --------------------------------------------------------------------------
  // Form fields
  // --------------------------------------------------------------------------

  bankAccountId: number | null = null;
  branchId: number | null = null;

  transactionType = 'BANK_DEPOSIT';
  direction = 'IN';

  amount: number | null = null;
  transactionDate = this.getToday();

  reference = '';
  description = '';

  // --------------------------------------------------------------------------
  // Search fields
  // --------------------------------------------------------------------------

  bankAccountSearch = '';
  branchSearch = '';

  bankAccountSelected = false;
  branchSelected = false;

  bankAccountSearchFocused = false;
  branchSearchFocused = false;

  // --------------------------------------------------------------------------
  // Mock data
  // Replace these with API calls later
  // --------------------------------------------------------------------------

  bankingAccounts: BankingAccount[] = [
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
      currentBalance: 45250.75,
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
      currentBalance: 28750.0,
      active: true,
    },
    {
      id: 3,
      bank: {
        id: 3,
        name: 'Stanbic Bank Zimbabwe',
        code: 'STANBIC',
      },
      accountName: 'Payroll Account',
      accountNumber: '789012345678',
      currency: 'USD',
      currentBalance: 18500.25,
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
      currentBalance: 62500.0,
      active: true,
    },
    {
      id: 5,
      bank: {
        id: 5,
        name: 'Ecobank Zimbabwe',
        code: 'ECO',
      },
      accountName: 'Old Account',
      accountNumber: '998877665544',
      currency: 'USD',
      currentBalance: 0,
      active: false,
    },
  ];

  branches: Branch[] = [
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
      name: 'Bulawayo Branch',
      code: 'BYO',
      location: 'Bulawayo',
      active: true,
    },
    {
      id: 4,
      name: 'Mutare Branch',
      code: 'MUT',
      location: 'Mutare',
      active: true,
    },
    {
      id: 5,
      name: 'Gweru Branch',
      code: 'GWE',
      location: 'Gweru',
      active: true,
    },
  ];

  // --------------------------------------------------------------------------
  // Search results
  // --------------------------------------------------------------------------

  filteredBankAccounts = computed(() => {
    const search = this.bankAccountSearch.trim().toLowerCase();

    if (!search) {
      return this.bankingAccounts.filter((account) => account.active);
    }

    return this.bankingAccounts.filter((account) => {
      if (!account.active) {
        return false;
      }

      return (
        account.accountName.toLowerCase().includes(search) ||
        account.accountNumber.toLowerCase().includes(search) ||
        account.bank.name.toLowerCase().includes(search) ||
        account.bank.code.toLowerCase().includes(search)
      );
    });
  });

  filteredBranches = computed(() => {
    const search = this.branchSearch.trim().toLowerCase();

    if (!search) {
      return this.branches.filter((branch) => branch.active);
    }

    return this.branches.filter((branch) => {
      if (!branch.active) {
        return false;
      }

      return (
        branch.name.toLowerCase().includes(search) ||
        branch.code.toLowerCase().includes(search) ||
        (branch.location ?? '').toLowerCase().includes(search)
      );
    });
  });

  // --------------------------------------------------------------------------
  // Focus / blur
  // --------------------------------------------------------------------------

  onBankAccountFocus(): void {
    this.bankAccountSearchFocused = true;
  }

  onBankAccountBlur(): void {
    setTimeout(() => {
      this.bankAccountSearchFocused = false;
    }, 150);
  }

  onBranchFocus(): void {
    this.branchSearchFocused = true;
  }

  onBranchBlur(): void {
    setTimeout(() => {
      this.branchSearchFocused = false;
    }, 150);
  }

  // --------------------------------------------------------------------------
  // Selection
  // --------------------------------------------------------------------------

  selectBankAccount(account: BankingAccount): void {
    this.bankAccountId = account.id;

    this.bankAccountSearch = `${account.accountName} - ${account.bank.name} (${this.maskAccountNumber(account.accountNumber)})`;

    this.bankAccountSelected = true;
    this.bankAccountSearchFocused = false;
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.id;
    this.branchSearch = `${branch.name} (${branch.code})`;

    this.branchSelected = true;
    this.branchSearchFocused = false;
  }

  // --------------------------------------------------------------------------
  // Search changes
  // --------------------------------------------------------------------------

  onBankAccountSearchChange(): void {
    this.bankAccountSelected = false;
    this.bankAccountId = null;
  }

  onBranchSearchChange(): void {
    this.branchSelected = false;
    this.branchId = null;
  }

  // --------------------------------------------------------------------------
  // Transaction type
  // --------------------------------------------------------------------------

  onTransactionTypeChange(): void {
    switch (this.transactionType) {
      case 'BANK_DEPOSIT':
      case 'COMMISSION_RECEIVED':
      case 'LOAN_REPAYMENT':
      case 'BANK_WITHDRAWAL':
        this.direction = this.transactionType === 'BANK_WITHDRAWAL' ? 'IN' : 'IN';
        break;

      case 'EXPENSE':
      case 'LOAN_DISBURSEMENT':
      case 'BANK_TRANSFER':
        this.direction = 'OUT';
        break;

      default:
        this.direction = 'IN';
    }
  }

  // --------------------------------------------------------------------------
  // Save
  // --------------------------------------------------------------------------

  save(): void {
    if (!this.bankAccountId) {
      alert('Please select a bank account.');
      return;
    }

    if (!this.amount || this.amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (!this.transactionDate) {
      alert('Please select a transaction date.');
      return;
    }

    const request: CreateBankTransactionRequest = {
      bankAccountId: this.bankAccountId,
      branchId: this.branchId,
      transactionType: this.transactionType,
      direction: this.direction,
      amount: Number(this.amount),
      transactionDate: this.transactionDate,
      reference: this.reference.trim(),
      description: this.description.trim(),
    };

    console.log('Create Bank Transaction:', request);

    // Replace with API call:
    // this.bankTransactionService.create(request).subscribe({
    //   next: () => this.router.navigate(['/bank-transactions']),
    //   error: (error) => console.error(error)
    // });

    this.router.navigate(['/bank-transactions']);
  }

  cancel(): void {
    this.router.navigate(['/bank-transactions']);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '';
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }

  formatTransactionType(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
}
