import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

export interface Investor {
  id: number;
  fullName: string;
  phoneNumber: string;
  nationalId: string | null;
  active: boolean;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
}

export interface CreateLoanRequest {
  investorId: number;
  branchId: number;
  currency: string;
  principalAmount: number;
  interestRate: number;
  dateReceived: string;
  dueDate: string | null;
  reference: string;
  description: string;
  actionedBy: string;
}

interface InvestorsResponse {
  status: number;
  message: string;
  data: Investor[];
  timestamp: string;
}

interface BranchesResponse {
  status: number;
  message: string;
  data: Branch[];
  timestamp: string;
}

@Component({
  selector: 'app-new-loan',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-loan.html',
  styleUrl: './new-loan.css',
})
export class NewLoan {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  // =========================
  // Loan fields
  // =========================

  currency = 'USD';
  principalAmount = 0;
  interestRate = 0;
  dateReceived = this.getToday();
  dueDate = '';
  reference = '';
  description = '';

  // =========================
  // Currency options
  // =========================

  currencies = ['USD', 'ZIG', 'ZAR', 'EUR'];

  // =========================
  // Investor
  // =========================

  investorId: number | null = null;
  investorSearch = '';
  investorSelected = false;
  investorSearchStarted = false;

  investors = signal<Investor[]>([]);

  filteredInvestors = computed(() => {
    const search = this.investorSearch.trim().toLowerCase();

    if (!this.investorSearchStarted || !search) {
      return [];
    }

    return this.investors()
      .filter((investor) => investor.active)
      .filter(
        (investor) =>
          investor.fullName.toLowerCase().includes(search) ||
          investor.phoneNumber.toLowerCase().includes(search) ||
          (investor.nationalId ?? '').toLowerCase().includes(search),
      );
  });

  // =========================
  // Branch
  // =========================

  branchId: number | null = null;

  branchSearch = '';

  branchSelected = false;

  branchSearchStarted = false;

  branches = signal<Branch[]>([]);

  filteredBranches = computed(() => {
    const search = this.branchSearch.trim().toLowerCase();

    if (!this.branchSearchStarted || !search) {
      return [];
    }

    return this.branches()
      .filter((branch) => branch.active)
      .filter(
        (branch) =>
          branch.name.toLowerCase().includes(search) ||
          branch.code.toLowerCase().includes(search) ||
          (branch.location ?? '').toLowerCase().includes(search),
      );
  });

  // =========================
  // Form state
  // =========================

  loading = false;

  loadingInvestors = false;

  loadingBranches = false;

  // =========================
  // Constructor
  // =========================

  constructor() {
    this.loadInvestors();
    this.loadBranches();
  }

  // =========================
  // Load investors
  // =========================

  loadInvestors(): void {
    this.loadingInvestors = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/investors';

    this.http.get<InvestorsResponse>(endpoint).subscribe({
      next: (response) => {
        this.investors.set(response.data ?? []);
        this.loadingInvestors = false;
      },

      error: (error) => {
        this.loadingInvestors = false;

        console.error('Failed to load investors:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load investors.', 'Error');
      },
    });
  }

  // =========================
  // Load branches
  // =========================

  loadBranches(): void {
    this.loadingBranches = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/branches';

    this.http.get<BranchesResponse>(endpoint).subscribe({
      next: (response) => {
        this.branches.set(response.data ?? []);
        this.loadingBranches = false;

        // Try to use the branch stored in localStorage
        this.loadLocalBranch();
      },

      error: (error) => {
        this.loadingBranches = false;

        console.error('Failed to load branches:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load branches.', 'Error');
      },
    });
  }

  // =========================
  // Load branch from localStorage
  // =========================

  loadLocalBranch(): void {
    const storedBranchId = localStorage.getItem('branchId');

    if (!storedBranchId) {
      return;
    }

    const parsedBranchId = Number(storedBranchId);

    if (!Number.isFinite(parsedBranchId) || parsedBranchId <= 0) {
      return;
    }

    const branch = this.branches().find((item) => item.id === parsedBranchId && item.active);

    if (!branch) {
      return;
    }

    this.branchId = branch.id;
    this.branchSearch = `${branch.name} (${branch.code})`;
    this.branchSelected = true;
    this.branchSearchStarted = false;
  }

  // =========================
  // Investor search
  // =========================

  onInvestorSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.investorSearch = input.value;
    this.investorId = null;
    this.investorSelected = false;
    this.investorSearchStarted = input.value.trim().length > 0;
  }

  onInvestorFocus(): void {
    if (this.investorSelected) {
      return;
    }

    this.investorSearchStarted = this.investorSearch.trim().length > 0;
  }

  selectInvestor(investor: Investor): void {
    this.investorId = investor.id;

    this.investorSearch = `${investor.fullName} (${investor.phoneNumber})`;

    this.investorSelected = true;

    this.investorSearchStarted = false;
  }

  clearInvestor(): void {
    this.investorId = null;

    this.investorSearch = '';

    this.investorSelected = false;

    this.investorSearchStarted = false;
  }

  // =========================
  // Branch search
  // =========================

  onBranchSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.branchSearch = input.value;

    this.branchId = null;

    this.branchSelected = false;

    this.branchSearchStarted = input.value.trim().length > 0;
  }

  onBranchFocus(): void {
    if (this.branchSelected) {
      return;
    }

    this.branchSearchStarted = this.branchSearch.trim().length > 0;
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.id;

    this.branchSearch = `${branch.name} (${branch.code})`;

    this.branchSelected = true;

    this.branchSearchStarted = false;
  }

  clearBranch(): void {
    this.branchId = null;

    this.branchSearch = '';

    this.branchSelected = false;

    this.branchSearchStarted = false;
  }

  // =========================
  // Navigation
  // =========================

  goBack(): void {
    this.router.navigate(['/loans']);
  }

  // =========================
  // Create loan
  // =========================

  createLoan(): void {
    if (
      !this.investorId ||
      !this.branchId ||
      !this.currency ||
      this.principalAmount <= 0 ||
      !this.dateReceived
    ) {
      this.toastr.warning(
        'Please select an investor and branch, select a currency and enter a valid principal amount.',
        'Validation',
      );

      return;
    }

    const actionedBy = localStorage.getItem('username') || '';

    const request: CreateLoanRequest = {
      investorId: this.investorId,
      branchId: this.branchId,
      currency: this.currency,
      principalAmount: Number(this.principalAmount) || 0,
      interestRate: Number(this.interestRate) || 0,
      dateReceived: this.dateReceived,
      dueDate: this.dueDate || null,
      reference: this.reference.trim(),
      description: this.description.trim(),
      actionedBy: actionedBy,
    };

    console.log('CreateLoanRequest:', request);

    this.loading = true;

    const endpoint = this.masterService.getBackendService() + 'api/v1/loans/receive';

    this.http.post(endpoint, request).subscribe({
      next: (response) => {
        console.log('Loan created successfully:', response);
        this.loading = false;
        this.toastr.success('Loan created successfully.', 'Success');
        this.router.navigate(['/loans']);
      },

      error: (error) => {
        this.loading = false;

        console.error('Failed to create loan:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to create loan.', 'Error');
      },
    });
  }

  // =========================
  // Today
  // =========================

  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
