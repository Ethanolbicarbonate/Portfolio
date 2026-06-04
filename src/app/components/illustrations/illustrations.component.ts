import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { Scene } from '../scene/scene';
import { TextOverlayComponent } from '../text-overlay/text-overlay';
import { ThreeService } from '../../services/three.service';
import { PaperData } from '../../models/paper-data.model';

// Import the new ProcessSectionComponent and its interface
import { ProcessSectionComponent, ProcessProject } from '../process-section/process-section.component';

@Component({
  selector: 'app-illustrations',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    Scene, 
    TextOverlayComponent, 
    ProcessSectionComponent // <-- Injected new standalone component here
  ],
  templateUrl: './illustrations.component.html',
  styleUrls: ['./illustrations.component.scss'],
})
export class IllustrationsComponent implements OnInit, OnDestroy {
  
  focusedPaper: PaperData | null = null;
  previewImageUrl: string | null = null;
  isPreviewVisible: boolean = false;

  // Pagination & Scroll state
  readonly totalIllustrations = 11;
  activeDotIndex: number = -1;
  dotsVisible: boolean = false;
  readonly dotIndices: number[] = Array.from({ length: this.totalIllustrations }, (_, i) => i);
  isAtTop: boolean = true;
  
  private focusSub!: Subscription;
  private processScrollSub!: Subscription;

  // -------------------------------------------------------------------------
  // Process Section Data (Will be isolated entirely in Phase 2)
  // -------------------------------------------------------------------------
  public processData: ProcessProject = {
    title: 'The Making of: When Pens Wander',
    heroImage: 'assets/images/image1.png',
    description: 'A deep dive into the creation of "When Pens Wander", from the initial scribbles and concept ideation to the final rendered masterpiece. This project heavily focused on balancing lighting and visual storytelling to bring the journey to life.',
    tags: ['Digital Art', 'Photoshop', '2024'],
    steps: [
      { 
        title: 'Initial Concept & Sketch', 
        image: 'assets/images/image2.png', 
        caption: 'The core idea was established with loose lines, focusing purely on composition, character weight, and the overall dynamic of the scene.' 
      },
      { 
        title: 'Line Art & Definition', 
        image: 'assets/images/image4.png', 
        caption: 'Refining the shapes and establishing clear boundaries for the character and the massive pen strapped to her back.' 
      },
      { 
        title: 'Base Colors & Mood', 
        image: 'assets/images/image8.png', 
        caption: 'Blocking in the foundational colors to set the atmospheric tone before adding complex volumetric lighting.' 
      },
      { 
        title: 'Final Lighting & Render', 
        image: 'assets/images/image1.png', 
        caption: 'Adding rim lights, volumetric glow, pushing the final contrast, and rendering textures to make the entire composition pop.' 
      }
    ]
  };

  constructor(
    private threeService: ThreeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    document.body.style.overflow = 'hidden'; 
    this.checkScrollPosition();

    this.processScrollSub = this.threeService.onScrollToProcess.subscribe(() => {
      this.scrollToProcess();
    });

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
    // IMPORTANT: Restore scroll capability so the About page doesn't break
    document.body.style.overflow = 'auto';

    if (this.focusSub) {
      this.focusSub.unsubscribe();
    }
    if (this.processScrollSub) {
      this.processScrollSub.unsubscribe();
    }
    
    setTimeout(() => {
      this.threeService.stopAnimation();
      this.threeService.disableScrollAnimation();
      this.threeService.disposeScene();
    }, 0);
  }

  // -------------------------------------------------------------------------
  // Existing Scroll & Keyboard Listeners
  // -------------------------------------------------------------------------
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScrollPosition();
  }

  private checkScrollPosition(): void {
    // We use <= 5 to account for sub-pixel resting positions
    const currentlyAtTop = window.scrollY <= 5;
    
    if (this.isAtTop !== currentlyAtTop) {
      this.isAtTop = currentlyAtTop;
      
      if (this.isAtTop) {
        // We reached the top again -> LOCK native scroll
        document.body.style.overflow = 'hidden';
      }
      
      this.cdr.markForCheck();
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.returnToGeneralView();
  }

  public returnToGeneralView(): void {
    if (!this.isAtTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.threeService.returnToGeneralView();
  }

  public onDotClick(index: number): void {
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

  public scrollToProcess(): void {
    // UNLOCK native scroll so the browser can actually move down
    document.body.style.overflow = 'auto';
    
    // Eagerly update state for UI responsiveness (hides skip button instantly)
    this.isAtTop = false; 
    this.cdr.markForCheck();

    // A tiny timeout (10ms) ensures the browser has registered 
    // the overflow change before we ask it to scroll
    setTimeout(() => {
      const processSection = document.getElementById('process-section');
      if (processSection) {
        processSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 10);
  }
}