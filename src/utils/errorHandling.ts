/**
 * Comprehensive error handling utilities for SubScan
 */

export interface ProcessingError {
  type: ErrorType;
  message: string;
  details?: string;
  filename?: string;
  recoverable: boolean;
}

export enum ErrorType {
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_PASSWORD_PROTECTED = 'FILE_PASSWORD_PROTECTED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  BROWSER_INCOMPATIBLE = 'BROWSER_INCOMPATIBLE',
  WORKER_FAILED = 'WORKER_FAILED',
  BANK_NOT_SUPPORTED = 'BANK_NOT_SUPPORTED',
  PARSING_FAILED = 'PARSING_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Check browser compatibility
 */
export function checkBrowserCompatibility(): ProcessingError | null {
  const issues: string[] = [];
  
  // Check for required APIs
  if (!window.FileReader) {
    issues.push('FileReader API not supported');
  }
  
  if (!window.Worker) {
    issues.push('Web Workers not supported');
  }
  
  if (!window.Blob) {
    issues.push('Blob API not supported');
  }
  
  // Check for Canvas API (required for PDF.js)
  const canvas = document.createElement('canvas');
  if (!canvas.getContext) {
    issues.push('Canvas API not supported');
  }
  
  // Check for sufficient memory (rough estimate)
  if ('memory' in performance && (performance as any).memory.jsHeapSizeLimit) {
    const memoryLimit = (performance as any).memory.jsHeapSizeLimit;
    const minMemory = 512 * 1024 * 1024; // 512MB minimum
    if (memoryLimit < minMemory) {
      issues.push('Insufficient memory available');
    }
  }
  
  if (issues.length > 0) {
    return {
      type: ErrorType.BROWSER_INCOMPATIBLE,
      message: 'Your browser may not support all required features',
      details: issues.join(', '),
      recoverable: false
    };
  }
  
  return null;
}

/**
 * Check file size and validate it's within limits
 */
export function validateFileSize(file: File): ProcessingError | null {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      type: ErrorType.FILE_TOO_LARGE,
      message: `File "${file.name}" is too large`,
      details: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      filename: file.name,
      recoverable: false
    };
  }
  
  return null;
}

/**
 * Classify PDF processing errors
 */
export function classifyPDFError(error: Error, filename?: string): ProcessingError {
  const errorMessage = error.message.toLowerCase();
  
  // Check for password-protected PDFs
  if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
    return {
      type: ErrorType.FILE_PASSWORD_PROTECTED,
      message: 'PDF is password-protected',
      details: 'Please remove the password protection from the PDF before uploading',
      filename,
      recoverable: false
    };
  }
  
  // Check for corrupted PDFs
  if (errorMessage.includes('corrupt') || errorMessage.includes('invalid pdf') || 
      errorMessage.includes('bad xref') || errorMessage.includes('startxref')) {
    return {
      type: ErrorType.FILE_CORRUPTED,
      message: 'PDF file appears to be corrupted',
      details: 'The file may be damaged or incomplete. Try downloading it again or use a different file',
      filename,
      recoverable: false
    };
  }
  
  // Check for memory issues
  if (errorMessage.includes('memory') || errorMessage.includes('heap') || 
      errorMessage.includes('out of memory')) {
    return {
      type: ErrorType.MEMORY_LIMIT,
      message: 'Insufficient memory to process file',
      details: 'The file is too complex to process. Try closing other browser tabs or using a smaller file',
      filename,
      recoverable: true
    };
  }
  
  // Check for worker failures
  if (errorMessage.includes('worker') || errorMessage.includes('failed to fetch')) {
    return {
      type: ErrorType.WORKER_FAILED,
      message: 'PDF processing worker failed to load',
      details: 'There was an issue loading required resources. Please refresh the page and try again',
      filename,
      recoverable: true
    };
  }
  
  // Check for unsupported bank
  if (errorMessage.includes('unable to detect bank') || errorMessage.includes('bank not supported')) {
    return {
      type: ErrorType.BANK_NOT_SUPPORTED,
      message: 'Bank statement format not recognized',
      details: 'This bank\'s statement format is not currently supported. Supported banks: Wells Fargo, Capital One, Chase, Bank of America, Discover',
      filename,
      recoverable: false
    };
  }
  
  // Check for parsing failures
  if (errorMessage.includes('parsing') || errorMessage.includes('no transactions')) {
    return {
      type: ErrorType.PARSING_FAILED,
      message: 'Failed to extract transactions from PDF',
      details: 'The PDF structure may have changed or be in an unexpected format. Please ensure this is a valid bank statement',
      filename,
      recoverable: false
    };
  }
  
  // Default unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    details: error.message,
    filename,
    recoverable: true
  };
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: ProcessingError): string {
  let message = error.message;
  
  if (error.filename) {
    message = `${error.filename}: ${message}`;
  }
  
  if (error.details) {
    message += `. ${error.details}`;
  }
  
  if (error.recoverable) {
    message += ' Please try again.';
  }
  
  return message;
}

/**
 * Create a retry mechanism for recoverable errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is recoverable
      const classified = classifyPDFError(lastError);
      if (!classified.recoverable) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Monitor memory usage and warn if getting close to limits
 */
export function getMemoryUsage(): { used: number; limit: number; percentage: number } | null {
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize;
    const limit = memory.jsHeapSizeLimit;
    const percentage = (used / limit) * 100;
    
    return { used, limit, percentage };
  }
  
  return null;
}

/**
 * Check if we're approaching memory limits
 */
export function isMemoryConstrained(): boolean {
  const usage = getMemoryUsage();
  if (usage) {
    return usage.percentage > 80; // Warn if using more than 80% of available memory
  }
  return false;
}

/**
 * Clean up resources to free memory
 */
export function cleanupResources(): void {
  // Force garbage collection if available (non-standard)
  if ((window as any).gc) {
    (window as any).gc();
  }
  
  // Clear any cached data
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
}