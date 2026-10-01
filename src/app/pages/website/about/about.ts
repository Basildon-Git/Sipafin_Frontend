import { Component } from '@angular/core';
import { Footer } from '../footer/footer';
import { NavBar } from '../nav-bar/nav-bar';

@Component({
  selector: 'app-about',
  imports: [NavBar, Footer],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {}
