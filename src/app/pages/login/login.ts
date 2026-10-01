import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

import { Master } from '../../core/services/master';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);

  username = '';
  password = '';

  rememberMe = false;
  showPassword = false;
  loading = false;

  onLogin(): void {
    if (!this.username.trim() || !this.password) {
      this.toastr.warning('Please enter your username and password', 'Login');

      return;
    }

    const payload = {
      username: this.username.trim(),
      password: this.password,
    };

    this.loading = true;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.http
      .post<any>(this.masterService.getBackendService() + 'api/v1/auth/login', payload, { headers })
      .subscribe({
        next: (res) => {
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('tokenType', res.tokenType);
          localStorage.setItem('expiresIn', res.expiresInSeconds);
          localStorage.setItem('username', res.user.username);
          localStorage.setItem('role', res.user.role);
          localStorage.setItem('fullName', res.user.fullName);
          localStorage.setItem('userId', res.user.id);

          if (res.user.branchId !== null && res.user.branchId !== undefined) {
            localStorage.setItem('branchId', res.user.branchId);
          } else {
            localStorage.removeItem('branchId');
          }

          if (res.user.branchName) {
            localStorage.setItem('branchName', res.user.branchName);
          } else {
            localStorage.removeItem('branchName');
          }

          this.loading = false;
          this.toastr.success('Login successful!', 'Success');
          this.masterService.onLogin.next(true);
          this.router.navigate(['/dashboard']);
        },

        error: (error) => {
          console.error('Login failed:', error);
          this.loading = false;

          const message =
            error?.error?.message || error?.error?.error || 'Invalid username or password';

          this.toastr.error(message, 'Login Failed');
        },
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
