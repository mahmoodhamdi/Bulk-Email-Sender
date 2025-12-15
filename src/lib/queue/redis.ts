import Redis from 'ioredis';

/**
 * Redis connection configuration
 */
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: null;
}

/**
 * Parse Redis URL into configuration object
 */
function parseRedisUrl(url: string): RedisConfig {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1) || '0', 10) : 0,
    maxRetriesPerRequest: null, // Required for BullMQ
  };
}

/**
 * Get Redis configuration from environment
 */
function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    return parseRedisUrl(redisUrl);
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
  };
}

// Global Redis connection for queue operations (reused across workers)
let queueConnection: Redis | null = null;

/**
 * Get or create Redis connection for queue operations
 */
export function getQueueConnection(): Redis {
  if (!queueConnection) {
    const config = getRedisConfig();
    queueConnection = new Redis(config);

    queueConnection.on('error', (error) => {
      console.error('[Redis] Connection error:', error.message);
    });

    queueConnection.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    queueConnection.on('ready', () => {
      console.log('[Redis] Ready for commands');
    });

    queueConnection.on('close', () => {
      console.log('[Redis] Connection closed');
    });
  }

  return queueConnection;
}

/**
 * Create a new Redis connection (for workers that need dedicated connections)
 */
export function createRedisConnection(): Redis {
  const config = getRedisConfig();
  const connection = new Redis(config);

  connection.on('error', (error) => {
    console.error('[Redis Worker] Connection error:', error.message);
  });

  return connection;
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const connection = getQueueConnection();
  const startTime = Date.now();

  try {
    await connection.ping();
    return {
      connected: true,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Close all Redis connections gracefully
 */
export async function closeRedisConnections(): Promise<void> {
  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = null;
    console.log('[Redis] Connections closed');
  }
}

/**
 * Get Redis connection status
 */
export function getRedisStatus(): 'connected' | 'connecting' | 'disconnected' {
  if (!queueConnection) {
    return 'disconnected';
  }

  switch (queueConnection.status) {
    case 'ready':
      return 'connected';
    case 'connecting':
    case 'reconnecting':
      return 'connecting';
    default:
      return 'disconnected';
  }
}
