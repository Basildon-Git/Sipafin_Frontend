import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Master {
  constructor(private http: HttpClient) {}

  onLogin: Subject<boolean> = new Subject<boolean>();

  getBackendService(): string {
    return environment.apiUrl;
  }
}
