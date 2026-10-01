import { Component } from '@angular/core';
import { Footer } from '../footer/footer';
import { NavBar } from '../nav-bar/nav-bar';

@Component({
  selector: 'app-car-hire',
  imports: [NavBar, Footer],
  templateUrl: './car-hire.html',
  styleUrl: './car-hire.css',
})
export class CarHire {}
