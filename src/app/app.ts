// File: .\app\app.ts
import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'; // Import RouterLink and RouterLinkActive

import { ThreeService } from './services/three.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], // Add RouterLink and RouterLinkActive
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  constructor(private threeService: ThreeService) {}

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.threeService.returnToGeneralView();
  }
}