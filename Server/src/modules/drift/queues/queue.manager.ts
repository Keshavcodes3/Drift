import { Queue, QueueEvents, Job, JobsOptions } from "bullmq";
import { QueueName, JobData } from "../drift.types";
import { Redis } from "ioredis";
import { Logger } from "winston";

interface QueueConfig {
  name: QueueName;
  concurrency: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

export class QueueManager {
  private queues: Map<QueueName, Queue>;
  private queueEvents: Map<QueueName, QueueEvents>;
  private connection: Redis;

  constructor(
    private config: {
      connection: Redis;
      queues: QueueConfig[];
      logger: Logger;
    }
  ) {
    this.connection = config.connection;
    this.queues = new Map();
    this.queueEvents = new Map();
  }

  async initialize(): Promise<void> {
    for (const queueConfig of this.config.queues) {
      const queue = new Queue(queueConfig.name, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      });

      const queueEvents = new QueueEvents(queueConfig.name, {
        connection: this.connection,
      });

      this.queues.set(queueConfig.name, queue);
      this.queueEvents.set(queueConfig.name, queueEvents);

      // Set up event listeners
      queueEvents.on("waiting", (jobId) => {
        this.config.logger.info(`Job ${jobId} waiting in queue ${queueConfig.name}`);
      });

      queueEvents.on("active", (job) => {
        this.config.logger.info(
          `Job ${job.jobId} started in queue ${queueConfig.name}`
        );
      });

      queueEvents.on("completed", (jobId, result) => {
        this.config.logger.info(
          `Job ${jobId} completed in queue ${queueConfig.name} with result: ${JSON.stringify(result)}`
        );
      });

      queueEvents.on("failed", (jobId, failedReason) => {
        this.config.logger.error(
          `Job ${jobId} failed in queue ${queueConfig.name}: ${failedReason}`
        );
      });
    }

    this.config.logger.info("QueueManager initialized");
  }

  async add(
    queueName: QueueName,
    data: JobData,
    opts?: JobsOptions
  ): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(data.type, data, opts);
    this.config.logger.info(
      `Job ${job.id} added to queue ${queueName} with data: ${JSON.stringify(data)}`
    );
    return job.id;
  }

  async remove(queueName: QueueName, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.config.logger.info(`Job ${jobId} removed from queue ${queueName}`);
    }
  }

  async getJob(queueName: QueueName, jobId: string): Promise<Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJob(jobId);
  }

  async getQueue(queueName: QueueName): Promise<Queue> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue;
  }

  async close(): Promise<void> {
    for (const [queueName, queue] of this.queues) {
      await queue.close();
      const queueEvents = this.queueEvents.get(queueName);
      if (queueEvents) {
        await queueEvents.close();
      }
      this.config.logger.info(`Queue ${queueName} closed`);
    }
  }
}

// Singleton instance for dependency injection
let queueManagerInstance: QueueManager | null = null;

export function getQueueManager(
  config: {
    connection: Redis;
    queues: QueueConfig[];
    logger: Logger;
  }
): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager(config);
  }
  return queueManagerInstance;
}