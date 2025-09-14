import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ThreeService } from '../../services/three.service';
import { PaperData } from '../../models/paper-data.model';

@Component({
  selector: 'app-scene',
  standalone: true,
  templateUrl: './scene.html',
  styleUrls: ['./scene.scss']
})
export class Scene implements OnInit, AfterViewInit {
  @ViewChild('canvas') private canvasRef!: ElementRef;
  
  private papers: PaperData[] = [
    { 
      id: 1, 
      imageUrl: 'assets/images/background.png', 
      title: 'Hello', 
      description: 'Description for paper 1.', 
      position: { x: -8, y: 5, z: -12 }, 
      rotation: { x: -0.2, y: 0.8, z: 0.3 } 
    },
    { 
      id: 2, 
      imageUrl: 'assets/images/background.png', 
      title: 'Paper 2', 
      description: 'Description for paper 2.', 
      position: { x: 12, y: 2, z: -20 }, 
      rotation: { x: -0.3, y: 1.2, z: -0.4 } 
    },
    { 
      id: 3, 
      imageUrl: 'assets/images/paperNormal.jpg', 
      title: 'Supp', 
      description: 'Description for paper 3.', 
      position: { x: -15, y: -8, z: -5 }, 
      rotation: { x: -0.2, y: 1, z: 0.6 } 
    },
    { 
      id: 4, 
      imageUrl: 'assets/images/image1.png', 
      title: 'Paper 4', 
      description: 'Description for paper 4.', 
      position: { x: 18, y: -12, z: -25 }, 
      rotation: { x: -0.3, y: 0.9, z: -0.2 } 
    },
    { 
      id: 5, 
      imageUrl: 'assets/images/image1.png', 
      title: 'Paper 5', 
      description: 'Description for paper 5.', 
      position: { x: -22, y: -15, z: -8 }, 
      rotation: { x: -0.2, y: 0.8, z: 0.8 } 
    },
    { 
      id: 6, 
      imageUrl: 'assets/images/image1.png', 
      title: 'Paper 6', 
      description: 'Description for paper 6.', 
      position: { x: 6, y: 18, z: -15 }, 
      rotation: { x: -0.3, y: 0.9, z: 0.7 } 
    },
    { 
      id: 7, 
      imageUrl: 'assets/images/image1.png', 
      title: 'Paper 7', 
      description: 'Description for paper 7.', 
      position: { x: -10, y: 12, z: -30 }, 
      rotation: { x: -0.2, y: 1, z: -0.5 } 
    },
    { 
      id: 8, 
      imageUrl: 'assets/images/image1.png', 
      title: 'Paper 8', 
      description: 'Description for paper 8.', 
      position: { x: 25, y: 8, z: -18 }, 
      rotation: { x: -0.3, y: 1.2, z: 0.4 } 
    },
    { 
      id: 9, 
      imageUrl: 'assets/images/image1.png', 
      title: 'Paper 9', 
      description: 'Description for paper 9.', 
      position: { x: -18, y: 22, z: -22 }, 
      rotation: { x: -0.2, y: -1.2, z: 0.9 } 
    },
    { 
      id: 10, 
      imageUrl: 'assets/images/image10.jpg', 
      title: 'Paper 10', 
      description: 'Description for paper 10.', 
      position: { x: 14, y: -20, z: -10 }, 
      rotation: { x: 0.7, y: 0.6, z: -0.8 } 
    },
    { 
      id: 11, 
      imageUrl: 'assets/images/image11.jpg', 
      title: 'Paper 11', 
      description: 'Description for paper 11.', 
      position: { x: -28, y: 4, z: -35 }, 
      rotation: { x: -0.2, y: -2.5, z: 0.3 } 
    },
    { 
      id: 12, 
      imageUrl: 'assets/images/image12.jpg', 
      title: 'Paper 12', 
      description: 'Description for paper 12.', 
      position: { x: 8, y: -8, z: -28 }, 
      rotation: { x: 0.6, y: 1.4, z: 0.2 } 
    },
    { 
      id: 13, 
      imageUrl: 'assets/images/image13.jpg', 
      title: 'Paper 13', 
      description: 'Description for paper 13.', 
      position: { x: -12, y: -25, z: -14 }, 
      rotation: { x: -0.8, y: -0.9, z: -0.6 } 
    },
    { 
      id: 14, 
      imageUrl: 'assets/images/image14.jpg', 
      title: 'Paper 14', 
      description: 'Description for paper 14.', 
      position: { x: 20, y: 15, z: -40 }, 
      rotation: { x: 0.3, y: 2.2, z: -0.7 } 
    },
    { 
      id: 15, 
      imageUrl: 'assets/images/image15.jpg', 
      title: 'Paper 15', 
      description: 'Description for paper 15.', 
      position: { x: -35, y: -18, z: -32 }, 
      rotation: { x: 0.9, y: -1.8, z: 1.1 } 
    }
  ];

  constructor(private threeService: ThreeService) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.threeService.createScene(this.canvasRef);
    this.threeService.addPapers(this.papers);
    this.threeService.animate();
    this.threeService.setupScrollAnimation();
  }
}