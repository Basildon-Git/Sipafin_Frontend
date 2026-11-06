import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements AfterViewInit, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private cleanups: Array<() => void> = [];

  year = new Date().getFullYear();
  showTop = false;

  private readonly reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const root = this.host.nativeElement;

      // Reveal on scroll
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

      // Magnetic button
      if (!this.reduce) {
        root.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
          const move = (ev: PointerEvent): void => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--tx', `${(ev.clientX - (r.left + r.width / 2)) * 0.2}px`);
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
    });
  }

  ngOnDestroy(): void {
    this.cleanups.forEach((fn) => fn());
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const show = window.scrollY > 600;
    if (show !== this.showTop) this.showTop = show;
  }

  scrollTop(): void {
    window.scrollTo({ top: 0, behavior: this.reduce ? 'auto' : 'smooth' });
  }
}
