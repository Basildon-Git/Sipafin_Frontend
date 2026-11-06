import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
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
export class Login implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('brand', { static: true }) brand!: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly masterService = inject(Master);
  private readonly zone = inject(NgZone);

  username = '';
  password = '';

  rememberMe = false;
  showPassword = false;
  loading = false;

  capsLock = false;
  shake = false;

  private readonly rememberKey = 'rememberedUsername';
  private cleanup: Array<() => void> = [];

  ngOnInit(): void {
    const saved = localStorage.getItem(this.rememberKey);
    if (saved) {
      this.username = saved;
      this.rememberMe = true;
    }
  }

  ngAfterViewInit(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    // Hero glows drift with the pointer (outside Angular, so no change detection per move)
    this.zone.runOutsideAngular(() => {
      const el = this.brand.nativeElement;
      const move = (ev: PointerEvent): void => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--px', `${((ev.clientX - r.left) / r.width - 0.5) * 50}px`);
        el.style.setProperty('--py', `${((ev.clientY - r.top) / r.height - 0.5) * 50}px`);
      };
      el.addEventListener('pointermove', move);
      this.cleanup.push(() => el.removeEventListener('pointermove', move));
    });
  }

  ngOnDestroy(): void {
    this.cleanup.forEach((fn) => fn());
  }

  onLogin(): void {
    if (!this.username.trim() || !this.password) {
      this.toastr.warning('Please enter your username and password', 'Login');
      this.triggerShake();
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

          // Remember only the username (never the password)
          if (this.rememberMe) {
            localStorage.setItem(this.rememberKey, this.username.trim());
          } else {
            localStorage.removeItem(this.rememberKey);
          }

          this.loading = false;
          this.toastr.success('Login successful!', 'Success');
          this.masterService.onLogin.next(true);
          this.router.navigate(['/dashboard']);
        },

        error: (error) => {
          console.error('Login failed:', error);
          this.loading = false;
          this.triggerShake();

          const message =
            error?.error?.message || error?.error?.error || 'Invalid username or password';

          this.toastr.error(message, 'Login Failed');
        },
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  checkCaps(ev: KeyboardEvent): void {
    this.capsLock = ev.getModifierState?.('CapsLock') ?? false;
  }

  private triggerShake(): void {
    this.shake = false;
    // restart the animation if it is already running
    setTimeout(() => {
      this.shake = true;
      setTimeout(() => (this.shake = false), 600);
    }, 0);
  }
}
