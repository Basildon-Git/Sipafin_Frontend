import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Branch {
  id: number;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
}

interface CreatePettyCashTransactionRequest {
  branchId: number;
  transactionType: string;
  direction: string;
  amount: number;
  transactionDate: string;
  reference: string;
  description: string;
}

@Component({
  selector: 'app-new-petty-cash-flow',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-petty-cash-flow.html',
  styleUrl: './new-petty-cash-flow.css',
})
export class NewPettyCashFlow implements OnInit {
  // --------------------------------------------------------------------------
  // FORM
  // --------------------------------------------------------------------------

  branchId: number | null = null;
  branchSearch = '';
  branchSelected = false;
  branchSearchFocused = false;

  transactionType = 'EXPENSE';
  direction = 'OUT';

  amount: number | null = null;

  transactionDate = '';

  reference = '';

  description = '';

  saving = false;

  // --------------------------------------------------------------------------
  // MOCK BRANCHES
  // Replace this with API data later.
  // --------------------------------------------------------------------------

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
      active: false,
    },
  ];

  // --------------------------------------------------------------------------
  // TRANSACTION TYPES
  // --------------------------------------------------------------------------

  transactionTypes = [
    {
      value: 'OPENING_BALANCE',
      label: 'Opening Balance',
      direction: 'IN',
    },
    {
      value: 'LOAN_RECEIVED',
      label: 'Loan Received',
      direction: 'IN',
    },
    {
      value: 'LOAN_REPAYMENT',
      label: 'Loan Repayment',
      direction: 'IN',
    },
    {
      value: 'COMMISSION_RECEIVED',
      label: 'Commission Received',
      direction: 'IN',
    },
    {
      value: 'EXPENSE',
      label: 'Expense',
      direction: 'OUT',
    },
    {
      value: 'CASH_DISBURSEMENT',
      label: 'Cash Disbursement',
      direction: 'OUT',
    },
    {
      value: 'BANK_DEPOSIT',
      label: 'Bank Deposit',
      direction: 'OUT',
    },
    {
      value: 'BANK_WITHDRAWAL',
      label: 'Bank Withdrawal',
      direction: 'IN',
    },
    {
      value: 'BRANCH_TRANSFER_IN',
      label: 'Branch Transfer In',
      direction: 'IN',
    },
    {
      value: 'BRANCH_TRANSFER_OUT',
      label: 'Branch Transfer Out',
      direction: 'OUT',
    },
    {
      value: 'ADJUSTMENT',
      label: 'Adjustment',
      direction: 'IN',
    },
    {
      value: 'REVERSAL',
      label: 'Reversal',
      direction: 'IN',
    },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.transactionDate = this.getToday();
  }

  // --------------------------------------------------------------------------
  // BRANCH SEARCH
  // --------------------------------------------------------------------------

  get activeBranches(): Branch[] {
    return this.branches.filter((branch) => branch.active);
  }

  get filteredBranches(): Branch[] {
    const search = this.branchSearch.trim().toLowerCase();

    if (!search) {
      return this.activeBranches;
    }

    return this.activeBranches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(search) ||
        branch.code.toLowerCase().includes(search) ||
        branch.location?.toLowerCase().includes(search),
    );
  }

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

  onBranchSearchChange(): void {
    this.branchSelected = false;
    this.branchId = null;
  }

  // --------------------------------------------------------------------------
  // TRANSACTION TYPE
  // --------------------------------------------------------------------------

  onTransactionTypeChange(): void {
    const selected = this.transactionTypes.find((type) => type.value === this.transactionType);

    if (selected) {
      this.direction = selected.direction;
    }
  }

  // --------------------------------------------------------------------------
  // FORM
  // --------------------------------------------------------------------------

  isFormValid(): boolean {
    if (!this.branchId) {
      return false;
    }

    if (!this.transactionType) {
      return false;
    }

    if (!this.direction) {
      return false;
    }

    if (!this.amount || this.amount <= 0) {
      return false;
    }

    if (!this.transactionDate) {
      return false;
    }

    return true;
  }

  save(): void {
    if (!this.isFormValid()) {
      return;
    }

    const request: CreatePettyCashTransactionRequest = {
      branchId: this.branchId!,
      transactionType: this.transactionType,
      direction: this.direction,
      amount: Number(this.amount),
      transactionDate: this.transactionDate,
      reference: this.reference.trim(),
      description: this.description.trim(),
    };

    console.log('Create petty cash transaction:', request);

    this.saving = true;

    // Replace with API call.
    setTimeout(() => {
      this.saving = false;

      this.router.navigate(['/cash-flows']);
    }, 500);
  }

  cancel(): void {
    this.router.navigate(['/cash-flows']);
  }

  private getToday(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
