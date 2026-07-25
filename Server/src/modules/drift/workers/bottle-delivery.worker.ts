import { Worker, Job } from "bullmq";
import { QueueName, JobType, JobData, JobResult } from "../drift.types";
import { DriftService } from "../services/drift.service";
import { Logger } from "winston";
import { Redis } from "ioredis";

export class BottleDeliveryWorker {
  private worker: Worker;

  constructor(
    private driftService: DriftService,
    private config: {
      connection: Redis;
      logger: Logger;
      concurrency: number;
    }
  ) {
    this.worker = new Worker(QueueName.BOTTLE_DELIVERY, this.processJob.bind(this), {
      connection: config.connection,
      concurrency: config.concurrency,
      limiter: {
        max: 10,
        duration: 1000,
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.worker.on("completed", (job: Job) => {
      this.config.logger.info(
        `Job ${job.id} completed with result: ${JSON.stringify(job.returnvalue)}`
      );
    });

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      if (!job) {
        this.config.logger.error(`Job failed with unknown job: ${error.message}`);
        return;
      }

      this.config.logger.error(
        `Job ${job.id} failed with error: ${error.message}`
      );
    });

    this.worker.on("error", (error: Error) => {
      this.config.logger.error(`Worker error: ${error.message}`);
    });
  }

  private async processJob(job: Job<JobData>): Promise<JobResult> {
    this.config.logger.info(`Processing job ${job.id} of type ${job.name}`);

    try {
      const result = await this.handleJob(job);
      this.config.logger.info(
        `Job ${job.id} processed successfully: ${JSON.stringify(result)}`
      );
      return result;
    } catch (error) {
      this.config.logger.error(
        `Error processing job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw error;
    }
  }

  private async handleJob(job: Job<JobData>): Promise<JobResult> {
    const { type, bottleId, userId } = job.data;
    
    switch (type) {
      case JobType.DELIVER:
        return this.driftService.processDelivery(job.data);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    this.config.logger.info("BottleDeliveryWorker closed");
  }
}

// Factory function for dependency injection
export function createBottleDeliveryWorker(
  driftService: DriftService,
  config: {
    connection: Redis;
    logger: Logger;
    concurrency: number;
  }
): BottleDeliveryWorker {
  return new BottleDeliveryWorker(driftService, config);
}