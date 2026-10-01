import { Component, EventEmitter, Input, Output, inject } from '@angular/core';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Master } from '../../core/services/master';

interface OpenGroups {
  cashManagement: boolean;
  banking: boolean;
  analytics: boolean;
  administration: boolean;
}

type GroupName = 'cashManagement' | 'banking' | 'analytics' | 'administration';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.css',
})
export class SideNav {
  @Input() collapsed = false;
  @Input() mobileOpen = false;

  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() mobileClose = new EventEmitter<void>();

  openGroups: OpenGroups = {
    cashManagement: true,
    banking: false,
    analytics: false,
    administration: false,
  };

  router = inject(Router);

  loggedUserName = '';
  initials = '';
  role = '';
  branchName = '';

  constructor(private masterService: Master) {
    this.readLoggedData();

    this.masterService.onLogin.subscribe(() => {
      this.readLoggedData();
    });
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;

    this.collapsedChange.emit(this.collapsed);
  }

  toggleGroup(group: GroupName): void {
    if (this.collapsed) {
      this.collapsed = false;

      this.collapsedChange.emit(false);
    }

    this.openGroups[group] = !this.openGroups[group];
  }

  navigate(route: string): void {
    this.router.navigate([route]);

    this.mobileClose.emit();
  }

  closeMobile(): void {
    this.mobileClose.emit();
  }

  getInitials(fullName: string): string {
    const names = fullName.trim().split(/\s+/);

    if (names.length === 0 || !names[0]) {
      return '';
    }

    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  readLoggedData(): void {
    const loggedData = localStorage.getItem('fullName');
    const roleData = localStorage.getItem('role');
    const branchData = localStorage.getItem('branchName');

    if (loggedData != null) {
      this.loggedUserName = loggedData;
      this.initials = this.getInitials(loggedData);
    } else {
      this.loggedUserName = '';
      this.initials = '';
    }

    if (roleData != null) {
      this.role = roleData;
    } else {
      this.role = '';
    }

    if (branchData != null) {
      this.branchName = branchData;
    } else {
      this.branchName = 'All Branches';
    }
  }
}
