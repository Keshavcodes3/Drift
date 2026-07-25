import { Worker, Job } from "bullmq";
import { QueueName, JobType, RetryJobData, JobResult } from "../drift.types";
import { DriftService } from "../services/drift.service";
import { Logger } from "winston";
import { Redis } from "ioredis";

export class RetryWorker {
  private worker: Worker;

  constructor(
    private driftService: DriftService,
    private config: {
      connection: Redis;
      logger: Logger;
      concurrency: number;
    }
  ) {
    this.worker = new Worker(QueueName.RETRY, this.processJob.bind(this), {
      connection: config.connection,
      concurrency: config.concurrency,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.worker.on("completed", (job: Job) => {
      this.config.logger.info(
        `Retry job ${job.id} completed with result: ${JSON.stringify(job.returnvalue)}`
      );
    });

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      if (!job) {
        this.config.logger.error(`Retry job failed with unknown job: ${error.message}`);
        return;
      }

      this.config.logger.error(
        `Retry job ${job.id} failed with error: ${error.message}`
      );
    });

    this.worker.on("error", (error: Error) => {
      this.config.logger.error(`RetryWorker error: ${error.message}`);
    });
  }

  private async processJob(job: Job<RetryJobData>): Promise<JobResult> {
    this.config.logger.info(`Processing retry job ${job.id}`);

    try {
      const result = await this.driftService.retryDelivery(job.data);
      this.config.logger.info(
        `Retry job ${job.id} processed successfully: ${JSON.stringify(result)}`
      );
      return result;
    } catch (error) {
      this.config.logger.error(
        `Error processing retry job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    this.config.logger.info("RetryWorker closed");
  }
}

// Factory function for dependency injection
export function createRetryWorker(
  driftService: DriftService,
  config: {
    connection: Redis;
    logger: Logger;
    concurrency: number;
  }
): RetryWorker {
  return new RetryWorker(driftService, config);
}