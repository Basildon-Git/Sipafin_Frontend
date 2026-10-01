import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GalleryShowcase } from './gallery-showcase';

describe('GalleryShowcase', () => {
  let component: GalleryShowcase;
  let fixture: ComponentFixture<GalleryShowcase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryShowcase],
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryShowcase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
