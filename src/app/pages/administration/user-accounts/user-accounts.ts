import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { UserAccount } from '../../../core/models/user-account-model';
import { Master } from '../../../core/services/master';

@Component({
  selector: 'app-user-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-accounts.html',
  styleUrl: './user-accounts.css',
})
export class UserAccounts implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly service = inject(Master);

  searchTerm = signal('');
  users = signal<UserAccount[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);

    this.http
      .get<UserAccount[]>(this.service.getBackendService() + 'api/v1/users/getAll')
      .subscribe({
        next: (response) => {
          this.users.set(response ?? []);

          this.loading.set(false);
        },

        error: (error) => {
          console.error('Failed to load users:', error);
          this.loading.set(false);

          const message =
            error?.error?.message || error?.error?.error || 'Failed to load user accounts';
          this.toastr.error(message, 'Error');
        },
      });
  }

  filteredUsers = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.users();
    }

    return this.users().filter(
      (user) =>
        user.fullName?.toLowerCase().includes(search) ||
        user.username?.toLowerCase().includes(search) ||
        user.role?.toLowerCase().includes(search) ||
        user.branchName?.toLowerCase().includes(search),
    );
  });

  createUser(): void {
    this.router.navigate(['/users/new']);
  }

  viewUser(user: UserAccount): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: UserAccount): void {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  toggleStatus(user: UserAccount): void {
    const endpoint = user.enabled
      ? this.service.getBackendService() + 'api/v1/users/' + user.id + '/disable'
      : this.service.getBackendService() + 'api/v1/users/' + user.id + '/enable';

    const action = user.enabled ? 'disable' : 'enable';

    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.users.update((users) =>
          users.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  enabled: !item.enabled,
                }
              : item,
          ),
        );

        this.toastr.success(`User account ${action}d successfully`, 'Success');
      },

      error: (error) => {
        console.error(`Failed to ${action} user:`, error);

        const message =
          error?.error?.message || error?.error?.error || `Failed to ${action} user account`;

        this.toastr.error(message, 'Error');
      },
    });
  }

  deleteUser(user: UserAccount): void {
    const confirmed = confirm(`Are you sure you want to delete ${user.fullName}?`);

    if (!confirmed) {
      return;
    }
    this.users.update((users) => users.filter((item) => item.id !== user.id));
  }

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join('');
  }

  formatDate(date: string | null | undefined): string {
    if (!date) {
      return '-';
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
