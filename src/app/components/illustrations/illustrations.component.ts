// File: src/app/components/illustrations/illustrations.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Scene } from '../scene/scene';
import { TextOverlayComponent } from '../text-overlay/text-overlay';
import { ThreeService } from '../../services/three.service';
import { PaperData } from '../../models/paper-data.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-illustrations',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Scene, TextOverlayComponent],
  templateUrl: './illustrations.component.html',
  styleUrls: ['./illustrations.component.scss'],
})
export class IllustrationsComponent implements OnInit, OnDestroy {
  focusedPaper: PaperData | null = null;
  previewImageUrl: string | null = null;
  isPreviewVisible: boolean = false;

  // -------------------------------------------------------------------------
  // Pagination & Scroll state
  // -------------------------------------------------------------------------
  readonly totalIllustrations = 11;
  activeDotIndex: number = -1;
  dotsVisible: boolean = false;
  readonly dotIndices: number[] = Array.from({ length: this.totalIllustrations }, (_, i) => i);
  
  // Phase 3: Tracks if we are at the top of the page
  isAtTop: boolean = true;

  private focusSub!: Subscription;

  constructor(
    private threeService: ThreeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Check initial scroll position
    this.checkScrollPosition();

    this.focusSub = this.threeService.onFocusChange.subscribe((data) => {
      this.ngZone.run(() => {
        this.focusedPaper = data;
        this.activeDotIndex = this.threeService.getCurrentFocusIndex();

        if (data !== null) {
          this.dotsVisible = true;
        } else {
          setTimeout(() => {
            this.dotsVisible = false;
            this.cdr.markForCheck();
          }, 600);
        }

        this.cdr.markForCheck();
      });
    });

    this.threeService.returnToGeneralView();
  }

  ngOnDestroy(): void {
    if (this.focusSub) {
      this.focusSub.unsubscribe();
    }
    setTimeout(() => {
      this.threeService.stopAnimation();
      this.threeService.disableScrollAnimation();
      this.threeService.disposeScene();
    }, 0);
  }

  // -------------------------------------------------------------------------
  // Scroll & Keyboard Listeners
  // -------------------------------------------------------------------------
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScrollPosition();
  }

  private checkScrollPosition(): void {
    // Hide the skip button if we've scrolled down more than 50px
    const currentlyAtTop = window.scrollY < 50;
    if (this.isAtTop !== currentlyAtTop) {
      this.isAtTop = currentlyAtTop;
      this.cdr.markForCheck(); // Ensure the UI updates
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.returnToGeneralView();
  }

  // -------------------------------------------------------------------------
  // Public actions
  // -------------------------------------------------------------------------
  public returnToGeneralView(): void {
    // Phase 3: If we are scrolled down into the process section, smoothly scroll back up
    if (!this.isAtTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.threeService.returnToGeneralView();
  }

  public onDotClick(index: number): void {
    // If user clicks a pagination dot while scrolled down, smoothly scroll back to the 3D view
    if (!this.isAtTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.threeService.navigateToPaper(index);
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

  // -------------------------------------------------------------------------
  // Phase 3: Scroll to Process Section
  // -------------------------------------------------------------------------
  public scrollToProcess(): void {
    const processSection = document.getElementById('process-section');
    if (processSection) {
      processSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}