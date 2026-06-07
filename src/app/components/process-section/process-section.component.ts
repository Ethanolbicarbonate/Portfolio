// File: src/app/components/process-section/process-section.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import TIMEOUTS from '../../utils/timeouts';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { ProcessProject, ProcessStep } from '../../models/process-data.model';
import { ParticleTrailDirective } from '../particle-trail/particle-trail.directive';

@Component({
  selector: 'app-process-section',
  standalone: true,
  imports: [CommonModule, ParticleTrailDirective],
  templateUrl: './process-section.component.html',
  styleUrls: ['./process-section.component.scss'],
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
  private processTime = 0;
  private processMaterial!: THREE.ShaderMaterial;
  public hasRevealed = false;

  get currentStep(): ProcessStep {
    return this.processData?.steps[this.currentStepIndex];
  }

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

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
    if (this.currentStepIndex < this.processData.steps.length - 1)
      this.setStep(this.currentStepIndex + 1);
  }

  public setStep(index: number): void {
    if (index === this.currentStepIndex) return;

    // Hide current
    this.fadeTrigger = false;
    this.cdr.detectChanges();

    // Use a slightly longer timeout to match the new cinematic CSS transitions
    setTimeout(() => {
      this.currentStepIndex = index;
      this.fadeTrigger = true;
      this.cdr.detectChanges();
    }, TIMEOUTS.processSection.fadeDelay); // Match the shared process section fade duration
  }

  // --- Three.js Logic ---
  private initProcessBackground(): void {
    if (!this.processBgCanvas) return;
    const canvas = this.processBgCanvas.nativeElement;
    this.processRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.processRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    this.processScene = new THREE.Scene();
    this.processCamera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );
    this.processCamera.position.z = 30;

    const particleCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount * 3); // For individual behavior

    for (let i = 0; i < particleCount; i++) {
      // Spread them wide and tall
      positions[i * 3 + 0] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      randoms[i * 3 + 0] = Math.random(); // Sway speed
      randoms[i * 3 + 1] = Math.random(); // Rise speed
      randoms[i * 3 + 2] = Math.random(); // Size multiplier
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));

    // Create the soft glowing texture
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 32;
    texCanvas.height = 32;
    const ctx = texCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(texCanvas);

    // Custom Shader for cinematic rising dust
    this.processMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uColor: { value: new THREE.Color(0x8ab4f8) }, // Matches UI accent color
      },
      vertexShader: `
        uniform float uTime;
        attribute vec3 aRandom;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          
          // Organic upward movement that loops seamlessly using modulo
          float riseSpeed = (aRandom.y * 2.0 + 1.0);
          pos.y = mod(position.y + uTime * riseSpeed + 50.0, 100.0) - 50.0;
          
          // Gentle side-to-side sway
          pos.x += sin(uTime * aRandom.x * 2.0 + position.y) * 2.0;
          pos.z += cos(uTime * aRandom.x * 1.5 + position.x) * 1.5;

          // Fade out near the top and bottom for smooth looping
          vAlpha = smoothstep(-50.0, -30.0, pos.y) * smoothstep(50.0, 30.0, pos.y);
          // Add organic blinking
          vAlpha *= (sin(uTime * 3.0 * aRandom.x + aRandom.y * 10.0) * 0.5 + 0.5) * 0.8 + 0.2;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Size attenuation based on depth and random scale
          gl_PointSize = (12.0 * aRandom.z + 4.0) * (30.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);
          gl_FragColor = vec4(uColor, texColor.a * vAlpha * 0.6); // 0.6 max opacity
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.processParticles = new THREE.Points(geometry, this.processMaterial);
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
    this.processObserver = new IntersectionObserver(
      (entries) => {
        this.isProcessVisible = entries[0].isIntersecting;
        if (this.isProcessVisible) {
          this.hasRevealed = true; // Trigger the dynamic entry animation
          this.resizeProcessBackground();
          this.startProcessAnimation();
        } else {
          this.stopProcessAnimation();
        }
      },
      { threshold: 0.15 }, // Increased threshold slightly for a better timed reveal
    );
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

        // Feed time into the shader instead of rotating the mesh
        this.processTime += 0.01;
        if (this.processMaterial) {
          this.processMaterial.uniforms['uTime'].value = this.processTime;
        }

        // Very slow camera pan for added cinematic effect
        this.processCamera.position.x = Math.sin(this.processTime * 0.2) * 5;
        this.processCamera.position.y = Math.cos(this.processTime * 0.1) * 2;
        this.processCamera.lookAt(0, 0, 0);

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
