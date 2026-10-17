import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { Master } from '../../../core/services/master';

interface Branch {
  id: number;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BranchResponse {
  status: number;
  message: string;
  data: Branch[];
  timestamp: string;
}

interface BranchFloat {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  currency: string;
  currentBalance: number;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BranchFloatResponse {
  status: number;
  message: string;
  data: BranchFloat;
  timestamp: string;
}

export interface CreateBranchFloatRequest {
  branchId: number;
  currency: string;
  openingBalance: number;
  actionedBy: string;
}

export interface UpdateBranchFloatRequest {
  branchId: number;
  currency: string;
  openingBalance: number;
  active: boolean;
  actionedBy: string;
}

@Component({
  selector: 'app-new-petty-cash-branch-account',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-petty-cash-branch-account.html',
  styleUrl: './new-petty-cash-branch-account.css',
})
export class NewPettyCashBranchAccount {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ================================
  // EDIT MODE
  // ================================

  floatAccountId: number | null = null;
  isEditMode = false;
  loadingAccount = false;
  accountLoadFailed = false;

  // ================================
  // FORM
  // ================================

  currency = 'USD';
  openingBalance: number | null = 0;
  active = true;

  // ================================
  // BRANCH
  // ================================

  branchId: number | null = null;

  branchSearch = '';
  branchSelected = false;
  branchSearchStarted = false;

  branches = signal<Branch[]>([]);
  loadingBranches = false;

  // ================================
  // FORM LOADING
  // ================================

  loading = false;

  // ================================
  // CURRENCIES
  // ================================

  currencies = ['USD', 'ZIG', 'ZAR', 'EUR'];

  // ================================
  // FILTERED BRANCHES
  // ================================

  filteredBranches(): Branch[] {
    const search = this.branchSearch.trim().toLowerCase();

    if (!search || !this.branchSearchStarted) {
      return [];
    }

    return this.branches().filter(
      (branch) =>
        branch.active &&
        (branch.name.toLowerCase().includes(search) ||
          branch.code.toLowerCase().includes(search) ||
          (branch.location ?? '').toLowerCase().includes(search)),
    );
  }

  // ================================
  // CONSTRUCTOR
  // ================================

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (id !== null) {
        const parsedId = Number(id);

        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          this.toastr.error('Invalid float account ID.', 'Error');
          this.goBack();
          return;
        }

        this.floatAccountId = parsedId;
        this.isEditMode = true;

        this.loadFloatAccount(parsedId);
      } else {
        this.floatAccountId = null;
        this.isEditMode = false;
        this.loadingAccount = false;
        this.accountLoadFailed = false;

        this.currency = 'USD';
        this.openingBalance = 0;
        this.active = true;

        this.branchId = null;
        this.branchSearch = '';
        this.branchSelected = false;
        this.branchSearchStarted = false;

        this.loadLocalBranch();
        this.resolveSelectedBranch();
      }
    });

    this.loadBranches();
  }

  // ================================
  // LOAD FLOAT ACCOUNT BY ID
  // ================================

  loadFloatAccount(id: number): void {
    this.loadingAccount = true;
    this.accountLoadFailed = false;

    const endpoint = this.masterService.getBackendService() + `api/v1/branch-floats/${id}`;

    console.log('Loading branch float account:', endpoint);

    this.http.get<BranchFloatResponse>(endpoint).subscribe({
      next: (response) => {
        if (this.floatAccountId !== id || !this.isEditMode) {
          return;
        }

        const account = response.data;

        if (!account) {
          this.loadingAccount = false;
          this.accountLoadFailed = true;

          this.toastr.error('Float account details not found.', 'Error');
          return;
        }

        // ================================
        // POPULATE FORM
        // ================================

        this.branchId = account.branchId;

        this.branchSearch = `${account.branchName} (${account.branchCode})`;

        this.branchSelected = true;
        this.branchSearchStarted = false;

        this.currency = account.currency ?? 'USD';

        // Current balance is editable
        this.openingBalance = account.currentBalance ?? 0;

        this.active = account.active;

        this.loadingAccount = false;

        console.log('Branch float account loaded successfully:', account);
      },

      error: (error) => {
        if (this.floatAccountId !== id || !this.isEditMode) {
          return;
        }

        this.loadingAccount = false;
        this.accountLoadFailed = true;

        console.error('Failed to load branch float account:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load float account.', 'Error');
      },
    });
  }

  // ================================
  // LOAD BRANCH FROM LOCAL STORAGE
  // ================================

  loadLocalBranch(): void {
    // Do not override the existing account's branch
    if (this.isEditMode) {
      return;
    }

    const storedBranchId = localStorage.getItem('branchId');

    console.log('Stored branchId:', storedBranchId);

    if (!storedBranchId) {
      console.log('No branchId found in localStorage. Manual branch selection will be available.');
      return;
    }

    const parsedBranchId = Number(storedBranchId);

    if (!Number.isInteger(parsedBranchId) || parsedBranchId <= 0) {
      console.warn('Invalid branchId found in localStorage:', storedBranchId);
      return;
    }

    this.branchId = parsedBranchId;

    console.log('Branch ID loaded from localStorage:', this.branchId);
  }

  // ================================
  // RESOLVE SELECTED BRANCH
  // ================================

  resolveSelectedBranch(): void {
    if (this.isEditMode || !this.branchId || this.loadingBranches) {
      return;
    }

    const branch = this.branches().find((item) => item.id === this.branchId);

    if (branch) {
      this.branchSearch = `${branch.name} (${branch.code})`;
      this.branchSelected = true;
      this.branchSearchStarted = false;

      console.log('Automatically selected branch:', branch);
    } else if (this.branches().length > 0) {
      console.warn('Assigned branch was not found in active branches:', this.branchId);

      this.branchId = null;
      this.branchSearch = '';
      this.branchSelected = false;
      this.branchSearchStarted = false;

      this.toastr.warning(
        'Your assigned branch could not be found. Please select a branch.',
        'Branch Information',
      );
    }
  }

  // ================================
  // LOAD ACTIVE BRANCHES
  // ================================

  loadBranches(): void {
    this.loadingBranches = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/branches/active';

    console.log('Loading active branches:', endpoint);

    this.http.get<BranchResponse>(endpoint).subscribe({
      next: (response) => {
        this.branches.set(response.data ?? []);
        this.loadingBranches = false;

        /*
         * Only resolve the local branch in create mode.
         * In edit mode, GET by ID provides the branch.
         */

        if (!this.isEditMode) {
          this.resolveSelectedBranch();
        }
      },

      error: (error) => {
        this.loadingBranches = false;

        console.error('Failed to load active branches:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load active branches.', 'Error');
      },
    });
  }

  // ================================
  // BRANCH SEARCH
  // ================================

  onBranchSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.branchSearch = input.value;

    this.branchSearchStarted = this.branchSearch.trim().length > 0;

    this.branchId = null;
    this.branchSelected = false;
  }

  // ================================
  // BRANCH FOCUS
  // ================================

  onBranchFocus(): void {
    if (!this.branchSearch.trim()) {
      this.branchSearchStarted = false;
    }
  }

  // ================================
  // SELECT BRANCH
  // ================================

  selectBranch(branch: Branch): void {
    this.branchId = branch.id;

    this.branchSearch = `${branch.name} (${branch.code})`;

    this.branchSelected = true;
    this.branchSearchStarted = false;

    console.log('Manually selected branch:', branch);
  }

  // ================================
  // CLEAR BRANCH
  // ================================

  clearBranch(): void {
    this.branchId = null;
    this.branchSearch = '';
    this.branchSelected = false;
    this.branchSearchStarted = false;

    console.log('Branch selection cleared.');
  }

  // ================================
  // BACK
  // ================================

  goBack(): void {
    this.router.navigate(['/cash-floats']);
  }

  // ================================
  // VALIDATE BALANCE
  // ================================

  isBalanceValid(): boolean {
    return (
      this.openingBalance !== null &&
      Number.isFinite(Number(this.openingBalance)) &&
      Number(this.openingBalance) >= 0
    );
  }

  // ================================
  // SAVE FLOAT ACCOUNT
  // ================================

  saveFloatAccount(): void {
    if (this.loading || this.loadingAccount || this.accountLoadFailed) {
      return;
    }

    if (this.isEditMode) {
      this.updateFloatAccount();
    } else {
      this.createFloatAccount();
    }
  }

  // ================================
  // CREATE FLOAT ACCOUNT
  // ================================

  createFloatAccount(): void {
    // ================================
    // VALIDATE BRANCH
    // ================================

    if (!this.branchId) {
      this.toastr.warning('Please select a branch.', 'Validation');
      return;
    }

    // ================================
    // ACTIONED BY
    // ================================

    const actionedBy = localStorage.getItem('username') || localStorage.getItem('fullName') || '';

    if (!actionedBy.trim()) {
      this.toastr.warning('User information was not found. Please login again.', 'Validation');
      return;
    }

    // ================================
    // VALIDATE BALANCE
    // ================================

    if (!this.isBalanceValid()) {
      this.toastr.warning('Please enter a valid opening balance.', 'Validation');
      return;
    }

    // ================================
    // REQUEST
    // ================================

    const request: CreateBranchFloatRequest = {
      branchId: this.branchId,
      currency: this.currency,
      openingBalance: Number(this.openingBalance),
      actionedBy: actionedBy.trim(),
    };

    console.log('CreateBranchFloatRequest:', request);

    // ================================
    // SUBMIT
    // ================================

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/branch-floats';

    console.log('Creating branch float account:', endpoint);

    this.http.post(endpoint, request).subscribe({
      next: (response) => {
        console.log('Branch float account created successfully:', response);

        this.loading = false;

        this.toastr.success('Float account created successfully.', 'Success');

        this.router.navigate(['/cash-floats']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create branch float account:', error);

        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || error?.error?.error || 'Failed to create float account.',
          'Error',
        );
      },
    });
  }

  // ================================
  // UPDATE FLOAT ACCOUNT
  // ================================

  updateFloatAccount(): void {
    // ================================
    // VALIDATE ACCOUNT ID
    // ================================

    if (!this.floatAccountId) {
      this.toastr.warning('Float account ID is missing.', 'Validation');
      return;
    }

    // ================================
    // VALIDATE BRANCH
    // ================================

    if (!this.branchId) {
      this.toastr.warning('Please select a branch.', 'Validation');
      return;
    }

    // ================================
    // VALIDATE BALANCE
    // ================================

    if (!this.isBalanceValid()) {
      this.toastr.warning('Please enter a valid current balance.', 'Validation');
      return;
    }

    // ================================
    // ACTIONED BY
    // ================================

    const actionedBy = localStorage.getItem('username') || localStorage.getItem('fullName') || '';

    if (!actionedBy.trim()) {
      this.toastr.warning('User information was not found. Please login again.', 'Validation');
      return;
    }

    // ================================
    // REQUEST
    // ================================

    const request: UpdateBranchFloatRequest = {
      branchId: this.branchId,
      currency: this.currency,
      openingBalance: Number(this.openingBalance),
      active: this.active,
      actionedBy: actionedBy.trim(),
    };

    console.log('UpdateBranchFloatRequest:', request);

    // ================================
    // SUBMIT
    // ================================

    this.loading = true;

    const endpoint =
      this.masterService.getBackendService() + `api/v1/branch-floats/${this.floatAccountId}`;

    console.log('Updating branch float account:', endpoint);

    this.http.put<any>(endpoint, request).subscribe({
      next: (response) => {
        console.log('Branch float account updated successfully:', response);

        this.loading = false;

        this.toastr.success(response?.message || 'Float account updated successfully.', 'Success');

        this.router.navigate(['/cash-floats']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to update branch float account:', error);

        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || error?.error?.error || 'Failed to update float account.',
          'Error',
        );
      },
    });
  }
}
