/**
 * Web Worker Manager for offloading heavy processing
 */

interface WorkerTask {
  id: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
}

export class WorkerManager {
  private worker: Worker | null = null;
  private tasks: Map<string, WorkerTask> = new Map();
  private isInitialized = false;

  /**
   * Initialize the worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create worker with type module for better compatibility
      this.worker = new Worker(
        new URL('../workers/pdfProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.addEventListener('message', this.handleMessage.bind(this));
      this.worker.addEventListener('error', this.handleError.bind(this));
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      throw new Error('Web Worker initialization failed');
    }
  }

  /**
   * Handle messages from worker
   */
  private handleMessage(event: MessageEvent): void {
    const { id, type, data, error } = event.data;
    const task = this.tasks.get(id);
    
    if (!task) return;
    
    // Clear timeout if exists
    if (task.timeout) {
      clearTimeout(task.timeout);
    }
    
    if (type === 'ERROR') {
      task.reject(new Error(error || 'Worker error'));
    } else if (type === 'SUCCESS') {
      task.resolve(data);
    }
    // Note: PROGRESS type can be handled here for progress updates
    
    // Clean up completed task
    if (type !== 'PROGRESS') {
      this.tasks.delete(id);
    }
  }

  /**
   * Handle worker errors
   */
  private handleError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // Reject all pending tasks
    for (const task of this.tasks.values()) {
      task.reject(new Error('Worker crashed'));
    }
    
    this.tasks.clear();
    this.cleanup();
  }

  /**
   * Send task to worker
   */
  async sendTask<T>(
    type: string, 
    data: any, 
    timeoutMs: number = 30000
  ): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.worker) {
      throw new Error('Worker not available');
    }
    
    const id = this.generateId();
    
    return new Promise<T>((resolve, reject) => {
      const task: WorkerTask = {
        id,
        resolve: resolve as (value: any) => void,
        reject
      };
      
      // Set timeout
      if (timeoutMs > 0) {
        task.timeout = setTimeout(() => {
          this.tasks.delete(id);
          reject(new Error(`Worker task timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }
      
      this.tasks.set(id, task);
      
      // Send message to worker
      this.worker!.postMessage({ type, data, id });
    });
  }

  /**
   * Process text in worker
   */
  async processText(text: string): Promise<string> {
    return this.sendTask<string>('PROCESS_TEXT', { text });
  }

  /**
   * Parse transactions in worker
   */
  async parseTransactions(text: string, bankType: string): Promise<any[]> {
    return this.sendTask<any[]>('PARSE_TRANSACTIONS', { text, bankType });
  }

  /**
   * Detect bank type in worker
   */
  async detectBankType(text: string): Promise<string> {
    return this.sendTask<string>('DETECT_BANK', { text });
  }

  /**
   * Generate unique task ID
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if worker is available
   */
  isAvailable(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Clear all pending tasks
    for (const task of this.tasks.values()) {
      if (task.timeout) {
        clearTimeout(task.timeout);
      }
      task.reject(new Error('Worker terminated'));
    }
    
    this.tasks.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
let workerManagerInstance: WorkerManager | null = null;

/**
 * Get worker manager instance
 */
export function getWorkerManager(): WorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager();
  }
  return workerManagerInstance;
}

/**
 * Check if Workers are supported
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}