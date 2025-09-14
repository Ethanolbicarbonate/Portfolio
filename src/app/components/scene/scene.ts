import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { ThreeService } from '../../services/three.service';
import { PaperData } from '../../models/paper-data.model';

@Component({
  selector: 'app-scene',
  standalone: true,
  templateUrl: './scene.html',
  styleUrls: ['./scene.scss'],
})
export class Scene implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef!: ElementRef;

  private papers: PaperData[] = [
    {
      id: 1,
      imageUrl: 'assets/images/image1.png',
      title: 'When Pens Wander',
      description: 'Description for paper 1.',
      position: { x: -8, y: 5, z: -10 },
      rotation: { x: -0.2, y: 0.8, z: 0.3 },
    },
    {
      id: 2,
      imageUrl: 'assets/images/image2.png',
      title: 'Rakugaki',
      description: 'Description for paper 2.',
      position: { x: 12, y: 2, z: -20 },
      rotation: { x: -0.3, y: 1.2, z: -0.4 },
    },
    {
      id: 3,
      imageUrl: 'assets/images/image3.jpg',
      title: 'Rest',
      description: 'Description for paper 3.',
      position: { x: -8, y: -5, z: -5 },
      rotation: { x: -0.2, y: 1, z: 0.6 },
    },
    {
      id: 4,
      imageUrl: 'assets/images/image4.png',
      title: 'Psst',
      description: 'Description for paper 4.',
      position: { x: 18, y: -12, z: -25 },
      rotation: { x: -0.3, y: 0.9, z: -0.2 },
    },
    {
      id: 5,
      imageUrl: 'assets/images/image5.png',
      title: 'Lines',
      description: 'Description for paper 5.',
      position: { x: 1, y: -6, z: -8 },
      rotation: { x: -0.2, y: 0.8, z: 0.8 },
    },
    {
      id: 6,
      imageUrl: 'assets/images/image6.png',
      title: 'Statue',
      description: 'Description for paper 6.',
      position: { x: 6, y: 10, z: -15 },
      rotation: { x: -0.3, y: 0.9, z: 0.7 },
    },
    {
      id: 7,
      imageUrl: 'assets/images/image7.png',
      title: 'Shrine',
      description: 'Description for paper 7.',
      position: { x: -10, y: 12, z: -30 },
      rotation: { x: -0.2, y: 1, z: -0.5 },
    },
    {
      id: 8,
      imageUrl: 'assets/images/image8.png',
      title: 'Caleb Graduation',
      description: 'Description for paper 8.',
      position: { x: 25, y: 8, z: -18 },
      rotation: { x: -0.3, y: 1.2, z: 0.4 },
    },
    {
      id: 9,
      imageUrl: 'assets/images/image9.png',
      title: 'Halcyon Days',
      description: 'Description for paper 9.',
      position: { x: 0, y: 0, z: -22 },
      rotation: { x: -0.2, y: 0.8, z: 0.9 },
    },
    {
      id: 10,
      imageUrl: 'assets/images/image10.png',
      title: 'Tranquil',
      description: 'Description for paper 10.',
      position: { x: 14, y: -10, z: -10 },
      rotation: { x: -0.3, y: 0.9, z: -0.8 },
    },
    {
      id: 11,
      imageUrl: 'assets/images/image11.png',
      title: 'The Wild Robot',
      description: 'Description for paper 11.',
      position: { x: -6, y: 5, z: -2 },
      rotation: { x: -0.2, y: 1.5, z: 0.3 },
    },
  ];

  constructor(private threeService: ThreeService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      this.threeService.createScene(this.canvasRef);
      this.threeService.addPapers(this.papers);
      this.threeService.animate();
      this.threeService.setupScrollAnimation(); // Moved here
    } else {
      console.error('Canvas element not found for Three.js scene.');
    }
  }
  ngOnDestroy(): void {
    console.log('Scene component ngOnDestroy called. Three.js service handles full disposal.');
    // The ThreeService instance is providedIn: 'root', so it lives longer than this component.
    // The ProjectsComponent's ngOnDestroy now explicitly calls disposeScene on the service.
    // This ngOnDestroy here mostly serves as a confirmation log.
  }
}
