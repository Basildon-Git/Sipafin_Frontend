import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-gallery-showcase',
  standalone: true,
  imports: [],
  templateUrl: './gallery-showcase.html',
  styleUrl: './gallery-showcase.css',
})
export class GalleryShowcase implements AfterViewInit, OnDestroy {
  @ViewChild('galleryRoot') galleryRoot?: ElementRef<HTMLElement>;

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const root = this.galleryRoot?.nativeElement;
    if (!root || typeof IntersectionObserver === 'undefined') {
      // Fallback: no observer support, just show everything.
      root?.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 },
    );

    root.querySelectorAll('.reveal').forEach((el) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
