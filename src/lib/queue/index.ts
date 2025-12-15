// Queue types and configuration
export * from './types';

// Redis connection management
export {
  getQueueConnection,
  createRedisConnection,
  checkRedisHealth,
  closeRedisConnections,
  getRedisStatus,
} from './redis';

// Email queue operations
export {
  getEmailQueue,
  getQueueEvents,
  addEmailJob,
  addEmailJobs,
  getQueueStats,
  getJob,
  getJobsByState,
  removeJob,
  retryJob,
  pauseQueue,
  resumeQueue,
  drainQueue,
  cleanQueue,
  getCampaignJobs,
  cancelCampaignJobs,
  closeQueue,
  configureRateLimiting,
} from './email-queue';

// Email worker
export {
  startEmailWorker,
  stopEmailWorker,
  pauseEmailWorker,
  resumeEmailWorker,
  getWorkerStatus,
  isWorkerHealthy,
} from './email-worker';

// Queue service (high-level operations)
export {
  queueCampaign,
  getCampaignQueueStatus,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getQueueHealth,
  retryFailedRecipients,
  checkAndCompleteCampaign,
} from './queue-service';
