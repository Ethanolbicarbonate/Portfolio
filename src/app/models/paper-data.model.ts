export interface PaperData {
  id: number;
  imageUrl: string;
  title: string;
  description: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}