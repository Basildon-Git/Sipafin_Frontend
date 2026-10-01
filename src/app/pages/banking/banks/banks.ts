import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

interface Bank {
  id: number;
  name: string;
  code: string;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BankResponse {
  status: number;
  message: string;
  data: Bank[];
  timestamp: string;
}

@Component({
  selector: 'app-banks',
  standalone: true,
  imports: [],
  templateUrl: './banks.html',
  styleUrl: './banks.css',
})
export class Banks {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  searchTerm = signal('');

  banks = signal<Bank[]>([]);

  loading = signal(false);

  filteredBanks = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.banks();
    }

    return this.banks().filter(
      (bank) =>
        bank.name.toLowerCase().includes(search) || bank.code.toLowerCase().includes(search),
    );
  });

  totalBanks = computed(() => this.banks().length);

  activeBanks = computed(() => this.banks().filter((bank) => bank.active).length);

  inactiveBanks = computed(() => this.banks().filter((bank) => !bank.active).length);

  constructor() {
    this.loadBanks();
  }

  loadBanks(): void {
    this.loading.set(true);

    this.http.get<BankResponse>(this.masterService.getBackendService() + 'api/v1/banks').subscribe({
      next: (response) => {
        this.banks.set(response.data ?? []);
        this.loading.set(false);
      },

      error: (error) => {
        this.loading.set(false);

        console.error('Failed to load banks:', error);

        this.toastr.error(error?.error?.message || 'Failed to load banks.', 'Error');
      },
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
  }

  createBank(): void {
    this.router.navigate(['/banks/new']);
  }

  viewBank(bank: Bank): void {
    this.router.navigate(['/banks', bank.id]);
  }

  editBank(bank: Bank): void {
    this.router.navigate(['/banks', bank.id, 'edit']);
  }

  toggleStatus(bank: Bank): void {
    const activating = !bank.active;

    const endpoint =
      this.masterService.getBackendService() +
      `api/v1/banks/${bank.id}/${activating ? 'activate' : 'deactivate'}`;

    const actionedBy = localStorage.getItem('username') || '';

    const payload = {
      actionedBy: actionedBy,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.http.put(endpoint, payload, { headers }).subscribe({
      next: () => {
        this.banks.update((banks) =>
          banks.map((item) =>
            item.id === bank.id
              ? {
                  ...item,
                  active: activating,
                }
              : item,
          ),
        );

        this.toastr.success(
          `Bank ${activating ? 'activated' : 'deactivated'} successfully.`,
          'Success',
        );
      },

      error: (error) => {
        console.error('Bank status update failed:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || `Failed to ${activating ? 'activate' : 'deactivate'} bank.`,
          'Error',
        );
      },
    });
  }

  deleteBank(bank: Bank): void {
    const confirmed = confirm(`Are you sure you want to delete "${bank.name}"?`);

    if (!confirmed) {
      return;
    }

    this.banks.update((banks) => banks.filter((item) => item.id !== bank.id));
  }
}
