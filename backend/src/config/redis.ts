import { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse redis URL into BullMQ connection options
const url = new URL(redisUrl);

export const redisConnection: ConnectionOptions = {
  host: url.hostname || 'localhost',
  port: parseInt(url.port || '6379'),
  username: url.username || undefined,
  password: url.password || undefined,
  tls: url.protocol === 'rediss:' ? {} : undefined,
};
