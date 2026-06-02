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
  // Pagination state
  // -------------------------------------------------------------------------
  // Total number of illustrations — kept in sync with scene.ts papers array.
  readonly totalIllustrations = 11;

  // Which dot is active (-1 = general view / none active).
  activeDotIndex: number = -1;

  // Controls whether the dot rail is visible at all.
  // It appears when the user first focuses an illustration and hides when
  // they return to the general view.
  dotsVisible: boolean = false;

  // Build an array of indices so *ngFor can iterate over them.
  readonly dotIndices: number[] = Array.from(
    { length: this.totalIllustrations },
    (_, i) => i
  );

  private focusSub!: Subscription;

  constructor(
    private threeService: ThreeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Subscribe to focus changes emitted by ThreeService so the dots stay in
    // sync whether navigation happened via scroll or via dot click.
    this.focusSub = this.threeService.onFocusChange.subscribe((data) => {
      // Run inside NgZone so Angular's change detection picks up the update,
      // because ThreeService runs outside Angular (runOutsideAngular in animate()).
      this.ngZone.run(() => {
        this.focusedPaper = data;
        this.activeDotIndex = this.threeService.getCurrentFocusIndex();

        if (data !== null) {
          // Show the rail as soon as any illustration is focused.
          this.dotsVisible = true;
        } else {
          // Hide the rail when returning to general view.
          // Small delay so it fades out rather than snapping away while the
          // camera is still mid-animation.
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
  // Keyboard
  // -------------------------------------------------------------------------
  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.returnToGeneralView();
  }

  // -------------------------------------------------------------------------
  // Public actions
  // -------------------------------------------------------------------------
  public returnToGeneralView(): void {
    this.threeService.returnToGeneralView();
  }

  /** Called when the user clicks a pagination dot. */
  public onDotClick(index: number): void {
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
}