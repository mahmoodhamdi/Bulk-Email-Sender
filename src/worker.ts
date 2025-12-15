/**
 * Email Queue Worker Entry Point
 *
 * This file can be run as a standalone Node.js process to handle email sending.
 * Run with: npx tsx src/worker.ts
 *
 * Or in production: node --loader tsx src/worker.ts
 */

import { startEmailWorker, stopEmailWorker, closeQueue, closeRedisConnections } from './lib/queue';

// Configuration from environment
const config = {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  rateLimitMax: parseInt(process.env.WORKER_RATE_LIMIT_MAX || '10', 10),
  rateLimitDuration: parseInt(process.env.WORKER_RATE_LIMIT_DURATION || '1000', 10),
};

console.log('==========================================');
console.log('       Email Queue Worker Starting        ');
console.log('==========================================');
console.log(`Concurrency: ${config.concurrency}`);
console.log(`Rate Limit: ${config.rateLimitMax} jobs per ${config.rateLimitDuration}ms`);
console.log('==========================================');

// Start the worker
const worker = startEmailWorker(config);

// Graceful shutdown handling
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.log('[Worker] Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`[Worker] Received ${signal}, shutting down gracefully...`);

  try {
    // Stop accepting new jobs
    await stopEmailWorker();

    // Close queue connections
    await closeQueue();

    // Close Redis connections
    await closeRedisConnections();

    console.log('[Worker] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('[Worker] Email worker is now running. Press Ctrl+C to stop.');
