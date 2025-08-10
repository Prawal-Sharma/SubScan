// PDF.js type definitions
export interface PDFTextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

export interface PDFTextContent {
  items: PDFTextItem[];
  styles: Record<string, any>;
}