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