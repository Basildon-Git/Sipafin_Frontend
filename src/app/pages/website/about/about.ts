import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';
import { Footer } from '../footer/footer';
import { NavBar } from '../nav-bar/nav-bar';

@Component({
  selector: 'app-about',
  imports: [NavBar, Footer],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About implements AfterViewInit, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private cleanups: Array<() => void> = [];

  private readonly reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ngAfterViewInit(): void {
    // Pure DOM work, so keep it out of Angular's change detection
    this.zone.runOutsideAngular(() => {
      const root = this.host.nativeElement;

      this.observe(root, '.reveal', 0.15);
      this.observe(root, '.timeline', 0.3);
      this.initCounters(root);

      if (!this.reduce) {
        this.initTilt(root);
        this.initMagnetic(root);
        this.initHeroLight(root);
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanups.forEach((fn) => fn());
  }

  /** Adds the `in` class once an element scrolls into view */
  private observe(root: HTMLElement, selector: string, threshold: number): void {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold },
    );
    root.querySelectorAll(selector).forEach((el) => io.observe(el));
    this.cleanups.push(() => io.disconnect());
  }

  /** Count numbers up from 0 when visible */
  private initCounters(root: HTMLElement): void {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = Number(el.dataset['count'] ?? 0);
          io.unobserve(el);
          if (this.reduce) {
            el.textContent = String(target);
            return;
          }
          const t0 = performance.now();
          const tick = (now: number): void => {
            const p = Math.min((now - t0) / 1300, 1);
            el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      { threshold: 0.6 },
    );
    root.querySelectorAll('[data-count]').forEach((el) => io.observe(el));
    this.cleanups.push(() => io.disconnect());
  }

  /** 3D tilt + moving highlight on .tilt cards */
  private initTilt(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('.tilt').forEach((el) => {
      const move = (ev: PointerEvent): void => {
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width;
        const y = (ev.clientY - r.top) / r.height;
        el.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
        el.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
      };
      const leave = (): void => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      this.cleanups.push(() => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      });
    });
  }

  /** Buttons gently pull toward the cursor */
  private initMagnetic(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
      const move = (ev: PointerEvent): void => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--tx', `${(ev.clientX - (r.left + r.width / 2)) * 0.22}px`);
        el.style.setProperty('--ty', `${(ev.clientY - (r.top + r.height / 2)) * 0.28}px`);
      };
      const leave = (): void => {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      this.cleanups.push(() => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      });
    });
  }

  /** Hero glow orbs drift opposite to the pointer */
  private initHeroLight(root: HTMLElement): void {
    const hero = root.querySelector<HTMLElement>('.page-hero');
    if (!hero) return;
    const move = (ev: PointerEvent): void => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--px', `${((ev.clientX - r.left) / r.width - 0.5) * 60}px`);
      hero.style.setProperty('--py', `${((ev.clientY - r.top) / r.height - 0.5) * 60}px`);
    };
    hero.addEventListener('pointermove', move);
    this.cleanups.push(() => hero.removeEventListener('pointermove', move));
  }
}
