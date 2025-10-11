import logger from './logger';

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
    logger.info(`⏱️  [${label}] Started`);
  }

  /**
   * Mark a checkpoint
   */
  checkpoint(name: string): void {
    const elapsed = Date.now() - this.startTime;
    this.checkpoints.set(name, elapsed);
    logger.info(`⏱️  [${this.label}] ${name}: ${elapsed}ms`);
  }

  /**
   * Get elapsed time since start
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Complete monitoring and log summary
   */
  complete(): void {
    const totalTime = this.elapsed();
    logger.info(`✅ [${this.label}] Completed in ${totalTime}ms`);
    
    // Log all checkpoints
    if (this.checkpoints.size > 0) {
      logger.info(`📊 [${this.label}] Checkpoints:`);
      this.checkpoints.forEach((time, name) => {
        logger.info(`   - ${name}: ${time}ms`);
      });
    }
  }
}

/**
 * Simple performance timer decorator
 */
export function measurePerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const monitor = new PerformanceMonitor(`${target.constructor.name}.${propertyName}`);
    try {
      const result = await originalMethod.apply(this, args);
      monitor.complete();
      return result;
    } catch (error) {
      monitor.checkpoint('Error occurred');
      throw error;
    }
  };

  return descriptor;
}
