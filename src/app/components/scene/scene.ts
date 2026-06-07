// File: src/app/components/scene/scene.ts
// PHASE 0 — no structural changes needed here; ThreeService handles everything.
import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { ThreeService } from '../../services/three.service';
import { PaperData } from '../../models/paper-data.model';
import { PAPER_DATA } from '../../data/paper-data';

@Component({
  selector: 'app-scene',
  standalone: true,
  templateUrl: './scene.html',
  styleUrls: ['./scene.scss'],
})
export class Scene implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef!: ElementRef;

  private papers: PaperData[] = PAPER_DATA;

  constructor(private threeService: ThreeService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      this.threeService.createScene(this.canvasRef);
      this.threeService.addPapers(this.papers);
      this.threeService.animate();
      this.threeService.setupScrollAnimation();
    } else {
      console.error('Canvas element not found for Three.js scene.');
    }
  }

  ngOnDestroy(): void {
    // Full disposal is handled by ProjectsComponent.ngOnDestroy via ThreeService.
  }
}
