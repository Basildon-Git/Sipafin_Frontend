import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { UserRole, RegisterUserRequest } from '../../../core/models/user-account-model';
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

@Component({
  selector: 'app-new-user-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-user-account.html',
  styleUrl: './new-user-account.css',
})
export class NewUserAccount {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly service = inject(Master);

  fullName = '';
  username = '';
  password = '';

  role: UserRole | '' = '';

  branchId: number | null = null;
  branchSearch = '';

  showPassword = false;
  loading = false;
  loadingBranches = false;

  showBranchResults = signal(false);

  roles: UserRole[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'BRANCH_USER', 'AUDITOR'];

  branches = signal<Branch[]>([]);

  filteredBranches = computed(() => {
    const search = this.branchSearch.trim().toLowerCase();

    const activeBranches = this.branches().filter((branch) => branch.active);

    if (!search) {
      return activeBranches;
    }

    return activeBranches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(search) ||
        branch.code.toLowerCase().includes(search) ||
        (branch.location ?? '').toLowerCase().includes(search),
    );
  });

  constructor() {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loadingBranches = true;

    this.http.get<BranchResponse>(this.service.getBackendService() + 'api/v1/branches').subscribe({
      next: (response) => {
        this.branches.set(response.data ?? []);
        this.loadingBranches = false;
      },

      error: (error) => {
        this.loadingBranches = false;

        console.error('Failed to load branches:', error);

        this.toastr.error(error?.error?.message || 'Failed to load branches', 'Error');
      },
    });
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.id;
    this.branchSearch = `${branch.name} (${branch.code})`;
    this.showBranchResults.set(false);
  }

  clearBranch(): void {
    this.branchId = null;
    this.branchSearch = '';
    this.showBranchResults.set(true);
  }

  onBranchFocus(): void {
    this.showBranchResults.set(true);
  }

  onBranchSearch(): void {
    this.branchId = null;
    this.showBranchResults.set(true);
  }

  onBranchBlur(): void {
    setTimeout(() => {
      this.showBranchResults.set(false);
    }, 200);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  createUser(): void {
    if (!this.fullName.trim() || !this.username.trim() || !this.password || !this.role) {
      this.toastr.warning('Please complete all required fields', 'Validation');

      return;
    }

    const request: RegisterUserRequest = {
      fullName: this.fullName.trim(),
      username: this.username.trim(),
      password: this.password,
      role: this.role,
      branchId: this.branchId,
    };

    console.log('RegisterUserRequest:', request);

    this.loading = true;

    this.http.post(this.service.getBackendService() + 'api/v1/auth/register', request).subscribe({
      next: (response) => {
        console.log('User registered successfully:', response);

        this.loading = false;

        this.toastr.success('User account created successfully', 'Success');

        this.router.navigate(['/users']);
      },

      error: (error) => {
        console.error('Failed to register user:', error);

        this.loading = false;

        const message =
          error?.error?.message || error?.error?.error || 'Failed to create user account';

        this.toastr.error(message, 'Registration Failed');
      },
    });
  }
}
