/**
 * Adaptive Rate Limiter for external APIs
 * Automatically adjusts delay based on received errors (403, 429, etc.)
 */
export class AdaptiveRateLimiter {
  private baseDelayMs: number;
  private maxDelayMs: number;
  private currentDelayMs: number;
  private errorCount: number;
  private successCount: number;
  private lastRequestTime: number;
  private readonly backoffMultiplier: number = 1.5;
  private readonly recoveryThreshold: number = 5; // successful requests before reducing delay

  constructor(baseDelayMs: number = 2000, maxDelayMs: number = 30000) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.currentDelayMs = baseDelayMs;
    this.errorCount = 0;
    this.successCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Get the current delay with random jitter
   */
  async getDelay(): Promise<number> {
    const jitter = Math.random() * 1000; // 0-1000ms jitter
    return Math.min(this.currentDelayMs + jitter, this.maxDelayMs);
  }

  /**
   * Wait for the appropriate delay before making next request
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const requiredDelay = await this.getDelay();

    const isCondition = timeSinceLastRequest < requiredDelay;
    if (isCondition) {
      const waitTime = requiredDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Record a successful request
   * Gradually reduces delay after multiple successes
   */
  onSuccess(): void {
    this.successCount++;
    this.errorCount = 0;

    const isCondition = this.successCount >= this.recoveryThreshold;
    if (isCondition) {
      // Gradually reduce delay back to base
      this.currentDelayMs = Math.max(
        this.baseDelayMs,
        this.currentDelayMs / this.backoffMultiplier
      );
      this.successCount = 0;
    }
  }

  /**
   * Record a rate limit error
   * Increases delay exponentially
   */
  onRateLimit(): void {
    this.errorCount++;
    this.successCount = 0;

    // Exponential backoff
    this.currentDelayMs = Math.min(
      this.currentDelayMs * this.backoffMultiplier,
      this.maxDelayMs
    );
  }

  /**
   * Get current statistics
   */
  getStats(): {
    currentDelayMs: number;
    errorCount: number;
    successCount: number;
    isThrottled: boolean;
  } {
    return {
      currentDelayMs: this.currentDelayMs,
      errorCount: this.errorCount,
      successCount: this.successCount,
      isThrottled: this.currentDelayMs > this.baseDelayMs * 2,
    };
  }

  /**
   * Reset to base delay
   */
  reset(): void {
    this.currentDelayMs = this.baseDelayMs;
    this.errorCount = 0;
    this.successCount = 0;
  }
}
