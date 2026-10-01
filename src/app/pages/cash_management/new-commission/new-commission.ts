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

export interface Bank {
  id: number;
  name: string;
  code: string;
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

export interface CreateCommissionRequest {
  branchId: number;
  bankId: number;
  bankAccountId: number | null;
  amount: number;
  commissionDate: string;
  destination: string;
  status: string;
  reference: string;
  description: string;
}

@Component({
  selector: 'app-new-commission',
  imports: [FormsModule],
  templateUrl: './new-commission.html',
  styleUrl: './new-commission.css',
})
export class NewCommission {
  constructor(private router: Router) {}

  // =========================================================
  // FORM
  // =========================================================

  branchId: number | null = null;
  bankId: number | null = null;
  bankAccountId: number | null = null;

  amount: number | null = null;

  commissionDate = this.getToday();

  destination = 'BANK_ACCOUNT';
  status = 'RECEIVED';

  reference = '';
  description = '';

  // =========================================================
  // SEARCH
  // =========================================================

  branchSearch = '';
  bankSearch = '';
  bankAccountSearch = '';

  branchSelected = false;
  bankSelected = false;
  bankAccountSelected = false;

  branchSearchFocused = false;
  bankSearchFocused = false;
  bankAccountSearchFocused = false;

  // =========================================================
  // MOCK DATA
  // Replace these with API calls later
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

  banks = signal<Bank[]>([
    {
      id: 1,
      name: 'CBZ Bank',
      code: 'CBZ',
      active: true,
    },
    {
      id: 2,
      name: 'FBC Bank',
      code: 'FBC',
      active: true,
    },
    {
      id: 3,
      name: 'Stanbic Bank Zimbabwe',
      code: 'STANBIC',
      active: true,
    },
    {
      id: 4,
      name: 'Nedbank Zimbabwe',
      code: 'NED',
      active: true,
    },
    {
      id: 5,
      name: 'Ecobank Zimbabwe',
      code: 'ECO',
      active: false,
    },
  ]);

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
  ]);

  // =========================================================
  // FILTERED DATA
  // =========================================================

  filteredBranches = computed(() => {
    const search = this.branchSearch.trim().toLowerCase();

    return this.branches()
      .filter((branch) => branch.active)
      .filter((branch) => {
        if (!search) return true;

        return (
          branch.name.toLowerCase().includes(search) ||
          branch.code.toLowerCase().includes(search) ||
          (branch.location ?? '').toLowerCase().includes(search)
        );
      });
  });

  filteredBanks = computed(() => {
    const search = this.bankSearch.trim().toLowerCase();

    return this.banks()
      .filter((bank) => bank.active)
      .filter((bank) => {
        if (!search) return true;

        return bank.name.toLowerCase().includes(search) || bank.code.toLowerCase().includes(search);
      });
  });

  filteredBankAccounts = computed(() => {
    const search = this.bankAccountSearch.trim().toLowerCase();

    return this.bankAccounts()
      .filter((account) => account.active)
      .filter((account) => {
        // If a bank has been selected, only show accounts
        // belonging to that bank.
        if (this.bankId !== null && account.bank.id !== this.bankId) {
          return false;
        }

        if (!search) return true;

        return (
          account.accountName.toLowerCase().includes(search) ||
          account.accountNumber.toLowerCase().includes(search) ||
          account.bank.name.toLowerCase().includes(search)
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
    // Small delay allows click on dropdown option to complete.
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
  // BANK SEARCH
  // =========================================================

  onBankFocus(): void {
    this.bankSearchFocused = true;
  }

  onBankBlur(): void {
    setTimeout(() => {
      this.bankSearchFocused = false;
    }, 150);
  }

  selectBank(bank: Bank): void {
    this.bankId = bank.id;

    this.bankSearch = `${bank.name} (${bank.code})`;

    this.bankSelected = true;
    this.bankSearchFocused = false;

    // Reset bank account because the selected bank changed.
    this.bankAccountId = null;
    this.bankAccountSearch = '';
    this.bankAccountSelected = false;
  }

  clearBank(): void {
    this.bankId = null;
    this.bankSearch = '';
    this.bankSelected = false;

    this.bankAccountId = null;
    this.bankAccountSearch = '';
    this.bankAccountSelected = false;
  }

  // =========================================================
  // BANK ACCOUNT SEARCH
  // =========================================================

  onBankAccountFocus(): void {
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
  // DESTINATION
  // =========================================================

  onDestinationChange(): void {
    if (this.destination !== 'BANK_ACCOUNT') {
      this.bankAccountId = null;
      this.bankAccountSearch = '';
      this.bankAccountSelected = false;
    }
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  saveCommission(): void {
    if (!this.branchId) {
      alert('Please select a branch.');
      return;
    }

    if (!this.bankId) {
      alert('Please select a bank.');
      return;
    }

    if (!this.amount || this.amount <= 0) {
      alert('Please enter a valid commission amount.');
      return;
    }

    if (!this.commissionDate) {
      alert('Please select the commission date.');
      return;
    }

    if (this.destination === 'BANK_ACCOUNT' && !this.bankAccountId) {
      alert('Please select a bank account.');
      return;
    }

    const payload: CreateCommissionRequest = {
      branchId: this.branchId,
      bankId: this.bankId,
      bankAccountId: this.destination === 'BANK_ACCOUNT' ? this.bankAccountId : null,
      amount: Number(this.amount),
      commissionDate: this.commissionDate,
      destination: this.destination,
      status: this.status,
      reference: this.reference.trim(),
      description: this.description.trim(),
    };

    console.log('Create Commission Payload:', payload);

    // Replace with API call later.
    this.router.navigate(['/commissions']);
  }

  cancel(): void {
    this.router.navigate(['/commissions']);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return '';

    return `•••• ${accountNumber.slice(-4)}`;
  }
}
