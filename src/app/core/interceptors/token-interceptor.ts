import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { Master } from '../services/master';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const masterService = inject(Master);

  if (
    req.url.includes('api/v1/auth/register') ||
    req.url.includes('api/v1/auth/login') ||
    req.url.includes('api/v1/auth/refresh')
  ) {
    return next(req);
  }

  const token = localStorage.getItem('accessToken');
  const tokenType = localStorage.getItem('tokenType') ?? 'Bearer';

  let cloned = req;

  if (token) {
    cloned = req.clone({
      setHeaders: {
        Authorization: `${tokenType} ${token}`,
      },
    });
  }

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          localStorage.clear();
          return throwError(() => error);
        }

        return http
          .post<any>(masterService.getBackendService() + 'auth/refresh', {
            refreshToken,
          })
          .pipe(
            switchMap((resp) => {
              localStorage.setItem('accessToken', resp.accessToken);
              localStorage.setItem('refreshToken', resp.refreshToken);
              localStorage.setItem('tokenType', resp.tokenType ?? 'Bearer');

              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `${resp.tokenType ?? 'Bearer'} ${resp.accessToken}`,
                },
              });

              return next(retryReq);
            }),

            catchError((err) => {
              localStorage.clear();
              return throwError(() => err);
            })
          );
      }

      return throwError(() => error);
    })
  );
};
