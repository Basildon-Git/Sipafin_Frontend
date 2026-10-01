import { Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

export interface Commission {
  id: number;

  branch: {
    id: number;
    name: string;
    code: string;
  };

  bank: {
    id: number;
    name: string;
    code: string;
  };

  bankAccount: {
    id: number;
    accountName: string;
    accountNumber: string;
    currency: string;
  } | null;

  amount: number;

  commissionDate: string;

  destination: 'BANK_ACCOUNT' | 'CASH' | 'OTHER';

  status: 'RECEIVED' | 'PENDING' | 'PROCESSED' | 'CANCELLED';

  reference: string | null;

  description: string | null;
}

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './commissions.html',
  styleUrl: './commissions.css',
})
export class Commissions {
  constructor(private router: Router) {}

  searchTerm = signal('');

  commissions = signal<Commission[]>([
    {
      id: 1,
      branch: {
        id: 1,
        name: 'Head Office',
        code: 'HO',
      },
      bank: {
        id: 1,
        name: 'CBZ Bank',
        code: 'CBZ',
      },
      bankAccount: {
        id: 1,
        accountName: 'GreenFuel Main Account',
        accountNumber: '012345678901',
        currency: 'USD',
      },
      amount: 12500.5,
      commissionDate: '2026-08-28',
      destination: 'BANK_ACCOUNT',
      status: 'RECEIVED',
      reference: 'COM-2026-0001',
      description: 'August commission',
    },
    {
      id: 2,
      branch: {
        id: 2,
        name: 'Harare Branch',
        code: 'HAR',
      },
      bank: {
        id: 2,
        name: 'FBC Bank',
        code: 'FBC',
      },
      bankAccount: {
        id: 2,
        accountName: 'Operations Account',
        accountNumber: '456789123456',
        currency: 'USD',
      },
      amount: 8750.0,
      commissionDate: '2026-08-25',
      destination: 'BANK_ACCOUNT',
      status: 'PROCESSED',
      reference: 'COM-2026-0002',
      description: 'Branch commission',
    },
    {
      id: 3,
      branch: {
        id: 3,
        name: 'Mutare Branch',
        code: 'MUT',
      },
      bank: {
        id: 3,
        name: 'Stanbic Bank Zimbabwe',
        code: 'STANBIC',
      },
      bankAccount: null,
      amount: 5200.75,
      commissionDate: '2026-08-20',
      destination: 'CASH',
      status: 'PENDING',
      reference: 'COM-2026-0003',
      description: 'Cash commission',
    },
    {
      id: 4,
      branch: {
        id: 4,
        name: 'Gweru Branch',
        code: 'GWE',
      },
      bank: {
        id: 4,
        name: 'Nedbank Zimbabwe',
        code: 'NED',
      },
      bankAccount: {
        id: 4,
        accountName: 'Capital Projects Account',
        accountNumber: '001234567890',
        currency: 'USD',
      },
      amount: 15000.0,
      commissionDate: '2026-08-15',
      destination: 'BANK_ACCOUNT',
      status: 'CANCELLED',
      reference: 'COM-2026-0004',
      description: 'Cancelled commission',
    },
  ]);

  filteredCommissions = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.commissions();
    }

    return this.commissions().filter(
      (commission) =>
        commission.branch.name.toLowerCase().includes(search) ||
        commission.branch.code.toLowerCase().includes(search) ||
        commission.bank.name.toLowerCase().includes(search) ||
        commission.bank.code.toLowerCase().includes(search) ||
        commission.bankAccount?.accountName.toLowerCase().includes(search) ||
        commission.bankAccount?.accountNumber.toLowerCase().includes(search) ||
        commission.destination.toLowerCase().includes(search) ||
        commission.status.toLowerCase().includes(search) ||
        (commission.reference ?? '').toLowerCase().includes(search) ||
        (commission.description ?? '').toLowerCase().includes(search),
    );
  });

  totalCommissions = computed(() => this.commissions().length);

  receivedCommissions = computed(
    () => this.commissions().filter((commission) => commission.status === 'RECEIVED').length,
  );

  pendingCommissions = computed(
    () => this.commissions().filter((commission) => commission.status === 'PENDING').length,
  );

  totalAmount = computed(() =>
    this.commissions().reduce((total, commission) => total + commission.amount, 0),
  );

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
  }

  createCommission(): void {
    this.router.navigate(['/commissions/new']);
  }

  viewCommission(commission: Commission): void {
    this.router.navigate(['/commissions', commission.id]);
  }

  editCommission(commission: Commission): void {
    this.router.navigate(['/commissions/edit', commission.id]);
  }

  deleteCommission(commission: Commission): void {
    const confirmed = confirm(
      `Are you sure you want to delete commission "${commission.reference ?? commission.id}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.commissions.update((commissions) =>
      commissions.filter((item) => item.id !== commission.id),
    );
  }

  getStatusClass(status: Commission['status']): string {
    return status.toLowerCase();
  }

  getDestinationLabel(destination: Commission['destination']): string {
    switch (destination) {
      case 'BANK_ACCOUNT':
        return 'Bank Account';

      case 'CASH':
        return 'Cash';

      case 'OTHER':
        return 'Other';

      default:
        return destination;
    }
  }

  maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) {
      return accountNumber;
    }

    return `•••• ${accountNumber.slice(-4)}`;
  }
}
