// config/redis.js
require('dotenv').config();
const Redis = require('ioredis');

const redisConfig = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD || '',
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
      connectTimeout: 10000,
      lazyConnect: true,
    };

class RedisManager {
  constructor() {
    this.redis = new Redis(redisConfig);
    this.redisPubSub = new Redis(redisConfig);

    // Connection event handlers
    this.redis.on('connect', () => {
      console.log('✅ Redis connection established');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    this.redisPubSub.on('connect', () => {
      console.log('✅ Redis PubSub connection established');
    });

    this.redisPubSub.on('error', (err) => {
      console.error('❌ Redis PubSub connection error:', err.message);
    });
  }

  getClient() {
    return this.redis;
  }

  getPubSubClient() {
    return this.redisPubSub;
  }

  async disconnect() {
    await this.redis.quit();
    await this.redisPubSub.quit();
  }

  async testConnection() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = { RedisManager, redisConfig };
