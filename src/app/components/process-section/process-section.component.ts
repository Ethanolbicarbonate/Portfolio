import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

// Temporarily keeping interfaces here until Phase 2
export interface ProcessStep {
  title: string;
  image: string;
  caption: string;
}

export interface ProcessProject {
  title: string;
  heroImage: string;
  description: string;
  tags: string[];
  steps: ProcessStep[];
}

@Component({
  selector: 'app-process-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-section.component.html',
  styleUrls: ['./process-section.component.scss']
})
export class ProcessSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('processBgCanvas') processBgCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('processSection') processSectionRef!: ElementRef<HTMLElement>;

  @Input() processData!: ProcessProject;

  public currentStepIndex = 0;
  public fadeTrigger = true;

  // Three.js Background State
  private processScene!: THREE.Scene;
  private processCamera!: THREE.PerspectiveCamera;
  private processRenderer!: THREE.WebGLRenderer;
  private processParticles!: THREE.Points;
  private processAnimFrame: number | null = null;
  private processObserver!: IntersectionObserver;
  private processResizeObserver!: ResizeObserver;
  private isProcessVisible = false;

  get currentStep(): ProcessStep {
    return this.processData?.steps[this.currentStepIndex];
  }

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.initProcessBackground();
    this.setupProcessObserver();
  }

  ngOnDestroy(): void {
    this.disposeProcessBackground();
  }

  // --- Carousel Logic ---
  public prevStep(): void {
    if (this.currentStepIndex > 0) this.setStep(this.currentStepIndex - 1);
  }

  public nextStep(): void {
    if (this.currentStepIndex < this.processData.steps.length - 1) this.setStep(this.currentStepIndex + 1);
  }

  public setStep(index: number): void {
    if (index === this.currentStepIndex) return;
    this.fadeTrigger = false;
    this.cdr.detectChanges(); 
    
    setTimeout(() => {
      this.currentStepIndex = index;
      this.fadeTrigger = true;
      this.cdr.detectChanges();
    }, 50); 
  }

  // --- Three.js Logic ---
  private initProcessBackground(): void {
    if (!this.processBgCanvas) return;
    const canvas = this.processBgCanvas.nativeElement;
    this.processRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.processRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    
    this.processScene = new THREE.Scene();
    this.processCamera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.processCamera.position.z = 30;

    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for(let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x8ab4f8,
      size: 0.15,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.processParticles = new THREE.Points(geometry, material);
    this.processScene.add(this.processParticles);
    
    this.processResizeObserver = new ResizeObserver(() => this.resizeProcessBackground());
    if (canvas.parentElement) this.processResizeObserver.observe(canvas.parentElement);
  }

  private resizeProcessBackground(): void {
    if (!this.processRenderer || !this.processCamera || !this.processBgCanvas) return;
    const canvas = this.processBgCanvas.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    
    this.processCamera.aspect = parent.clientWidth / parent.clientHeight;
    this.processCamera.updateProjectionMatrix();
    this.processRenderer.setSize(parent.clientWidth, parent.clientHeight, false);
  }

  private setupProcessObserver(): void {
    if (!this.processSectionRef) return;
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
}