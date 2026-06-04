import { ProcessProject } from '../models/process-data.model';

export const PROCESS_DATA: ProcessProject = {
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