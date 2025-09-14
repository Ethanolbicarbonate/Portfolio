// File: .\app\components\projects\projects.component.ts
import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Scene } from '../scene/scene';
import { TextOverlayComponent } from '../text-overlay/text-overlay';
import { ThreeService } from '../../services/three.service';
import { PaperData } from '../../models/paper-data.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Scene, TextOverlayComponent],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit, OnDestroy {
  @ViewChild(Scene) private threeSceneComponent!: Scene;

  focusedPaper: PaperData | null = null;
  previewImageUrl: string | null = null;
  isPreviewVisible: boolean = false;

  constructor(private threeService: ThreeService) {}

  ngOnInit() {
    this.threeService.onFocusChange.subscribe((data) => {
      this.focusedPaper = data;
    });
    this.threeService.returnToGeneralView();
  }

  ngOnDestroy() {
    console.log('ProjectsComponent ngOnDestroy called. Initiating Three.js cleanup.');

    // *** IMPORTANT CHANGE HERE: Defer the heavy cleanup to allow route change to complete ***
    // This pushes the disposal task to the end of the current event loop,
    // letting Angular's routing finish its work first.
    setTimeout(() => {
      this.threeService.stopAnimation();
      this.threeService.disableScrollAnimation();
      this.threeService.disposeScene();
      console.log('Three.js scene disposal deferred and completed.');
    }, 0); // Defer by 0 milliseconds
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