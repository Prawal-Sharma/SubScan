import * as pdfjsLib from 'pdfjs-dist';
import { ParserResult, BankType, PDFParseOptions } from '../types';
import { PDFTextItem } from '../types/pdf';
import { 
  WellsFargoParser,
  BankOfAmericaParser,
  ChaseParser,
  DiscoverParser,
  CapitalOneParser
} from '../parsers';
import { 
  validateFileSize, 
  classifyPDFError, 
  isMemoryConstrained,
  cleanupResources 
} from '../utils/errorHandling';
import { OCRProcessor } from './ocrProcessor';

// Configure PDF.js worker - using local file for privacy
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export class PDFProcessor {
  private wellsFargoParser = new WellsFargoParser();
  private bankOfAmericaParser = new BankOfAmericaParser();
  private chaseParser = new ChaseParser();
  private discoverParser = new DiscoverParser();
  private capitalOneParser = new CapitalOneParser();
  private ocrProcessor = new OCRProcessor();
  
  async processPDF(file: File, options: PDFParseOptions = {}): Promise<ParserResult> {
    try {
      // Validate file size
      const sizeError = validateFileSize(file);
      if (sizeError) {
        return {
          success: false,
          error: sizeError.message + (sizeError.details ? ': ' + sizeError.details : '')
        };
      }
      
      // Check memory constraints
      if (isMemoryConstrained()) {
        cleanupResources();
        if (isMemoryConstrained()) {
          return {
            success: false,
            error: 'Insufficient memory available. Please close other browser tabs and try again.'
          };
        }
      }
      
      // Read file as array buffer
      let arrayBuffer = await this.fileToArrayBuffer(file);
      
      // Load PDF document with timeout
      const pdf = await Promise.race([
        pdfjsLib.getDocument({ data: arrayBuffer }).promise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('PDF loading timeout')), 30000)
        )
      ]);
      
      // Extract text from all pages
      let text = await this.extractTextFromPDF(pdf, options.startPage, options.endPage);
      
      // Check if document appears to be scanned and needs OCR
      if (this.ocrProcessor.isScannedDocument(text)) {
        console.log('Document appears to be scanned, attempting OCR...');
        text = await this.extractTextWithOCR(pdf, options.startPage, options.endPage);
      }
      
      // Detect bank type if not provided
      const bankType = options.bankType || this.detectBankType(text);
      
      // Parse based on bank type
      const result = await this.parseByBankType(text, bankType);
      
      // Add filename to the parsed statement
      if (result.success && result.data) {
        result.data.sourceFile = file.name;
      }
      
      // Clean up resources after processing
      if (pdf) {
        try {
          await pdf.cleanup();
          await pdf.destroy();
        } catch {
          // Silently handle cleanup errors
        }
      }
      
      // Force garbage collection hint
      if (arrayBuffer && arrayBuffer.byteLength > 10 * 1024 * 1024) { // > 10MB
        // Release large buffers
        arrayBuffer = null as unknown as ArrayBuffer;
      }
      
      return result;
    } catch (error) {
      // Clean up on error
      cleanupResources();
      
      const classified = classifyPDFError(error as Error, file.name);
      return {
        success: false,
        error: classified.message + (classified.details ? ': ' + classified.details : '')
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
      const items = textContent.items as PDFTextItem[];
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
  
  private async extractTextWithOCR(
    pdf: pdfjsLib.PDFDocumentProxy,
    startPage = 1,
    endPage?: number
  ): Promise<string> {
    const numPages = pdf.numPages;
    const lastPage = endPage || numPages;
    const textParts: string[] = [];
    
    // Initialize OCR processor
    await this.ocrProcessor.initialize();
    
    for (let pageNum = startPage; pageNum <= Math.min(lastPage, numPages); pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Render page to canvas
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to create canvas context for OCR');
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Process with OCR
      try {
        const pageText = await this.ocrProcessor.processPDFPage(canvas);
        textParts.push(pageText);
      } catch (error) {
        console.error(`OCR failed for page ${pageNum}:`, error);
        // Fall back to regular text extraction for this page
        const textContent = await page.getTextContent();
        const items = textContent.items as PDFTextItem[];
        const pageText = items.map(item => item.str).join(' ');
        textParts.push(pageText);
      }
      
      // Clean up canvas
      canvas.remove();
    }
    
    // Clean up OCR resources
    await this.ocrProcessor.cleanup();
    
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
    } else if (textLower.includes('bank of america') || textLower.includes('bkofamerica')) {
      return 'bank-of-america';
    } else if (textLower.includes('discover')) {
      return 'discover';
    }
    
    return 'unknown';
  }
  
  private async parseByBankType(text: string, bankType: BankType): Promise<ParserResult> {
    switch (bankType) {
      case 'wells-fargo':
        return this.wellsFargoParser.parse(text);
      
      case 'capital-one':
        return this.capitalOneParser.parse(text);
      
      case 'chase':
        return this.chaseParser.parse(text);
        
      case 'bank-of-america':
        return this.bankOfAmericaParser.parse(text);
        
      case 'discover':
        return this.discoverParser.parse(text);
      
      default: {
        // Try to auto-detect from text content as fallback
        const detectedType = this.detectBankType(text);
        if (detectedType !== 'unknown') {
          return this.parseByBankType(text, detectedType);
        }
        return {
          success: false,
          error: 'Unable to detect bank type. Please select your bank manually.',
        };
      }
    }
  }
}