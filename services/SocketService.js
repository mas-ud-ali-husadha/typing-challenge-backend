class SocketService {
  constructor(io, redisClient, leaderboardService, userService) {
    this.io = io;
    this.redis = redisClient;
    this.leaderboardService = leaderboardService;
    this.userService = userService;
    this.activeUsers = new Set();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('user_online', async (username) => {
        if (username) {
          socket.username = username;
          this.activeUsers.add(username);
          await this.userService.updateUserLastSeen(username);

          // Broadcast online user count
          this.io.emit('online_users_update', {
            count: this.activeUsers.size,
            users: Array.from(this.activeUsers),
          });

          // Publish to Redis pub/sub
          await this.redis.publish(
            'typing:updates',
            JSON.stringify({
              type: 'user_online',
              username,
              onlineCount: this.activeUsers.size,
            })
          );
        }
      });

      socket.on('typing_start', async (data) => {
        const { username, textId } = data;

        // Track typing session start
        await this.redis.hset(`session:${socket.id}`, {
          username,
          textId,
          startTime: Date.now(),
          status: 'typing',
        });

        // Publish typing start event
        await this.redis.publish(
          'typing:updates',
          JSON.stringify({
            type: 'typing_start',
            username,
            textId,
            timestamp: new Date().toISOString(),
          })
        );
      });

      socket.on('typing_progress', async (data) => {
        const { username, progress, currentWpm, errors } = data;

        // Publish real-time progress
        await this.redis.publish(
          'typing:updates',
          JSON.stringify({
            type: 'typing_progress',
            username,
            progress,
            currentWpm,
            errors,
            timestamp: new Date().toISOString(),
          })
        );
      });

      socket.on('request_leaderboard', async (type = 'wpm') => {
        try {
          const leaderboard =
            await this.leaderboardService.getLeaderboardForBroadcast(type);
          socket.emit('leaderboard_update', { type, leaderboard });
        } catch (error) {
          console.error('Error fetching leaderboard:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        if (socket.username) {
          this.activeUsers.delete(socket.username);

          // Broadcast updated online user count
          this.io.emit('online_users_update', {
            count: this.activeUsers.size,
            users: Array.from(this.activeUsers),
          });

          // Publish to Redis pub/sub
          this.redis.publish(
            'typing:updates',
            JSON.stringify({
              type: 'user_offline',
              username: socket.username,
              onlineCount: this.activeUsers.size,
            })
          );
        }

        // Clean up session data
        this.redis.del(`session:${socket.id}`);
      });
    });
  }

  async broadcastLeaderboard() {
    try {
      const types = ['wpm', 'accuracy', 'consistency'];

      for (const type of types) {
        const leaderboard =
          await this.leaderboardService.getLeaderboardForBroadcast(type);
        this.io.emit('leaderboard_update', { type, leaderboard });
      }
    } catch (error) {
      console.error('Error broadcasting leaderboard:', error);
    }
  }

  getActiveUsersCount() {
    return this.activeUsers.size;
  }
}

module.exports = SocketService;
