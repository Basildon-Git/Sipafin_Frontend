import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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

export interface CreateBranchFloatRequest {
  branchId: number;
  currency: string;
  openingBalance: number;
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

  // ================================
  // FORM
  // ================================

  currency = 'USD';
  openingBalance = 0;

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

  filteredBranches = computed(() => {
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
  });

  // ================================
  // CONSTRUCTOR
  // ================================

  constructor() {
    /*
     * First try to get the user's assigned branch
     * from localStorage.
     */
    this.loadLocalBranch();

    /*
     * Always load branches.
     *
     * This is needed for:
     * 1. Displaying the branch name/code when branchId exists.
     * 2. Allowing manual branch selection when branchId
     *    does not exist.
     */
    this.loadBranches();
  }

  // ================================
  // LOAD BRANCH FROM LOCAL STORAGE
  // ================================

  loadLocalBranch(): void {
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

    /*
     * The branch details will be resolved after
     * loadBranches() completes.
     */
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
         * If a branchId was found in localStorage,
         * automatically resolve and display that branch.
         */
        if (this.branchId) {
          const branch = this.branches().find((item) => item.id === this.branchId);

          if (branch) {
            this.branchSearch = `${branch.name} (${branch.code})`;
            this.branchSelected = true;
            this.branchSearchStarted = false;

            console.log('Automatically selected branch:', branch);
          } else {
            /*
             * branchId exists but the branch was not returned.
             * Allow the user to search for another branch.
             */
            console.warn(
              'Branch from localStorage was not found in active branches:',
              this.branchId,
            );

            this.branchSearch = '';
            this.branchSelected = false;
            this.branchSearchStarted = false;

            this.toastr.warning(
              'Your assigned branch could not be found. Please select a branch.',
              'Branch Information',
            );

            /*
             * Clear the invalid ID so that the user can
             * select another branch.
             */
            this.branchId = null;
          }
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

    /*
     * If the user starts typing a different branch,
     * remove the automatically selected branch.
     */
    if (this.branchSelected) {
      this.branchId = null;
      this.branchSelected = false;
    }
  }

  // ================================
  // BRANCH FOCUS
  // ================================

  onBranchFocus(): void {
    /*
     * If there is no search text, don't show the
     * results dropdown.
     */
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
    this.router.navigate(['/petty-cash-accounts']);
  }

  // ================================
  // CREATE FLOAT ACCOUNT
  // ================================

  createFloatAccount(): void {
    /*
     * First check localStorage again.
     *
     * If it has a valid branchId, use it.
     *
     * If it doesn't, use the branch selected
     * manually from the search.
     */
    const storedBranchId = localStorage.getItem('branchId');

    if (storedBranchId) {
      const parsedBranchId = Number(storedBranchId);

      if (Number.isInteger(parsedBranchId) && parsedBranchId > 0) {
        this.branchId = parsedBranchId;

        console.log('Using branchId from localStorage:', this.branchId);
      }
    }

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

    const balance = Number(this.openingBalance);

    if (isNaN(balance) || balance < 0) {
      this.toastr.warning('Please enter a valid opening balance.', 'Validation');

      return;
    }

    // ================================
    // REQUEST
    // ================================

    const request: CreateBranchFloatRequest = {
      branchId: this.branchId,
      currency: this.currency,
      openingBalance: balance,
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

        this.router.navigate(['/petty-cash-accounts']);
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
}
