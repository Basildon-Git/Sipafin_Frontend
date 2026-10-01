import { Component, EventEmitter, inject, Output } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Master } from '../../core/services/master';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [],
  templateUrl: './top-nav.html',
  styleUrl: './top-nav.css',
})
export class TopNav {
  @Output() menuToggle = new EventEmitter<void>();

  router = inject(Router);

  loggedUserName: string = '';
  initials: string = '';
  role: string = '';
  branchName: string = '';

  constructor(private masterService: Master) {
    this.readLoggedData();

    this.masterService.onLogin.subscribe(() => {
      this.readLoggedData();
    });
  }

  searchOpen = false;
  notificationsOpen = false;
  profileOpen = false;

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    this.profileOpen = false;
  }

  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
    this.notificationsOpen = false;
  }

  openMenu(): void {
    this.menuToggle.emit();
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
    const loggedData = localStorage.getItem('username');
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

  logout(): void {
    Swal.fire({
      title: 'Logout?',
      text: 'Do you want to end your current session?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-box-arrow-right"></i> Logout',
      cancelButtonText: 'Stay Logged In',
      confirmButtonColor: '#063b80',
      cancelButtonColor: '#0756b8',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('username');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');

        this.readLoggedData();
        this.loggedUserName = '';
        this.initials = '';

        this.router.navigateByUrl('login');

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Logged out successfully',
          showConfirmButton: false,
          timer: 2000,
        });
      }
    });
  }
}
