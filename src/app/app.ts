import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

  import { Scene } from './components/scene/scene';
import { TextOverlay } from './components/text-overlay/text-overlay';

import { ThreeService } from './services/three.service';
import { PaperData } from './models/paper-data.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    Scene, 
    TextOverlay
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  focusedPaper: PaperData | null = null;

  constructor(private threeService: ThreeService) {}

  ngOnInit() {
    this.threeService.onFocusChange.subscribe((data) => {
      this.focusedPaper = data;
    });
  }
  @HostListener('window:keydown.escape') // <-- REMOVED ['$event']
  onEscapeKey(): void { // <-- REMOVED the 'event' parameter
    this.returnToGeneralView();
  }
  public returnToGeneralView(): void {
    this.threeService.returnToGeneralView();
  }
}