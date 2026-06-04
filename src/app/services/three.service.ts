// File: src/app/services/three.service.ts
// PHASE 0 — Performance & Loading Optimization
import { Injectable, ElementRef, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { PaperData } from '../models/paper-data.model';
import { gsap } from 'gsap';
import { Subject } from 'rxjs';
import TIMEOUTS from '../utils/timeouts';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Device capability detection — runs once at service construction time.
// Falls back gracefully when the API is unavailable (SSR, older browsers).
// ---------------------------------------------------------------------------
function detectDeviceTier(): 'low' | 'high' {
  try {
    const cores = (navigator as any).hardwareConcurrency ?? 4;
    // Treat anything with ≤ 2 logical cores as a low-end device.
    // This covers most budget phones and old laptops.
    return cores <= 2 ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

@Injectable({ providedIn: 'root' })
export class ThreeService implements OnDestroy {
  // -------------------------------------------------------------------------
  // Core Three.js objects
  // -------------------------------------------------------------------------
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;

  // -------------------------------------------------------------------------
  // Papers
  // -------------------------------------------------------------------------
  private papers: THREE.Mesh[] = [];
  private currentFocusIndex = -1;
  public onFocusChange = new Subject<PaperData | null>();
  public paperData: PaperData[] = [];

  // -------------------------------------------------------------------------
  // Post-processing
  // -------------------------------------------------------------------------
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private bokehPass!: BokehPass;
  private renderPass!: RenderPass;
  private outputPass!: OutputPass;

  private bloomParams = { strength: 0.0, radius: 0.4, threshold: 0.85 };

  private dofParams = {
    focus: 8.0,
    aperture: 0.006,
    maxblur: 0.012,
    enabled: true,
  };

  // -------------------------------------------------------------------------
  // Lights
  // -------------------------------------------------------------------------
  private accentLight1!: THREE.PointLight;
  private accentLight2!: THREE.PointLight;
  private rimLight!: THREE.DirectionalLight;
  private spotLight!: THREE.SpotLight;

  // -------------------------------------------------------------------------
  // Animation state
  // -------------------------------------------------------------------------
  private animationTime = 0;
  private paperOriginalPositions: THREE.Vector3[] = [];
  private animationFrameId: number | null = null;

  // -------------------------------------------------------------------------
  // Scroll state
  // -------------------------------------------------------------------------
  private isScrolling = false;
  private scrollCooldown = TIMEOUTS.SCROLL_COOLDOWN;
  private scrollThreshold = 100;
  private accumulatedScroll = 0;
  private wheelEventHandler: ((event: WheelEvent) => void) | null = null;
  public onScrollToProcess = new Subject<void>();

  // -------------------------------------------------------------------------
  // Particles — store the ShaderMaterial uniforms ref directly instead of
  // casting the whole compiled shader.
  // -------------------------------------------------------------------------
  private particleTimeUniform: { value: number } | null = null;
  private particles!: THREE.Points;

  // -------------------------------------------------------------------------
  // Device tier — determined once, used throughout
  // -------------------------------------------------------------------------
  private readonly deviceTier: 'low' | 'high' = detectDeviceTier();

  // -------------------------------------------------------------------------
  // Visibility / tab-focus pause
  // -------------------------------------------------------------------------
  private visibilityHandler: (() => void) | null = null;

  // -------------------------------------------------------------------------
  // Shared loader instances (avoid recreating per paper)
  // -------------------------------------------------------------------------
  private readonly textureLoader = new THREE.TextureLoader();

  constructor(private ngZone: NgZone) {}

  ngOnDestroy(): void {
    this.disposeScene();
  }

  // =========================================================================
  // Scene creation
  // =========================================================================

  public createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    if (this.scene && this.renderer) {
      console.warn('ThreeService: scene already exists, disposing before recreating.');
      this.disposeScene();
    }

    // --- Scene ---
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);
    this.scene.background = new THREE.Color(0x142029);

    // --- Camera ---
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 5;

    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas.nativeElement,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Phase 0: Cap pixel ratio.
    // High-end: 1.5 (down from 2) saves ~44% fill-rate on Retina screens.
    // Low-end:  1.0 — keeps native resolution rendering to a minimum.
    const maxPixelRatio = this.deviceTier === 'low' ? 1.0 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.setupLighting();
    this.setupPostProcessing();

    // Phase 0: Skip heavy particle system on low-end devices.
    if (this.deviceTier === 'high') {
      this.createAtmosphericParticles();
    }

    // Phase 0: Pause rendering when the tab is hidden to save battery / GPU.
    this.setupVisibilityPause();

    window.addEventListener('resize', this.onResize);
  }

  // =========================================================================
  // Post-processing
  // =========================================================================

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Phase 0: Disable DOF entirely on low-end devices.
    // BokehPass is a full-screen shader — expensive on mobile.
    if (this.deviceTier === 'high') {
      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus: this.dofParams.focus,
        aperture: this.dofParams.aperture,
        maxblur: this.dofParams.maxblur,
      });
      this.bokehPass.enabled = this.dofParams.enabled;
      this.composer.addPass(this.bokehPass);
    }

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.bloomParams.strength,
      this.bloomParams.radius,
      this.bloomParams.threshold,
    );
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  // =========================================================================
  // Lighting
  // =========================================================================

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.15);
    this.scene.add(ambientLight);

    const topLeftLight = new THREE.DirectionalLight(0xffc42e, 2.0);
    topLeftLight.position.set(-15, 20, 10);
    topLeftLight.castShadow = true;
    topLeftLight.shadow.mapSize.set(4096, 4096);
    topLeftLight.shadow.camera.left = -30;
    topLeftLight.shadow.camera.right = 30;
    topLeftLight.shadow.camera.top = 30;
    topLeftLight.shadow.camera.bottom = -30;
    topLeftLight.shadow.camera.near = 0.5;
    topLeftLight.shadow.camera.far = 100;
    topLeftLight.shadow.bias = -0.0005;
    topLeftLight.shadow.radius = 8;
    this.scene.add(topLeftLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.8);
    keyLight.position.set(8, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 8;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe6f3ff, 0.6);
    fillLight.position.set(-6, -4, 4);
    this.scene.add(fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.rimLight.position.set(-2, 6, -8);
    this.scene.add(this.rimLight);

    this.accentLight1 = new THREE.PointLight(0xff6b35, 2.0, 15, 2);
    this.accentLight1.position.set(6, 3, 2);
    this.accentLight1.castShadow = true;
    this.accentLight1.shadow.mapSize.width = 1024;
    this.accentLight1.shadow.mapSize.height = 1024;
    this.scene.add(this.accentLight1);

    this.accentLight2 = new THREE.PointLight(0x4a90ff, 1.8, 12, 2);
    this.accentLight2.position.set(-4, -2, 3);
    this.accentLight2.castShadow = true;
    this.accentLight2.shadow.mapSize.width = 1024;
    this.accentLight2.shadow.mapSize.height = 1024;
    this.scene.add(this.accentLight2);

    this.spotLight = new THREE.SpotLight(0xffffff, 3.0, 20, Math.PI * 0.15, 0.3, 2);
    this.spotLight.position.set(0, 8, 5);
    this.spotLight.target.position.set(0, 0, 0);
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.camera.near = 0.5;
    this.spotLight.shadow.camera.far = 25;
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);
  }

  // =========================================================================
  // Papers — progressive texture loading
  // =========================================================================

  public addPapers(paperData: PaperData[]): void {
    this.paperData = paperData;

    // Phase 0: Load the normal map once and share it across all papers.
    const normalMapTexture = this.textureLoader.load('assets/images/paperNormal.png');

    // Phase 0: Load the env map once and share it.
    const cubeLoader = new THREE.CubeTextureLoader();
    const envMap = cubeLoader.load([
      'assets/images/posx.jpg',
      'assets/images/negx.jpg',
      'assets/images/posy.jpg',
      'assets/images/negy.jpg',
      'assets/images/posz.jpg',
      'assets/images/negz.jpg',
    ]);

    const fixedHeight = 2.8;

    // Pre-allocate arrays so index assignments work correctly even when
    // textures load out of order.
    this.papers = new Array(paperData.length);
    this.paperOriginalPositions = new Array(paperData.length);

    paperData.forEach((data, index) => {
      // --- Phase 0: Placeholder mesh — appears immediately at the correct
      // position/rotation while the real texture is fetched. ---
      const placeholderGeo = new THREE.PlaneGeometry(fixedHeight, fixedHeight);
      const placeholderMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a36,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
      placeholder.position.set(data.position.x, data.position.y, data.position.z);
      placeholder.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
      placeholder.castShadow = true;
      placeholder.receiveShadow = true;

      // Store placeholder in slot so animation loop doesn't skip it.
      this.papers[index] = placeholder;
      this.paperOriginalPositions[index] = placeholder.position.clone();
      this.scene.add(placeholder);

      // --- Load full texture asynchronously ---
      this.textureLoader.load(data.imageUrl, (loadedTexture) => {
        const aspectRatio = loadedTexture.image.width / loadedTexture.image.height;
        const calculatedWidth = fixedHeight * aspectRatio;

        // Replace geometry with correct aspect-ratio version.
        const geo = new THREE.PlaneGeometry(calculatedWidth, fixedHeight, 1, 1);
        loadedTexture.colorSpace = THREE.SRGBColorSpace;

        const mat = new THREE.MeshStandardMaterial({
          map: loadedTexture,
          normalMap: normalMapTexture,
          envMap,
          side: THREE.DoubleSide,
          roughness: 0.4,
          metalness: 0.1,
          envMapIntensity: 0.4,
          transparent: true,
          opacity: 0, // Start transparent — fade in below
          alphaTest: 0.01,
        });
        mat.normalScale.set(1.2, 1.2);

        // Swap geometry and material on the existing mesh so the
        // world position / rotation / animation state are preserved.
        placeholderMat.dispose();
        placeholderGeo.dispose();
        placeholder.geometry = geo;
        placeholder.material = mat;

        // Phase 0: Fade the paper in smoothly so there's no pop.
        gsap.to(mat, {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          onUpdate: () => {
            mat.needsUpdate = true;
          },
          onComplete: () => {
            mat.transparent = false;
            mat.opacity = 1;
          },
        });
      });
    });
  }

  // =========================================================================
  // Animation loop
  // =========================================================================

  public animate(): void {
    this.ngZone.runOutsideAngular(() => {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }

      const loop = () => {
        this.animationTime += 0.01;
        this.animateAccentLights();
        this.animatePapers();

        // Update particle shader time uniform if it exists.
        if (this.particleTimeUniform) {
          this.particleTimeUniform.value = this.animationTime;
        }

        this.updatePostProcessing();
        this.composer.render();
        this.animationFrameId = requestAnimationFrame(loop);
      };

      if (document.readyState !== 'loading') {
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.animationFrameId = requestAnimationFrame(loop);
        });
      }
    });
  }

  public stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // =========================================================================
  // Visibility pause — Phase 0 addition
  // =========================================================================

  private setupVisibilityPause(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.stopAnimation();
      } else {
        // Only restart if the scene is still alive.
        if (this.scene && this.renderer) {
          this.animate();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // =========================================================================
  // Disposal
  // =========================================================================

  public disposeScene(): void {
    this.stopAnimation();

    // Remove the visibility listener before clearing references.
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    window.removeEventListener('resize', this.onResize);
    this.disableScrollAnimation();

    if (!this.renderer || !this.scene) return;

    // Dispose particles before scene is nulled out.
    if (this.particles) {
      this.particles.geometry.dispose();
      if (this.particles.material instanceof THREE.Material) {
        this.particles.material.dispose();
      }
      this.scene.remove(this.particles);
      this.particles = null as any;
    }

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const mats = Array.isArray(object.material) ? object.material : [object.material];
      mats.forEach((m: THREE.Material) => this.disposeMaterial(m));
    });

    if (this.composer) {
      this.composer.passes.forEach((pass) => {
        if (typeof (pass as any).dispose === 'function') {
          (pass as any).dispose();
        }
      });
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();

    // Clear all references.
    this.scene = null as any;
    this.camera = null as any;
    this.renderer = null as any;
    this.papers = [];
    this.paperData = [];
    this.paperOriginalPositions = [];
    this.currentFocusIndex = -1;
    this.composer = null as any;
    this.bloomPass = null as any;
    this.bokehPass = null as any;
    this.renderPass = null as any;
    this.outputPass = null as any;
    this.particleTimeUniform = null;
  }

  private disposeMaterial(material: THREE.Material): void {
    material.dispose();
    for (const key in material) {
      const value = (material as any)[key];
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    }
  }

  // =========================================================================
  // Post-processing update
  // =========================================================================

  private updatePostProcessing(): void {
    this.bloomPass.strength = this.bloomParams.strength;
    this.bloomPass.radius = this.bloomParams.radius;
    this.bloomPass.threshold = this.bloomParams.threshold;

    if (this.bokehPass && this.dofParams.enabled) {
      const uniforms = (this.bokehPass as any).uniforms;
      if (uniforms) {
        if (uniforms['focus']) uniforms['focus'].value = this.dofParams.focus;
        if (uniforms['aperture']) uniforms['aperture'].value = this.dofParams.aperture;
        if (uniforms['maxblur']) uniforms['maxblur'].value = this.dofParams.maxblur;
      }
    }
  }

  // =========================================================================
  // Light animation
  // =========================================================================

  private animateAccentLights(): void {
    const r1 = 4,
      r2 = 6;
    const t = this.animationTime;

    this.accentLight1.position.x = Math.cos(t * 0.5) * r1;
    this.accentLight1.position.z = Math.sin(t * 0.5) * r1;
    this.accentLight1.position.y = 3 + Math.sin(t * 0.3) * 1.5;

    this.accentLight2.position.x = Math.cos(-t * 0.7) * r2;
    this.accentLight2.position.z = Math.sin(-t * 0.7) * r2;
    this.accentLight2.position.y = -2 + Math.cos(t * 0.4) * 2;

    this.rimLight.position.x = -2 + Math.sin(t * 0.2) * 1;
    this.rimLight.position.z = -8 + Math.cos(t * 0.15) * 2;

    this.spotLight.target.position.x = Math.sin(t * 0.1) * 2;
    this.spotLight.target.position.y = Math.cos(t * 0.1) * 1;
  }

  // =========================================================================
  // Paper animation
  // =========================================================================

  private animatePapers(): void {
    this.papers.forEach((paper, index) => {
      if (!paper) return;
      const originalPos = this.paperOriginalPositions[index];
      if (!originalPos) return;

      const offset = index * 0.5;
      const amp = 0.08;
      const t = this.animationTime;

      paper.position.y = originalPos.y + Math.sin(t + offset) * amp;
      paper.position.x = originalPos.x + Math.cos(t * 0.7 + offset) * (amp * 0.5);

      paper.rotation.y = Math.sin(t * 0.3 + offset) * (Math.PI * 0.08);

      const scale = 1 + Math.sin(t * 0.5 + offset) * 0.02;
      paper.scale.set(scale, scale, scale);
    });
  }

  // =========================================================================
  // Resize — stored as arrow function so it can be added / removed by reference
  // =========================================================================

  private onResize = (): void => {
    if (!this.camera || !this.renderer || !this.composer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };

  // =========================================================================
  // Scroll / focus navigation
  // =========================================================================

  public setupScrollAnimation(): void {
    if (this.wheelEventHandler) return;

    this.wheelEventHandler = (event: WheelEvent) => {
      // PHASE 3: Allow native scrolling if the page is scrolled down (in Process section)
      // We use a small threshold (> 5) to account for sub-pixel scrolling or rubber-banding.
      if (window.scrollY > 5) {
        return;
      }

      event.preventDefault();
      if (this.isScrolling) return;

      this.accumulatedScroll += Math.abs(event.deltaY);
      if (this.accumulatedScroll >= this.scrollThreshold) {
        const dir = event.deltaY > 0 ? 1 : -1;
        this.updateFocus(dir);
        this.accumulatedScroll = 0;
        this.isScrolling = true;
        setTimeout(() => {
          this.isScrolling = false;
        }, this.scrollCooldown);
      }
    };
    window.addEventListener('wheel', this.wheelEventHandler, { passive: false });
  }

  public disableScrollAnimation(): void {
    if (this.wheelEventHandler) {
      window.removeEventListener('wheel', this.wheelEventHandler);
      this.wheelEventHandler = null;
    }
    this.accumulatedScroll = 0;
    this.isScrolling = false;
  }

  private updateFocus(direction: number): void {
    const newIndex = this.currentFocusIndex + direction;

    if (newIndex >= 0 && newIndex < this.papers.length) {
      // De-focus previous paper
      if (this.currentFocusIndex !== -1) {
        const oldPaper = this.papers[this.currentFocusIndex];
        if (oldPaper) {
          gsap.to(oldPaper.scale, { duration: 0.8, x: 1, y: 1, z: 1, ease: 'power2.out' });
        }
        gsap.to(this.bloomParams, { duration: 1.0, strength: 0.0, ease: 'power2.out' });
      }

      this.currentFocusIndex = newIndex;
      const newPaper = this.papers[this.currentFocusIndex];

      gsap.to(this.camera.position, {
        duration: 1.8,
        x: newPaper.position.x - 1.5,
        y: newPaper.position.y,
        z: newPaper.position.z + 4,
        ease: 'power3.inOut',
      });

      if (this.deviceTier === 'high') {
        gsap.to(this.dofParams, {
          duration: 1.8,
          focus: 4,
          aperture: 0.01,
          maxblur: 0.02,
          ease: 'power2.inOut',
        });
      }

      gsap.to(newPaper.scale, { duration: 1.2, x: 1.05, y: 1.05, z: 1.05, ease: 'power2.out' });

      gsap.to(this.spotLight.target.position, {
        duration: 1.5,
        x: newPaper.position.x,
        y: newPaper.position.y,
        z: newPaper.position.z,
        ease: 'power2.inOut',
      });

      gsap.to(this.bloomParams, {
        duration: 1.5,
        strength: 1,
        ease: 'power2.inOut',
        delay: 0.3,
      });

      this.onFocusChange.next(this.paperData[this.currentFocusIndex]);
    } else if (newIndex < 0) {
      // Scrolled up past the first item
      this.returnToGeneralView();
    } else if (newIndex >= this.papers.length) {
      // EXACTLY AT THE END - Tell the component to unlock and scroll
      this.onScrollToProcess.next();
    }
  }

  public returnToGeneralView(): void {
    if (this.currentFocusIndex === -1) return;

    const oldPaper = this.papers[this.currentFocusIndex];
    if (oldPaper) {
      gsap.to(oldPaper.scale, { duration: 0.8, x: 1, y: 1, z: 1, ease: 'power2.out' });
    }

    gsap.to(this.bloomParams, { duration: 1.0, strength: 0.0, ease: 'power2.out' });

    if (this.deviceTier === 'high') {
      gsap.to(this.dofParams, {
        duration: 1.8,
        focus: 8.0,
        aperture: 0.006,
        maxblur: 0.012,
        ease: 'power2.inOut',
      });
    }

    this.currentFocusIndex = -1;

    gsap.to(this.camera.position, {
      duration: 1.8,
      x: 0,
      y: 0,
      z: 5,
      ease: 'power3.inOut',
    });

    gsap.to(this.spotLight.target.position, {
      duration: 1.5,
      x: 0,
      y: 0,
      z: 0,
      ease: 'power2.inOut',
    });

    this.onFocusChange.next(null);
  }

  // Phase 0: expose current focus index so the pagination indicator can read it.
  public getCurrentFocusIndex(): number {
    return this.currentFocusIndex;
  }

  // Phase 0: allow external navigation directly to a paper index (for dot clicks).
  public navigateToPaper(index: number): void {
    if (index < 0 || index >= this.papers.length) return;
    if (index === this.currentFocusIndex) return;

    // De-focus whatever was previously focused.
    if (this.currentFocusIndex !== -1) {
      const oldPaper = this.papers[this.currentFocusIndex];
      if (oldPaper) {
        gsap.to(oldPaper.scale, { duration: 0.8, x: 1, y: 1, z: 1, ease: 'power2.out' });
      }
      gsap.to(this.bloomParams, { duration: 1.0, strength: 0.0, ease: 'power2.out' });
    }

    this.currentFocusIndex = index;
    const newPaper = this.papers[this.currentFocusIndex];

    gsap.to(this.camera.position, {
      duration: 1.8,
      x: newPaper.position.x - 1.5,
      y: newPaper.position.y,
      z: newPaper.position.z + 4,
      ease: 'power3.inOut',
    });

    if (this.deviceTier === 'high') {
      gsap.to(this.dofParams, {
        duration: 1.8,
        focus: 4,
        aperture: 0.01,
        maxblur: 0.02,
        ease: 'power2.inOut',
      });
    }

    gsap.to(newPaper.scale, { duration: 1.2, x: 1.05, y: 1.05, z: 1.05, ease: 'power2.out' });
    gsap.to(this.spotLight.target.position, {
      duration: 1.5,
      x: newPaper.position.x,
      y: newPaper.position.y,
      z: newPaper.position.z,
      ease: 'power2.inOut',
    });
    gsap.to(this.bloomParams, { duration: 1.5, strength: 1, ease: 'power2.inOut', delay: 0.3 });

    this.onFocusChange.next(this.paperData[this.currentFocusIndex]);
  }

// =========================================================================
  // Particles — Upgraded Organic & Glowing
  // =========================================================================

  private createAtmosphericParticles(): void {
    const particleCount = 4000; // Reduced count for better performance since they are larger and glow now
    const boxSize = 60;

    const positions = new Float32Array(particleCount * 3);
    const animData = new Float32Array(particleCount * 2);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * boxSize;
      positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize;
      positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
      
      // x = sway speed, y = blink speed
      animData[i * 2 + 0] = Math.random() * Math.PI * 2;
      animData[i * 2 + 1] = 0.2 + Math.random() * 0.8; 
      
      // Varying sizes for depth perception
      sizes[i] = Math.random() * 0.5 + 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAnimationData', new THREE.BufferAttribute(animData, 2));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    // Programmatic soft glowing circle texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8, // Base size
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6,
    });

material.onBeforeCompile = (shader) => {
      const timeUniform = { value: 0.0 };
      shader.uniforms['time'] = timeUniform;
      this.particleTimeUniform = timeUniform;

      shader.vertexShader = `
        attribute vec2 aAnimationData;
        attribute float aSize;
        varying vec2 vAnimationData;
        uniform float time;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        vAnimationData = aAnimationData;
        
        // 1. Slow down time heavily for a gentle float
        float t = time * 0.05; 
        
        vec3 transformed = vec3(position);
        
        // 2. Overlap multiple waves to create unpredictable, organic wandering
        // We use the particle's unique position and random data to offset the waves
        float wanderX = sin(t * vAnimationData.y + position.y) + cos(t * 0.7 + vAnimationData.x);
        float wanderY = cos(t * (vAnimationData.y * 0.8) + position.z) + sin(t * 0.5 - vAnimationData.x);
        float wanderZ = sin(t * (vAnimationData.y * 1.2) - position.x) + cos(t * 0.6 + vAnimationData.x * 2.0);
        
        // 3. Apply the constraint (Radius)
        // Two waves added together max out at exactly 2.0 or -2.0.
        // Multiplying by 1.5 means a particle can NEVER wander further than 3.0 units 
        // away from its original spawn point in any direction.
        float constraintRadius = 1.5;
        transformed.x += wanderX * constraintRadius;
        transformed.y += wanderY * constraintRadius;
        transformed.z += wanderZ * constraintRadius;
        `
      ).replace(
        'gl_PointSize = size;',
        `gl_PointSize = size * aSize * (10.0 / -mvPosition.z);`
      );

      shader.fragmentShader = `
        uniform float time;
        varying vec2 vAnimationData;
        ${shader.fragmentShader}
      `.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
        // Slow down the blinking so it matches the gentle floating
        float blink = (sin(time * 0.5 * vAnimationData.y + vAnimationData.x) + 1.0) * 0.5;
        blink = smoothstep(0.0, 1.0, blink) * 0.8 + 0.2; 
        vec4 diffuseColor = vec4(diffuse, opacity * blink);
        `
      );
    };
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }
}
