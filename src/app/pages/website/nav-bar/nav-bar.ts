import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar implements AfterViewInit, OnDestroy {
  @ViewChild('nav', { static: true }) nav!: ElementRef<HTMLElement>;

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  scrolled = false;
  hidden = false;
  open = false;
  active = '';

  /** Section ids on the home page that the highlight follows */
  private sections = ['services', 'agency', 'contact'];
  private lastY = 0;
  private ticking = false;

  private readonly onScroll = (): void => {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.update();
      this.ticking = false;
    });
  };

  ngAfterViewInit(): void {
    // Scroll work runs outside Angular so it doesn't trigger change detection every frame
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    });
    this.lastY = window.scrollY;
    this.update();
    setTimeout(() => this.rest(), 0);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    document.body.style.overflow = '';
  }

  private update(): void {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    // Progress is written straight to a CSS variable (no re-render)
    this.host.nativeElement.style.setProperty('--p', String(max > 0 ? Math.min(y / max, 1) : 0));

    const scrolled = y > 24;

    // Hide on scroll down, show on scroll up
    let hidden = this.hidden;
    const delta = y - this.lastY;
    if (Math.abs(delta) > 6) {
      hidden = delta > 0 && y > 400 && !this.open;
      this.lastY = y;
    }
    if (y <= 400 || this.open) hidden = false;

    // Which section is under the top third of the viewport?
    let current = '';
    for (const id of this.sections) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) current = id;
    }

    const changed = scrolled !== this.scrolled || hidden !== this.hidden || current !== this.active;

    if (changed) {
      this.scrolled = scrolled;
      this.hidden = hidden;
      this.active = current;
      this.cdr.detectChanges();
      this.rest();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.rest();
    if (window.innerWidth > 860 && this.open) this.close();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open) this.close();
  }

  // ---- Sliding highlight ----
  hover(ev: Event): void {
    this.moveTo(ev.currentTarget as HTMLElement);
  }

  rest(): void {
    const el = this.nav.nativeElement.querySelector<HTMLElement>(`a[data-id="${this.active}"]`);
    this.moveTo(el);
  }

  private moveTo(el: HTMLElement | null): void {
    const n = this.nav.nativeElement;
    if (!el) {
      n.style.setProperty('--io', '0');
      return;
    }
    n.style.setProperty('--ix', `${el.offsetLeft}px`);
    n.style.setProperty('--iw', `${el.offsetWidth}px`);
    n.style.setProperty('--io', '1');
  }

  // ---- Mobile menu ----
  toggle(): void {
    this.open ? this.close() : this.openMenu();
  }

  private openMenu(): void {
    this.open = true;
    this.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.open = false;
    document.body.style.overflow = '';
  }
}
