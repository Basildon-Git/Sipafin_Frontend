import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';
import { BranchModel, BranchResponse } from '../../../core/models/branches-model';
import { Branch } from '../../banking/new-loan/new-loan';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [],
  templateUrl: './branches.html',
  styleUrl: './branches.css',
})
export class Branches implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  searchTerm = signal('');

  branches = signal<Branch[]>([]);

  loading = signal(false);

  filteredBranches = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.branches();
    }

    return this.branches().filter(
      (branch) =>
        branch.name.toLowerCase().includes(search) ||
        branch.code.toLowerCase().includes(search) ||
        (branch.location ?? '').toLowerCase().includes(search),
    );
  });

  totalBranches = computed(() => this.branches().length);

  activeBranches = computed(() => this.branches().filter((branch) => branch.active).length);

  inactiveBranches = computed(() => this.branches().filter((branch) => !branch.active).length);

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loading.set(true);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.http
      .get<BranchResponse>(this.masterService.getBackendService() + 'api/v1/branches', { headers })
      .subscribe({
        next: (response) => {
          this.branches.set(response.data ?? []);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);

          console.error('Error loading branches:', error);

          this.toastr.error(error?.error?.message || 'Failed to load branches.', 'Error');
        },
      });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  createBranch(): void {
    this.router.navigate(['/branches/new']);
  }

  viewBranch(branch: BranchModel): void {
    this.router.navigate(['/branches', branch.id]);
  }

  editBranch(branch: BranchModel): void {
    this.router.navigate(['/branches', branch.id, 'edit']);
  }

  toggleStatus(branch: Branch): void {
    const activating = !branch.active;

    const endpoint =
      this.masterService.getBackendService() +
      `api/v1/branches/${branch.id}/${activating ? 'activate' : 'deactivate'}`;

    const actionedBy = localStorage.getItem('username') || '';

    const payload = {
      actionedBy: actionedBy,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.http.put(endpoint, payload, { headers }).subscribe({
      next: () => {
        this.branches.update((branches) =>
          branches.map((item) => (item.id === branch.id ? { ...item, active: activating } : item)),
        );

        this.toastr.success(
          `Branch ${activating ? 'activated' : 'deactivated'} successfully.`,
          'Success',
        );
      },

      error: (error) => {
        console.error('Branch status update failed:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || `Failed to ${activating ? 'activate' : 'deactivate'} branch.`,
          'Error',
        );
      },
    });
  }

  deleteBranch(branch: BranchModel): void {
    const confirmed = confirm(`Are you sure you want to delete "${branch.name}"?`);

    if (!confirmed) {
      return;
    }

    this.branches.update((branches) => branches.filter((item) => item.id !== branch.id));
  }
}
