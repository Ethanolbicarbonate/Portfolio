import { Injectable, ElementRef, NgZone } from '@angular/core';
import * as THREE from 'three';
import { PaperData } from '../models/paper-data.model';
import { gsap } from 'gsap';
import { Subject } from 'rxjs';

// Import post-processing modules
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

@Injectable({ providedIn: 'root' })
export class ThreeService {
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private papers: THREE.Mesh[] = [];
  private currentFocusIndex = -1;
  public onFocusChange = new Subject<PaperData | null>();
  public paperData: PaperData[] = [];

  // Post-processing effects
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private bokehPass!: BokehPass;
  private renderPass!: RenderPass;
  private outputPass!: OutputPass;

  // Bloom settings
  private bloomParams = {
    strength: 0.0,
    radius: 0.4,
    threshold: 0.85,
  };

  // Depth of Field settings
  private dofParams = {
    focus: 8.0, // Focus further back for general view blur
    aperture: 0.006, // Larger aperture for more background blur
    maxblur: 0.012, // Increased blur amount for general view
    enabled: true, // Enable DOF by default for general view blur
  };

  // Lighting references for animation
  private accentLight1!: THREE.PointLight;
  private accentLight2!: THREE.PointLight;
  private rimLight!: THREE.DirectionalLight;
  private spotLight!: THREE.SpotLight;

  // Animation properties
  private animationTime = 0;
  private paperOriginalPositions: THREE.Vector3[] = [];

  // Scroll throttling properties
  private isScrolling = false;
  private scrollCooldown = 2000;
  private scrollThreshold = 100;
  private accumulatedScroll = 0;

  private particleMaterial!: THREE.ShaderMaterial;

  constructor(private ngZone: NgZone) {}

  public createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);
    this.scene.background = new THREE.Color(0x142029);

    // Camera with better FOV for cinematic feel
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Enhanced Renderer with cinematic settings
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas.nativeElement,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enhanced shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Cinematic tone mapping and exposure
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.setupLighting();
    this.setupPostProcessing();
    this.createAtmosphericParticles();
  }

  private setupPostProcessing(): void {
    // Create the effect composer
    this.composer = new EffectComposer(this.renderer);

    // Create the render pass (renders the scene)
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Create the depth of field pass
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: this.dofParams.focus,
      aperture: this.dofParams.aperture,
      maxblur: this.dofParams.maxblur,
    });

    // Enable DOF by default for general view blur
    this.bokehPass.enabled = this.dofParams.enabled;
    this.composer.addPass(this.bokehPass);

    // Create the bloom pass (after DOF for better visual hierarchy)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.bloomParams.strength,
      this.bloomParams.radius,
      this.bloomParams.threshold
    );
    this.composer.addPass(this.bloomPass);

    // Output pass for final rendering
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  private setupLighting(): void {
    // Dramatically reduced ambient light for better contrast
    const ambientLight = new THREE.AmbientLight(0x404040, 0.15);
    this.scene.add(ambientLight);

    const topLeftLight = new THREE.DirectionalLight(0xffc42e, 2.0);
    topLeftLight.position.set(-15, 20, 10);
    topLeftLight.castShadow = true;

    // Large coverage area for smooth shadows
    topLeftLight.shadow.mapSize.set(4096, 4096);
    topLeftLight.shadow.camera.left = -30;
    topLeftLight.shadow.camera.right = 30;
    topLeftLight.shadow.camera.top = 30;
    topLeftLight.shadow.camera.bottom = -30;
    topLeftLight.shadow.camera.near = 0.5;
    topLeftLight.shadow.camera.far = 100;

    // Softer shadow edges
    topLeftLight.shadow.bias = -0.0005;
    topLeftLight.shadow.radius = 8;

    this.scene.add(topLeftLight);

    // Key Light - Warm directional light (main illumination)
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.8);
    keyLight.position.set(8, 10, 6);
    keyLight.castShadow = true;

    // Enhanced shadow settings for key light
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

    // Fill Light - Cool-toned light to balance shadows
    const fillLight = new THREE.DirectionalLight(0xe6f3ff, 0.6);
    fillLight.position.set(-6, -4, 4);
    this.scene.add(fillLight);

    // Rim Light - Back lighting for edge definition
    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.rimLight.position.set(-2, 6, -8);
    this.scene.add(this.rimLight);

    // Accent Light 1 - Orange dynamic point light
    this.accentLight1 = new THREE.PointLight(0xff6b35, 2.0, 15, 2);
    this.accentLight1.position.set(6, 3, 2);
    this.accentLight1.castShadow = true;
    this.accentLight1.shadow.mapSize.width = 1024;
    this.accentLight1.shadow.mapSize.height = 1024;
    this.scene.add(this.accentLight1);

    // Accent Light 2 - Blue dynamic point light
    this.accentLight2 = new THREE.PointLight(0x4a90ff, 1.8, 12, 2);
    this.accentLight2.position.set(-4, -2, 3);
    this.accentLight2.castShadow = true;
    this.accentLight2.shadow.mapSize.width = 1024;
    this.accentLight2.shadow.mapSize.height = 1024;
    this.scene.add(this.accentLight2);

    // Spot Light - Focused dramatic illumination
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

  public addPapers(paperData: PaperData[]): void {
    this.paperData = paperData;
    const textureLoader = new THREE.TextureLoader();

    // Fixed height for all papers
    const fixedHeight = 2.8;

    // Enhanced normal map
    const normalMapTexture = textureLoader.load('assets/images/paperNormal.png');

    // Create environment map for reflections
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const envMap = cubeTextureLoader.load([
      'assets/images/posx.jpg',
      'assets/images/negx.jpg',
      'assets/images/posy.jpg',
      'assets/images/negy.jpg',
      'assets/images/posz.jpg',
      'assets/images/negz.jpg',
    ]);
    this.papers = new Array(paperData.length);
    this.paperOriginalPositions = new Array(paperData.length);

    paperData.forEach((data, index) => {
      const texture = textureLoader.load(data.imageUrl, (loadedTexture) => {
        // Calculate width based on aspect ratio
        const aspectRatio = loadedTexture.image.width / loadedTexture.image.height;
        const calculatedWidth = fixedHeight * aspectRatio;

        // Create geometry with correct dimensions
        const geometry = new THREE.PlaneGeometry(calculatedWidth, fixedHeight, 1, 1);

        loadedTexture.colorSpace = THREE.SRGBColorSpace;

        // Enhanced material properties
        const material = new THREE.MeshStandardMaterial({
          map: loadedTexture,
          normalMap: normalMapTexture,
          envMap: envMap,
          side: THREE.DoubleSide,
          roughness: 0.4,
          metalness: 0.1,
          envMapIntensity: 0.4,
          transparent: false,
          alphaTest: 0.1,
        });

        material.normalScale.set(1.2, 1.2);

        const paper = new THREE.Mesh(geometry, material);
        paper.castShadow = true;
        paper.receiveShadow = true;
        paper.position.set(data.position.x, data.position.y, data.position.z);
        paper.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);

        // Store original positions for animation
        this.paperOriginalPositions.push(paper.position.clone());

        this.papers[index] = paper;
        this.paperOriginalPositions[index] = paper.position.clone();
        this.scene.add(paper);
      });
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

    this.animationTime += 0.01;

    // Dynamic light animation
    this.animateAccentLights();

    // Enhanced paper animations
    this.animatePapers();

    if (this.particleMaterial) {
      // Access the 'time' uniform using bracket notation
      this.particleMaterial.uniforms['time'].value = this.animationTime;
    }

    // Update post-processing effects
    this.updatePostProcessing();

    // Render with post-processing
    this.composer.render();
  }

  private updatePostProcessing(): void {
    // Update bloom pass parameters
    this.bloomPass.strength = this.bloomParams.strength;
    this.bloomPass.radius = this.bloomParams.radius;
    this.bloomPass.threshold = this.bloomParams.threshold;

    // Update depth of field parameters
    if (this.bokehPass && this.dofParams.enabled) {
      const uniforms = (this.bokehPass as any).uniforms;
      if (uniforms) {
        if (uniforms['focus']) uniforms['focus'].value = this.dofParams.focus;
        if (uniforms['aperture']) uniforms['aperture'].value = this.dofParams.aperture;
        if (uniforms['maxblur']) uniforms['maxblur'].value = this.dofParams.maxblur;
      }
    }
  }

  private animateAccentLights(): void {
    // Animate accent lights in circular patterns
    const radius1 = 4;
    const radius2 = 6;

    this.accentLight1.position.x = Math.cos(this.animationTime * 0.5) * radius1;
    this.accentLight1.position.z = Math.sin(this.animationTime * 0.5) * radius1;
    this.accentLight1.position.y = 3 + Math.sin(this.animationTime * 0.3) * 1.5;

    this.accentLight2.position.x = Math.cos(-this.animationTime * 0.7) * radius2;
    this.accentLight2.position.z = Math.sin(-this.animationTime * 0.7) * radius2;
    this.accentLight2.position.y = -2 + Math.cos(this.animationTime * 0.4) * 2;

    // Subtle rim light movement
    this.rimLight.position.x = -2 + Math.sin(this.animationTime * 0.2) * 1;
    this.rimLight.position.z = -8 + Math.cos(this.animationTime * 0.15) * 2;

    // Dynamic spotlight targeting
    this.spotLight.target.position.x = Math.sin(this.animationTime * 0.1) * 2;
    this.spotLight.target.position.y = Math.cos(this.animationTime * 0.1) * 1;
  }

  private animatePapers(): void {
    this.papers.forEach((paper, index) => {
      const originalPos = this.paperOriginalPositions[index];

      // Subtle floating animation with individual timing offsets
      const timeOffset = index * 0.5;
      const floatAmplitude = 0.08;
      const rotationSpeed = 0.3;

      // Gentle floating movement
      paper.position.y = originalPos.y + Math.sin(this.animationTime + timeOffset) * floatAmplitude;
      paper.position.x =
        originalPos.x + Math.cos(this.animationTime * 0.7 + timeOffset) * (floatAmplitude * 0.5);

      // Continuous circular rotation for light catching
      const gentleAngle = Math.PI * 0.08; // ~14 degrees each way
      paper.rotation.y = Math.sin(this.animationTime * rotationSpeed + timeOffset) * gentleAngle;
      // Scale pulsing for dynamic presence
      const scaleVariation = 1 + Math.sin(this.animationTime * 0.5 + timeOffset) * 0.02;
      paper.scale.set(scaleVariation, scaleVariation, scaleVariation);
    });
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);

    // The BokehPass will automatically resize its render targets
    // when the composer is resized
  }

  public setupScrollAnimation(): void {
    window.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();

        if (this.isScrolling) {
          return;
        }

        this.accumulatedScroll += Math.abs(event.deltaY);

        if (this.accumulatedScroll >= this.scrollThreshold) {
          const scrollDirection = event.deltaY > 0 ? 1 : -1;
          this.updateFocus(scrollDirection);

          this.accumulatedScroll = 0;
          this.isScrolling = true;
          setTimeout(() => {
            this.isScrolling = false;
          }, this.scrollCooldown);
        }
      },
      { passive: false }
    );
  }

  private updateFocus(direction: number): void {
    const newIndex = this.currentFocusIndex + direction;

    if (newIndex >= 0 && newIndex < this.papers.length) {
      if (this.currentFocusIndex !== -1) {
        const oldPaper = this.papers[this.currentFocusIndex];
        // Animate back to original state
        gsap.to(oldPaper.scale, {
          duration: 0.8,
          x: 1,
          y: 1,
          z: 1,
          ease: 'power2.out',
        });

        // Fade out bloom effect
        gsap.to(this.bloomParams, {
          duration: 1.0,
          strength: 0.0,
          ease: 'power2.out',
        });
      }

      this.currentFocusIndex = newIndex;
      const newPaper = this.papers[this.currentFocusIndex];

      // Enhanced focus animation with sharper DOF for focused paper
      gsap.to(this.camera.position, {
        duration: 1.8,
        x: newPaper.position.x - 1.5,
        y: newPaper.position.y,
        z: newPaper.position.z + 4,
        ease: 'power3.inOut',
      });

      // DOF is already enabled, just adjust parameters for focused view
      gsap.to(this.dofParams, {
        duration: 1.8,
        focus: 4, // Sharp focus on the paper
        aperture: 0.01, // Larger aperture for more background blur
        maxblur: 0.02, // Increased blur for background separation
        ease: 'power2.inOut',
      });

      // Scale up focused paper slightly
      gsap.to(newPaper.scale, {
        duration: 1.2,
        x: 1.05,
        y: 1.05,
        z: 1.05,
        ease: 'power2.out',
      });

      // Adjust spotlight to focus on selected paper
      gsap.to(this.spotLight.target.position, {
        duration: 1.5,
        x: newPaper.position.x,
        y: newPaper.position.y,
        z: newPaper.position.z,
        ease: 'power2.inOut',
      });

      // Animate bloom effect IN
      gsap.to(this.bloomParams, {
        duration: 1.5,
        strength: 1,
        ease: 'power2.inOut',
        delay: 0.3,
      });

      this.onFocusChange.next(this.paperData[this.currentFocusIndex]);
    } else if (newIndex < 0) {
      // Return to general view with its own blur settings
      gsap.to(this.bloomParams, {
        duration: 1.0,
        strength: 0.0,
        ease: 'power2.out',
      });

      // Animate to general view DOF settings (blurry background)
      gsap.to(this.dofParams, {
        duration: 1.8,
        focus: 8.0, // Focus further back for general view
        aperture: 0.006, // Moderate blur for atmospheric effect
        maxblur: 0.012, // Maintain some blur in general view
        ease: 'power2.inOut',
        // Note: DOF stays enabled, no onComplete callback to disable it
      });

      this.currentFocusIndex = -1;
      gsap.to(this.camera.position, {
        duration: 1.8,
        x: 0,
        y: 0,
        z: 5,
        ease: 'power3.inOut',
      });

      // Reset spotlight
      gsap.to(this.spotLight.target.position, {
        duration: 1.5,
        x: 0,
        y: 0,
        z: 0,
        ease: 'power2.inOut',
      });

      this.onFocusChange.next(null);
    }
  }
  public returnToGeneralView(): void {
    // Do nothing if we are already in the general view
    if (this.currentFocusIndex === -1) {
      return;
    }

    // If a paper was focused, animate its scale back to normal
    const oldPaper = this.papers[this.currentFocusIndex];
    if (oldPaper) {
      gsap.to(oldPaper.scale, {
        duration: 0.8,
        x: 1,
        y: 1,
        z: 1,
        ease: 'power2.out',
      });
    }

    // Reset effects when no paper is focused
    gsap.to(this.bloomParams, {
      duration: 1.0,
      strength: 0.0,
      ease: 'power2.out',
    });

    // Animate to general view DOF settings (keep blur enabled)
    gsap.to(this.dofParams, {
      duration: 1.8,
      focus: 8.0, // Focus further back for general view blur
      aperture: 0.006, // Moderate blur for atmospheric effect
      maxblur: 0.012, // Maintain some blur in general view
      ease: 'power2.inOut',
      // DOF stays enabled - no onComplete callback
    });

    // Reset the focus index state
    this.currentFocusIndex = -1;

    // Animate camera back to the default position
    gsap.to(this.camera.position, {
      duration: 1.8,
      x: 0,
      y: 0,
      z: 5,
      ease: 'power3.inOut',
    });

    // Reset spotlight
    gsap.to(this.spotLight.target.position, {
      duration: 1.5,
      x: 0,
      y: 0,
      z: 0,
      ease: 'power2.inOut',
    });

    // Notify the component that no paper is focused
    this.onFocusChange.next(null);
  }
  // Enhanced utility methods
  public setScrollCooldown(milliseconds: number): void {
    this.scrollCooldown = milliseconds;
  }

  public setScrollThreshold(threshold: number): void {
    this.scrollThreshold = threshold;
  }

  public adjustLightingIntensity(multiplier: number): void {
    this.accentLight1.intensity = 2.0 * multiplier;
    this.accentLight2.intensity = 1.8 * multiplier;
    this.spotLight.intensity = 3.0 * multiplier;
    this.rimLight.intensity = 1.2 * multiplier;
  }

  private dynamicLightingEnabled = true;
  public toggleDynamicLighting(): void {
    this.dynamicLightingEnabled = !this.dynamicLightingEnabled;
  }

  // Enhanced bloom control methods
  public setBloomParams(strength: number, radius: number, threshold: number): void {
    this.bloomParams = { strength, radius, threshold };
  }

  public getBloomStrength(): number {
    return this.bloomParams.strength;
  }

  // New Depth of Field control methods
  public setDOFParams(focus: number, aperture: number, maxblur: number): void {
    this.dofParams.focus = focus;
    this.dofParams.aperture = aperture;
    this.dofParams.maxblur = maxblur;
  }

  public getDOFParams(): { focus: number; aperture: number; maxblur: number } {
    return {
      focus: this.dofParams.focus,
      aperture: this.dofParams.aperture,
      maxblur: this.dofParams.maxblur,
    };
  }

  public enableDOF(enabled: boolean): void {
    this.dofParams.enabled = enabled;
    if (this.bokehPass) {
      this.bokehPass.enabled = enabled;
    }
    // Note: This method can still be used to completely disable DOF if needed
  }

  public isDOFEnabled(): boolean {
    return this.dofParams.enabled;
  }

  // Method to manually set focus to a specific distance
  public setFocusDistance(distance: number): void {
    gsap.to(this.dofParams, {
      duration: 1.0,
      focus: distance,
      ease: 'power2.out',
    });
  }

  // Method to animate aperture for cinematic effects
  public animateAperture(targetAperture: number, duration: number = 1.5): void {
    gsap.to(this.dofParams, {
      duration: duration,
      aperture: targetAperture,
      ease: 'power2.inOut',
    });
  }

  private createAtmosphericParticles(): void {
    // --- Tweakable Parameters ---
    const particleCount = 7000; // How many particles to create
    const boxSize = 60; // The size of the box they will be distributed in

    const positions = new Float32Array(particleCount * 3);
    // This array will hold unique animation data for each particle:
    // x = animation offset, y = animation speed
    const animationData = new Float32Array(particleCount * 2);

    for (let i = 0; i < particleCount; i++) {
      // Generate a random position inside a box
      positions[i * 3 + 0] = (Math.random() - 0.5) * boxSize; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize; // z

      // Generate random animation properties for each particle
      animationData[i * 2 + 0] = Math.random() * Math.PI * 2; // Random offset (0 to 2PI)
      animationData[i * 2 + 1] = 0.5 + Math.random() * 0.5; // Random speed (0.5 to 1.0)
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAnimationData', new THREE.BufferAttribute(animationData, 2));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      blending: THREE.AdditiveBlending, // This makes the particles glow when they overlap
      depthWrite: false, // Essential for correct transparency rendering
    });

    // This is where the magic happens! We inject GLSL code into the material.
    material.onBeforeCompile = (shader) => {
      // Add a 'time' uniform for animation
      shader.uniforms['time'] = { value: 0.0 };
      // Add our custom attribute and a varying to pass data to the fragment shader
      shader.vertexShader = `
      attribute vec2 aAnimationData;
      varying vec2 vAnimationData;
      ${shader.vertexShader}
    `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
      vAnimationData = aAnimationData;`
      );

      // Animate the opacity in the fragment shader
      shader.fragmentShader = `
      uniform float time;
      varying vec2 vAnimationData;
      ${shader.fragmentShader}
    `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
      // Calculate a smoothly oscillating value between 0.0 and 1.0
      float blink = (sin(time * vAnimationData.y + vAnimationData.x) + 1.0) / 2.0;
      
      // Make the blinking sharper by using pow()
      blink = pow(blink, 2.0);

      vec4 diffuseColor = vec4( diffuse, opacity * blink );`
      );

      // Store a reference to the modified shader uniforms
      this.particleMaterial = shader as any;
    };

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
  }
}
