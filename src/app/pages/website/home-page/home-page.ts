import { Component } from '@angular/core';
import { NavBar } from '../nav-bar/nav-bar';
import { Footer } from '../footer/footer';
import { GalleryShowcase } from '../gallery-showcase/gallery-showcase';

@Component({
  selector: 'app-home-page',
  imports: [NavBar, Footer, GalleryShowcase],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {}
