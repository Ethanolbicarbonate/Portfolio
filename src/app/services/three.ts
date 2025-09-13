// src/app/services/three.service.ts
import { Injectable, ElementRef, NgZone } from '@angular/core';
import * as THREE from 'three';
import { PaperData } from '../models/paper-data.model';
import { gsap } from 'gsap';
import { Subject } from 'rxjs';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

@Injectable({ providedIn: 'root' })
export class Three {
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private papers: THREE.Mesh[] = [];
  private currentFocusIndex = -1;
  public onFocusChange = new Subject<PaperData | null>();
  public paperData: PaperData[] = [];

  // Scroll throttling properties
  private isScrolling = false;
  private scrollCooldown = 2000; // 1 second cooldown between scrolls
  private scrollThreshold = 100; // Minimum scroll delta to trigger change
  private accumulatedScroll = 0;

  constructor(private ngZone: NgZone) {}

  public createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas.nativeElement, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  public addPapers(paperData: PaperData[]): void {
    this.paperData = paperData;
    const textureLoader = new THREE.TextureLoader();
    const geometry = new THREE.PlaneGeometry(2, 2.8);

    paperData.forEach(data => {
      const texture = textureLoader.load(data.imageUrl);
      const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
      const paper = new THREE.Mesh(geometry, material);

      paper.position.set(data.position.x, data.position.y, data.position.z);
      paper.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);

      this.papers.push(paper);
      this.scene.add(paper);
    });
  }

  public animate(): void {
    this.ngZone.runOutsideAngular(() => {
      if (document.readyState !== 'loading') {
        this.render();
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.render();
        });
      }

      window.addEventListener('resize', () => {
        this.resize();
      });
    });
  }

  private render(): void {
    requestAnimationFrame(() => this.render());
    // Add any animations here, e.g., paper floating effect
    this.papers.forEach(paper => {
      paper.rotation.y += 0.001;
    });
    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  public setupScrollAnimation(): void {
    window.addEventListener('wheel', (event) => {
      // Prevent default scroll behavior
      event.preventDefault();
      
      // If currently scrolling (in cooldown), ignore the scroll
      if (this.isScrolling) {
        return;
      }

      // Accumulate scroll delta
      this.accumulatedScroll += Math.abs(event.deltaY);

      // Only trigger scroll change if accumulated scroll exceeds threshold
      if (this.accumulatedScroll >= this.scrollThreshold) {
        const scrollDirection = event.deltaY > 0 ? 1 : -1;
        this.updateFocus(scrollDirection);
        
        // Reset accumulated scroll
        this.accumulatedScroll = 0;
        
        // Set scrolling flag and start cooldown
        this.isScrolling = true;
        setTimeout(() => {
          this.isScrolling = false;
        }, this.scrollCooldown);
      }
    }, { passive: false });
  }

  private updateFocus(direction: number): void {
    const newIndex = this.currentFocusIndex + direction;

    if (newIndex >= 0 && newIndex < this.papers.length) {
      // Defocus the current paper
      if (this.currentFocusIndex !== -1) {
        const oldPaper = this.papers[this.currentFocusIndex];
        // Animate back to original position (you'll need to store it)
      }

      // Focus the new paper
      this.currentFocusIndex = newIndex;
      const newPaper = this.papers[this.currentFocusIndex];
      gsap.to(this.camera.position, {
        duration: 1.5,
        x: newPaper.position.x,
        y: newPaper.position.y,
        z: newPaper.position.z + 3, // Position camera in front of the paper
        ease: 'power3.inOut'
      });
      // Emit event with new focused paper data
      this.onFocusChange.next(this.paperData[this.currentFocusIndex]);
    } else if (newIndex < 0) {
      // Scrolled up past the first paper
      this.currentFocusIndex = -1;
      gsap.to(this.camera.position, {
        duration: 1.5,
        x: 0,
        y: 0,
        z: 5,
        ease: 'power3.inOut'
      });
      this.onFocusChange.next(null);
    }
  }

  // Methods to adjust scroll sensitivity
  public setScrollCooldown(milliseconds: number): void {
    this.scrollCooldown = milliseconds;
  }

  public setScrollThreshold(threshold: number): void {
    this.scrollThreshold = threshold;
  }
}