import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { Scene } from './components/scene/scene';
import { TextOverlayComponent } from './components/text-overlay/text-overlay';

import { ThreeService } from './services/three.service';
import { PaperData } from './models/paper-data.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Scene, TextOverlayComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  focusedPaper: PaperData | null = null;
  previewImageUrl: string | null = null;
  isPreviewVisible: boolean = false;

  constructor(private threeService: ThreeService) {}

  ngOnInit() {
    this.threeService.onFocusChange.subscribe((data) => {
      this.focusedPaper = data;
    });
  }
  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.returnToGeneralView();
  }
  public returnToGeneralView(): void {
    this.threeService.returnToGeneralView();
  }
    public onPreviewImage(imageUrl: string): void {
    this.previewImageUrl = imageUrl;

    setTimeout(() => {
      this.isPreviewVisible = true;
    }, 10); 
  }

  public closePreview(): void {
    this.isPreviewVisible = false;
    setTimeout(() => {
      this.previewImageUrl = null;
    }, 500);
  }
}
