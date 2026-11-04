import { TelemetryReading } from '@kiot/shared-types';
import { bulkInsertTelemetry } from './db.js';
import { config } from './config.js';

export class TelemetryBatchBuffer {
  private queue: TelemetryReading[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(
    private readonly maxSize: number = config.BATCH_MAX_SIZE,
    private readonly flushIntervalMs: number = config.BATCH_FLUSH_INTERVAL_MS
  ) {
    this.scheduleFlush();
  }

  public enqueue(reading: TelemetryReading): void {
    this.queue.push(reading);

    if (this.queue.length >= this.maxSize) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;
    const batch = this.queue.splice(0, this.maxSize);

    try {
      const inserted = await bulkInsertTelemetry(batch);
      if (inserted > 0) {
        console.log(`[Batch Buffer] Flushed and persisted ${inserted} readings to TimescaleDB.`);
      }
    } catch (err) {
      console.error('[Batch Buffer Error] Failed to persist batch to TimescaleDB:', err);
      // Re-queue failed items at the beginning to avoid data loss
      this.queue.unshift(...batch);
    } finally {
      this.isFlushing = false;
    }
  }

  private scheduleFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        void this.flush();
      }
    }, this.flushIntervalMs);
  }

  public async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Flush any remaining items before shutting down
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}

export const telemetryBuffer = new TelemetryBatchBuffer();

