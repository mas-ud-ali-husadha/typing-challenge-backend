class PubSubService {
  constructor(redisPubSubClient, io, socketService) {
    this.redisPubSub = redisPubSubClient;
    this.io = io;
    this.socketService = socketService;
  }

  setup() {
    // Subscribe to typing updates
    this.redisPubSub.subscribe('typing:updates', (err, count) => {
      if (err) {
        console.error('Redis subscription error:', err);
      } else {
        console.log(`📡 Subscribed to ${count} Redis channels`);
      }
    });

    this.redisPubSub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'test_completed':
            this.io.emit('test_completion', {
              username: data.username,
              result: data.result,
            });
            this.socketService.broadcastLeaderboard();
            break;

          case 'user_online':
          case 'user_offline':
            this.io.emit('online_users_update', {
              count: data.onlineCount,
            });
            break;

          case 'typing_start':
            this.io.emit('user_typing_start', {
              username: data.username,
              textId: data.textId,
            });
            break;

          case 'typing_progress':
            this.io.emit('user_typing_progress', {
              username: data.username,
              progress: data.progress,
              currentWpm: data.currentWpm,
              errors: data.errors,
            });
            break;
        }
      } catch (error) {
        console.error('Error processing Redis message:', error);
      }
    });
  }
}

module.exports = PubSubService;
