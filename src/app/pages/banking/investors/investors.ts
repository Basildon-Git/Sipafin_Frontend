import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Master } from '../../../core/services/master';

interface Investor {
  id: number;
  fullName: string;
  phoneNumber: string;
  nationalId: string | null;
  address: string | null;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InvestorResponse {
  status: number;
  message: string;
  data: Investor[];
  timestamp: string;
}

@Component({
  selector: 'app-investors',
  standalone: true,
  imports: [],
  templateUrl: './investors.html',
  styleUrl: './investors.css',
})
export class Investors {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly router = inject(Router);

  searchTerm = signal('');

  investors = signal<Investor[]>([]);

  loading = signal(false);

  filteredInvestors = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.investors();
    }

    return this.investors().filter(
      (investor) =>
        investor.fullName.toLowerCase().includes(search) ||
        investor.phoneNumber.toLowerCase().includes(search) ||
        (investor.nationalId ?? '').toLowerCase().includes(search) ||
        (investor.address ?? '').toLowerCase().includes(search),
    );
  });

  totalInvestors = computed(() => this.investors().length);

  activeInvestors = computed(() => this.investors().filter((investor) => investor.active).length);

  inactiveInvestors = computed(
    () => this.investors().filter((investor) => !investor.active).length,
  );

  constructor() {
    this.loadInvestors();
  }

  // ================================
  // LOAD INVESTORS
  // ================================

  loadInvestors(): void {
    this.loading.set(true);

    const endpoint = this.masterService.getBackendService() + 'api/v1/investors';

    this.http.get<InvestorResponse>(endpoint).subscribe({
      next: (response) => {
        this.investors.set(response.data ?? []);
        this.loading.set(false);
      },

      error: (error) => {
        this.loading.set(false);

        console.error('Failed to load investors:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(error?.error?.message || 'Failed to load investors.', 'Error');
      },
    });
  }

  // ================================
  // SEARCH
  // ================================

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
  }

  // ================================
  // NAVIGATION
  // ================================

  createInvestor(): void {
    this.router.navigate(['/investors/new']);
  }

  viewInvestor(investor: Investor): void {
    this.router.navigate(['/investors', investor.id]);
  }

  editInvestor(investor: Investor): void {
    this.router.navigate(['/investors', investor.id, 'edit']);
  }

  loans(): void {
    this.router.navigate(['/loans']);
  }

  loanTransactions(): void {
    this.router.navigate(['/loan-transactions']);
  }

  // ================================
  // ACTIVATE / DEACTIVATE
  // ================================

  toggleStatus(investor: Investor): void {
    const activating = !investor.active;

    const endpoint =
      this.masterService.getBackendService() +
      `api/v1/investors/${investor.id}/${activating ? 'activate' : 'deactivate'}`;

    const actionedBy = localStorage.getItem('username') || '';

    const payload = {
      actionedBy,
    };

    this.http.put(endpoint, payload).subscribe({
      next: () => {
        this.investors.update((investors) =>
          investors.map((item) =>
            item.id === investor.id
              ? {
                  ...item,
                  active: activating,
                }
              : item,
          ),
        );

        this.toastr.success(
          `Investor ${activating ? 'activated' : 'deactivated'} successfully.`,
          'Success',
        );
      },

      error: (error) => {
        console.error('Investor status update failed:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Response:', error.error);

        this.toastr.error(
          error?.error?.message || `Failed to ${activating ? 'activate' : 'deactivate'} investor.`,
          'Error',
        );
      },
    });
  }

  // ================================
  // DELETE
  // ================================

  deleteInvestor(investor: Investor): void {
    const confirmed = confirm(`Are you sure you want to delete "${investor.fullName}"?`);

    if (!confirmed) {
      return;
    }

    this.investors.update((investors) => investors.filter((item) => item.id !== investor.id));
  }

  // ================================
  // INITIALS
  // ================================

  getInitials(fullName: string): string {
    return fullName
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join('');
  }
}
