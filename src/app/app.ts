import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

  import { Scene } from './components/scene/scene';
import { TextOverlay } from './components/text-overlay/text-overlay';

import { Three } from './services/three';
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

  constructor(private three: Three) {}

  ngOnInit() {
    this.three.onFocusChange.subscribe((data) => {
      this.focusedPaper = data;
    });
  }
}