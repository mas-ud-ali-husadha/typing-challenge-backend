require('dotenv').config();

const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

const { RedisManager } = require('./config/redis');
const UserService = require('./services/UserService');
const StatsService = require('./services/StatsService');
const LeaderboardService = require('./services/LeaderboardService');
const TextService = require('./services/TextService');
const ApiController = require('./controllers/ApiController');
const SocketService = require('./services/SocketService');
const PubSubService = require('./services/PubSubService');
const createApiRoutes = require('./routes/api');

class TypingChallengeServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.WS_CORS_ORIGINS?.split(',') || '*',
        methods: process.env.WS_METHODS?.split(',') || ['GET', 'POST'],
      },
    });

    this.redisManager = new RedisManager();
    this.redis = this.redisManager.getClient();
    this.redisPubSub = this.redisManager.getPubSubClient();

    // Initialize services
    this.userService = new UserService(this.redis);
    this.statsService = new StatsService(this.redis);
    this.leaderboardService = new LeaderboardService(this.redis);
    this.textService = new TextService(this.redis);
    this.socketService = new SocketService(
      this.io,
      this.redis,
      this.leaderboardService,
      this.userService
    );
    this.pubSubService = new PubSubService(
      this.redisPubSub,
      this.io,
      this.socketService
    );

    // Initialize controller
    this.apiController = new ApiController(
      this.textService,
      this.statsService,
      this.leaderboardService,
      this.userService
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupPubSub();
    this.initializeData();
  }

  setupMiddleware() {
    // CORS configuration from environment
    const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000'];

    this.app.use(
      cors({
        origin: corsOrigins,
        credentials: true,
      })
    );

    this.app.use(express.json());

    // Enhanced logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    const apiRoutes = createApiRoutes(this.apiController, this.redis);
    this.app.use('/', apiRoutes);
  }

  setupSocketIO() {
    this.socketService.setupSocketHandlers();
  }

  setupPubSub() {
    this.pubSubService.setup();
  }

  async initializeData() {
    try {
      await this.textService.initializeTexts();
      console.log('✅ Redis typing challenge backend initialized');
    } catch (error) {
      console.error('❌ Initialization error:', error);
    }
  }

  async start(port = process.env.PORT || 3000) {
    try {
      // Test Redis connection
      const connected = await this.redisManager.testConnection();
      if (!connected) {
        throw new Error('Redis connection failed');
      }

      this.server.listen(port, () => {
        console.log(`🚀 Typing Challenge Server running on port ${port}`);
        console.log(`📊 Health: http://localhost:${port}/health`);
        console.log(`🔌 WebSocket: ws://localhost:${port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(
          `🔗 CORS Origins: ${process.env.CORS_ORIGINS || 'localhost:3000'}`
        );
      });

      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('\n🔄 Shutting down server...');

    try {
      this.io.close();
      await this.redisManager.disconnect();
      this.server.close();
      console.log('✅ Server shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

const typingServer = new TypingChallengeServer();
typingServer.start();

module.exports = TypingChallengeServer;
