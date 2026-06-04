// File: src/app/components/illustrations/illustrations.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  HostListener,
  NgZone,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Scene } from '../scene/scene';
import { TextOverlayComponent } from '../text-overlay/text-overlay';
import { ThreeService } from '../../services/three.service';
import { PaperData } from '../../models/paper-data.model';
import { Subscription } from 'rxjs';
import * as THREE from 'three';

// Phase 4: Interfaces for Process Data
interface ProcessStep {
  title: string;
  image: string;
  caption: string;
}

interface ProcessProject {
  title: string;
  heroImage: string;
  description: string;
  tags: string[];
  steps: ProcessStep[];
}

@Component({
  selector: 'app-illustrations',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Scene, TextOverlayComponent],
  templateUrl: './illustrations.component.html',
  styleUrls: ['./illustrations.component.scss'],
})
export class IllustrationsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('processBgCanvas') processBgCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('processSection') processSectionRef!: ElementRef<HTMLElement>;

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
  // Phase 4: Process Section Data & State
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

  public currentStepIndex = 0;
  public fadeTrigger = true;

  // -------------------------------------------------------------------------
  // Phase 4: Process Section Three.js Background
  // -------------------------------------------------------------------------
  private processScene!: THREE.Scene;
  private processCamera!: THREE.PerspectiveCamera;
  private processRenderer!: THREE.WebGLRenderer;
  private processParticles!: THREE.Points;
  private processAnimFrame: number | null = null;
  private processObserver!: IntersectionObserver;
  private processResizeObserver!: ResizeObserver;
  private isProcessVisible = false;

  get currentStep(): ProcessStep {
    return this.processData.steps[this.currentStepIndex];
  }

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

  ngAfterViewInit(): void {
    // Initialize the process background once the ViewChild elements are ready
    this.initProcessBackground();
    this.setupProcessObserver();
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
    
    this.disposeProcessBackground();
    
    setTimeout(() => {
      this.threeService.stopAnimation();
      this.threeService.disableScrollAnimation();
      this.threeService.disposeScene();
    }, 0);
  }

  // -------------------------------------------------------------------------
  // Phase 4: Process Carousel Logic
  // -------------------------------------------------------------------------
  public prevStep(): void {
    if (this.currentStepIndex > 0) {
      this.setStep(this.currentStepIndex - 1);
    }
  }

  public nextStep(): void {
    if (this.currentStepIndex < this.processData.steps.length - 1) {
      this.setStep(this.currentStepIndex + 1);
    }
  }

  public setStep(index: number): void {
    if (index === this.currentStepIndex) return;
    
    // Remove fade class to reset animation
    this.fadeTrigger = false;
    this.cdr.detectChanges(); 
    
    setTimeout(() => {
      this.currentStepIndex = index;
      this.fadeTrigger = true; // Re-trigger fade
      this.cdr.detectChanges();
    }, 50); 
  }

  // -------------------------------------------------------------------------
  // Phase 4: Local Three.js Background Logic
  // -------------------------------------------------------------------------
  private initProcessBackground(): void {
    if (!this.processBgCanvas) return;
    
    const canvas = this.processBgCanvas.nativeElement;
    this.processRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.processRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    
    this.processScene = new THREE.Scene();
    this.processCamera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.processCamera.position.z = 30;

    // Subtle Particle Field
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x8ab4f8, // Soft blue accent to match your portfolio vibe
      size: 0.15,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.processParticles = new THREE.Points(geometry, material);
    this.processScene.add(this.processParticles);
    
    // Use ResizeObserver so the canvas perfectly matches the section even if content reflows
    this.processResizeObserver = new ResizeObserver(() => {
      this.resizeProcessBackground();
    });
    if (canvas.parentElement) {
      this.processResizeObserver.observe(canvas.parentElement);
    }
  }

  private resizeProcessBackground(): void {
    if (!this.processRenderer || !this.processCamera || !this.processBgCanvas) return;
    const canvas = this.processBgCanvas.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    
    this.processCamera.aspect = width / height;
    this.processCamera.updateProjectionMatrix();
    this.processRenderer.setSize(width, height, false);
  }

  private setupProcessObserver(): void {
    if (!this.processSectionRef) return;
    
    // Only animate when the process section is actually on-screen
    this.processObserver = new IntersectionObserver((entries) => {
      this.isProcessVisible = entries[0].isIntersecting;
      if (this.isProcessVisible) {
        this.resizeProcessBackground();
        this.startProcessAnimation();
      } else {
        this.stopProcessAnimation();
      }
    }, { threshold: 0.0 });
    
    this.processObserver.observe(this.processSectionRef.nativeElement);
  }

  private startProcessAnimation(): void {
    if (this.processAnimFrame !== null) return;
    
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        if (!this.isProcessVisible || !this.processRenderer) {
          this.processAnimFrame = null;
          return;
        }
        
        // Gentle rotation
        this.processParticles.rotation.y += 0.0005;
        this.processParticles.rotation.x += 0.0002;
        
        this.processRenderer.render(this.processScene, this.processCamera);
        this.processAnimFrame = requestAnimationFrame(loop);
      };
      this.processAnimFrame = requestAnimationFrame(loop);
    });
  }

  private stopProcessAnimation(): void {
    if (this.processAnimFrame !== null) {
      cancelAnimationFrame(this.processAnimFrame);
      this.processAnimFrame = null;
    }
  }

  private disposeProcessBackground(): void {
    if (this.processResizeObserver) this.processResizeObserver.disconnect();
    if (this.processObserver) this.processObserver.disconnect();
    this.stopProcessAnimation();
    
    if (this.processParticles) {
      this.processParticles.geometry.dispose();
      (this.processParticles.material as THREE.Material).dispose();
    }
    if (this.processRenderer) this.processRenderer.dispose();
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