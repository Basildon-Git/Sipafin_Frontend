import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNav } from '../side-nav/side-nav';
import { TopNav } from '../top-nav/top-nav';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    SideNav,
    TopNav
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {

  sidebarCollapsed = false;
  mobileSidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  onSidebarCollapsedChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }
}