import { createWorker, Worker } from 'tesseract.js';

export class OCRProcessor {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize the OCR worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = await createWorker('eng', 1, {
        logger: m => {
          // Optionally log progress
          if (m.status === 'recognizing text') {
            // Progress: m.progress (0-1)
          }
        },
        // Use local files for better privacy
        workerPath: '/tesseract-worker.min.js',
        corePath: '/tesseract-core.wasm.js',
        langPath: '/'
      });
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process an image/PDF page with OCR
   */
  async processImage(imageData: Blob | ImageData | string): Promise<string> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const result = await this.worker.recognize(imageData);
      return result.data.text;
    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a PDF page by converting it to an image first
   */
  async processPDFPage(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert PDF page to image'));
          return;
        }

        try {
          const text = await this.processImage(blob);
          resolve(text);
        } catch (error) {
          reject(error);
        }
      }, 'image/png');
    });
  }

  /**
   * Check if text appears to be from a scanned document
   */
  isScannedDocument(text: string): boolean {
    // Heuristics to detect if a document is scanned:
    // 1. Very little text extracted
    // 2. Text contains unusual character patterns
    // 3. No coherent sentence structure
    
    const cleanText = text.trim();
    
    // If text is too short, likely a scanned document
    if (cleanText.length < 100) {
      return true;
    }
    
    // Check for coherent words (at least some dictionary words)
    const words = cleanText.split(/\s+/);
    const meaningfulWords = words.filter(w => w.length > 3);
    
    if (meaningfulWords.length < 10) {
      return true;
    }
    
    // Check for normal sentence patterns (capitals, periods, etc.)
    const sentences = cleanText.split(/[.!?]/);
    const wellFormedSentences = sentences.filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 10 && /^[A-Z]/.test(trimmed);
    });
    
    if (wellFormedSentences.length < 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Process with automatic quality detection and enhancement
   */
  async processWithEnhancement(
    imageData: Blob | ImageData | string,
    options: {
      enhance?: boolean;
      language?: string;
    } = {}
  ): Promise<{ text: string; confidence: number }> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      // First attempt with normal settings
      const result = await this.worker.recognize(imageData);
      const confidence = result.data.confidence;
      let text = result.data.text;

      // If confidence is low and enhancement is enabled
      if (confidence < 70 && options.enhance) {
        // Could implement image preprocessing here
        // For now, we'll use the original result
      }

      return { text, confidence };
    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract financial data patterns from OCR text
   */
  extractFinancialPatterns(text: string): {
    dates: string[];
    amounts: string[];
    merchants: string[];
  } {
    const patterns = {
      dates: [] as string[],
      amounts: [] as string[],
      merchants: [] as string[]
    };

    // Extract dates (MM/DD/YYYY, MM-DD-YYYY, etc.)
    const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
    const dateMatches = text.match(dateRegex);
    if (dateMatches) {
      patterns.dates = dateMatches;
    }

    // Extract amounts ($XX.XX, XX.XX)
    const amountRegex = /\$?\d{1,3}(?:,\d{3})*\.\d{2}/g;
    const amountMatches = text.match(amountRegex);
    if (amountMatches) {
      patterns.amounts = amountMatches;
    }

    // Extract potential merchant names (capitalized phrases)
    const lines = text.split('\n');
    for (const line of lines) {
      // Look for lines that might be merchant names
      if (line.length > 3 && line.length < 50) {
        const hasAmount = amountRegex.test(line);
        const hasDate = dateRegex.test(line);
        
        // If line doesn't have amount or date, might be merchant
        if (!hasAmount && !hasDate && /[A-Z]/.test(line)) {
          patterns.merchants.push(line.trim());
        }
      }
    }

    return patterns;
  }
}