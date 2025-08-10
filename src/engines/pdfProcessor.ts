import * as pdfjsLib from 'pdfjs-dist';
import { ParserResult, BankType, PDFParseOptions } from '../types';
import { WellsFargoParser } from '../parsers/wellsFargoParser';

// Configure PDF.js worker - using local file for privacy
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export class PDFProcessor {
  private wellsFargoParser = new WellsFargoParser();
  
  async processPDF(file: File, options: PDFParseOptions = {}): Promise<ParserResult> {
    try {
      // Read file as array buffer
      const arrayBuffer = await this.fileToArrayBuffer(file);
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Extract text from all pages
      const text = await this.extractTextFromPDF(pdf, options.startPage, options.endPage);
      
      // Detect bank type if not provided
      const bankType = options.bankType || this.detectBankType(text);
      
      // Parse based on bank type
      return this.parseByBankType(text, bankType);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process PDF',
      };
    }
  }
  
  private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  
  private async extractTextFromPDF(
    pdf: pdfjsLib.PDFDocumentProxy,
    startPage = 1,
    endPage?: number
  ): Promise<string> {
    const numPages = pdf.numPages;
    const lastPage = endPage || numPages;
    const textParts: string[] = [];
    
    for (let pageNum = startPage; pageNum <= Math.min(lastPage, numPages); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sort text items by position to maintain reading order
      const items = textContent.items as any[];
      items.sort((a, b) => {
        // Sort by Y position first (top to bottom)
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        // Then by X position (left to right)
        return a.transform[4] - b.transform[4];
      });
      
      // Build text with proper spacing
      let pageText = '';
      let lastY = null;
      let lastX = null;
      
      for (const item of items) {
        const y = item.transform[5];
        const x = item.transform[4];
        const text = item.str;
        
        if (lastY !== null) {
          // Check if we're on a new line
          if (Math.abs(y - lastY) > 5) {
            pageText += '\n';
            lastX = null;
          } else if (lastX !== null) {
            // Add space between items on the same line if there's a gap
            const gap = x - lastX;
            if (gap > item.width * 0.5) {
              pageText += ' ';
            }
          }
        }
        
        pageText += text;
        lastY = y;
        lastX = x + item.width;
      }
      
      textParts.push(pageText);
    }
    
    return textParts.join('\n\n');
  }
  
  private detectBankType(text: string): BankType {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('wells fargo')) {
      return 'wells-fargo';
    } else if (textLower.includes('capital one') || textLower.includes('venture')) {
      return 'capital-one';
    } else if (textLower.includes('chase')) {
      return 'chase';
    } else if (textLower.includes('bank of america')) {
      return 'bank-of-america';
    }
    
    return 'unknown';
  }
  
  private parseByBankType(text: string, bankType: BankType): ParserResult {
    switch (bankType) {
      case 'wells-fargo':
        return this.wellsFargoParser.parse(text);
      
      case 'capital-one':
        // TODO: Implement Capital One parser
        return {
          success: false,
          error: 'Capital One parser not yet implemented',
        };
      
      case 'chase':
      case 'bank-of-america':
        return {
          success: false,
          error: `${bankType} parser not yet implemented`,
        };
      
      default:
        return {
          success: false,
          error: 'Unable to detect bank type. Manual column mapping required.',
        };
    }
  }
}