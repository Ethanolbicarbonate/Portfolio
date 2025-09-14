// File: .\app\app.ts
import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThreeService } from './services/three.service';

// Import Angular animation functions
import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
  sequence // Use sequence for explicit order
} from '@angular/animations';

// Define the route animation trigger
export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [ // Apply to all route transitions
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%' // Ensure both components cover the full area
      })
    ], { optional: true }),
    query(':enter', [
      style({ opacity: 0 })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('0.5s ease-out', style({ opacity: 0 })) // Faster fade out for leaving component
      ], { optional: true }),
      query(':enter', [
        animate('0.5s ease-in', style({ opacity: 1 })) // Slower fade in for entering component
      ], { optional: true })
    ])
  ])
]);


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  animations: [routeAnimations] // Add the animation trigger here
})
export class App {
  constructor(private threeService: ThreeService) {}

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.threeService.returnToGeneralView();
  }
}