import { Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject } from '@angular/core';
import { Footer } from '../footer/footer';
import { NavBar } from '../nav-bar/nav-bar';

@Component({
  selector: 'app-car-hire',
  imports: [NavBar, Footer],
  templateUrl: './car-hire.html',
  styleUrl: './car-hire.css',
})
export class CarHire {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private cleanups: Array<() => void> = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cleanups.forEach((fn) => fn()));

    // Runs in the browser only (safe for SSR), outside Angular's change detection
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => {
        const root = this.host.nativeElement;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        this.initAnchors(root, reduce);
        this.observeReveal(root);
        this.initCounters(root, reduce);

        if (!reduce && canHover) {
          this.initTilt(root);
          this.initMagnetic(root);
          this.initHeroLight(root);
        }
      });
    });
  }

  /** Smooth in-page scrolling (avoids router/base-href issues with plain #links) */
  private initAnchors(root: HTMLElement, reduce: boolean): void {
    root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      const click = (ev: Event): void => {
        const target = root.querySelector(a.getAttribute('href') ?? '');
        if (!target) return;
        ev.preventDefault();
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      };
      a.addEventListener('click', click);
      this.cleanups.push(() => a.removeEventListener('click', click));
    });
  }

  /** Adds `in` once an element scrolls into view */
  private observeReveal(root: HTMLElement): void {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    this.cleanups.push(() => io.disconnect());
  }

  /** Count numbers up from 0 when visible (real value stays in the markup as fallback) */
  private initCounters(root: HTMLElement, reduce: boolean): void {
    const els = root.querySelectorAll<HTMLElement>('[data-count]');
    if (reduce) return;

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = Number(el.dataset['count'] ?? 0);
          io.unobserve(el);
          const t0 = performance.now();
          const tick = (now: number): void => {
            const p = Math.min((now - t0) / 1300, 1);
            el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }),
      { threshold: 0.6 },
    );
    els.forEach((el) => {
      el.textContent = '0';
      io.observe(el);
    });
    this.cleanups.push(() => {
      io.disconnect();
      cancelAnimationFrame(raf);
    });
  }

  /** 3D tilt + moving highlight on .tilt cards */
  private initTilt(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('.tilt').forEach((el) => {
      const move = (ev: PointerEvent): void => {
        if (ev.pointerType !== 'mouse') return;
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

  /** Hero glow orbs drift opposite to the pointer (batched per frame) */
  private initHeroLight(root: HTMLElement): void {
    const hero = root.querySelector<HTMLElement>('.page-hero');
    if (!hero) return;
    let raf = 0;
    const move = (ev: PointerEvent): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--px', `${((ev.clientX - r.left) / r.width - 0.5) * 60}px`);
        hero.style.setProperty('--py', `${((ev.clientY - r.top) / r.height - 0.5) * 60}px`);
      });
    };
    hero.addEventListener('pointermove', move);
    this.cleanups.push(() => {
      hero.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    });
  }
}
