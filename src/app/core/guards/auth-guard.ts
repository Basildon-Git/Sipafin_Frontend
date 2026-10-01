import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const token = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  if (!username) {
    router.navigateByUrl('/login');
    return false;
  }

  if (!token) {
    toastr.error('You must login first', 'Access Denied');
    return router.parseUrl('/login');
  }

  const requiredRoles: string[] | string | undefined =
    route.data['role'] || (route.parent && route.parent.data['role']);

  if (!requiredRoles) return true;

  if (typeof requiredRoles === 'string') {
    if (userRole !== requiredRoles) {
      toastr.error('Access denied, you do not have the required authorization', 'Access Denied');
      return router.parseUrl('/unauthorised');
    }
    return true;
  }

  if (Array.isArray(requiredRoles)) {
    if (!requiredRoles.includes(userRole!)) {
      toastr.error('Access denied, you do not have the required authorization', 'Access Denied');
      return router.parseUrl('/unauthorised');
    }
    return true;
  }

  toastr.error('Access denied, you do not have the required authorization', 'Access Denied');
  return router.parseUrl('/unauthorised');
};

