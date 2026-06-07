import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParticleTrailService } from '../../services/particle-trail.service';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  angle: number;      // Added: Tracks the sine wave angle for swaying
  swaySpeed: number;  // Added: How fast the particle sways side-to-side
}

@Component({
  selector: 'app-particle-trail',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #trailCanvas class="trail-canvas"></canvas>`,
  styles: [`
    .trail-canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 99;
    }
  `]
})
export class ParticleTrailComponent implements AfterViewInit, OnDestroy {
  @ViewChild('trailCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private isAnimating = false;
  private lastScrollY = 0;
  private glowTexture!: HTMLCanvasElement;
  private scrollHandler!: () => void;
  private resizeHandler!: () => void;

  constructor(
    private ngZone: NgZone,
    private trailService: ParticleTrailService
  ) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    
    this.createGlowTexture();
    this.resizeCanvas();

    this.ngZone.runOutsideAngular(() => {
      this.lastScrollY = window.scrollY;
      
      this.scrollHandler = () => this.onScroll();
      this.resizeHandler = () => this.resizeCanvas();
      
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      window.addEventListener('resize', this.resizeHandler, { passive: true });
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private createGlowTexture(): void {
    this.glowTexture = document.createElement('canvas');
    this.glowTexture.width = 32;
    this.glowTexture.height = 32;
    const ctx = this.glowTexture.getContext('2d')!;
    
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(138, 180, 248, 0.6)');
    grad.addColorStop(1, 'rgba(138, 180, 248, 0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private onScroll(): void {
    const currentScrollY = window.scrollY;
    const deltaY = currentScrollY - this.lastScrollY;
    this.lastScrollY = currentScrollY;

    if (Math.abs(deltaY) > 2) {
      this.spawnParticles(deltaY);
    }
  }

  private spawnParticles(deltaY: number): void {
    const visibleElements = this.trailService.getVisibleElements();
    if (visibleElements.length === 0) return;

    const spawnCount = Math.min(Math.abs(deltaY) * 0.2, 10);

    visibleElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      
      for (let i = 0; i < spawnCount; i++) {
        const x = rect.left + Math.random() * rect.width;
        const y = deltaY > 0 ? rect.bottom : rect.top;

        this.particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 0.8, // Reduced initial horizontal scatter
          vy: -deltaY * (Math.random() * 0.03 + 0.01), // Slightly softer initial vertical burst
          life: 1.0,
          maxLife: 1.0,
          size: Math.random() * 20 + 10,
          angle: Math.random() * Math.PI * 2, // Start at a random point in the sine wave
          swaySpeed: Math.random() * 0.03 + 0.01 // Randomize how fast they wiggle
        });
      }
    });

    if (!this.isAnimating) {
      this.isAnimating = true;
      this.renderLoop();
    }
  }

  private renderLoop(): void {
    if (this.particles.length === 0) {
      this.isAnimating = false;
      this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    this.ctx.globalCompositeOperation = 'lighter';

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // 1. Apply friction to the initial scroll-burst velocity
      p.vx *= 0.95; 
      p.vy *= 0.90; 

      // 2. Add a gentle, constant upward drift (like hot air rising)
      p.vy -= 0.15; 

      // 3. Calculate sway using a sine wave based on the particle's angle
      p.angle += p.swaySpeed;
      const sway = Math.sin(p.angle) * 0.8;

      // 4. Update actual positions
      p.x += p.vx + sway;
      p.y += p.vy;
      
      // 5. Slower decay so they hang in the air longer
      p.life -= 0.012; 

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const scale = p.life / p.maxLife;
      const currentSize = p.size * scale;
      
      this.ctx.globalAlpha = scale;
      this.ctx.drawImage(
        this.glowTexture, 
        p.x - currentSize / 2, 
        p.y - currentSize / 2, 
        currentSize, 
        currentSize
      );
    }

    requestAnimationFrame(() => this.renderLoop());
  }
}