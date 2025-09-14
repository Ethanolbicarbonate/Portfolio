import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'; // Added for potential nested routing if needed, though not strictly used here
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
  focusedPaper: PaperData | null = null;
  previewImageUrl: string | null = null;
  isPreviewVisible: boolean = false;

  constructor(private threeService: ThreeService) {}

  ngOnInit() {
    // Subscribe to focus changes from the Three.js service
    this.threeService.onFocusChange.subscribe((data) => {
      this.focusedPaper = data;
    });
    // Set up scroll animation when this component is initialized (i.e., on the Projects page)
    this.threeService.setupScrollAnimation();
    // Ensure the scene is in a general view when navigating to the projects page
    this.threeService.returnToGeneralView();
  }

  ngOnDestroy() {
    // Clean up: return to general view and disable scroll when leaving the Projects page
    this.threeService.returnToGeneralView();
    this.threeService.disableScrollAnimation();
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