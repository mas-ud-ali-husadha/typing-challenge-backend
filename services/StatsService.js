class StatsService {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async updateGlobalStats(testResult, username) {
    const pipeline = this.redis.pipeline();

    // Update global stats
    const globalStats = await this.redis.hmget(
      'global:stats',
      'total_tests',
      'total_wpm',
      'total_accuracy',
      'unique_users'
    );

    const totalGlobalTests = parseInt(globalStats[0]) || 0;
    const totalGlobalWpm = parseFloat(globalStats[1]) || 0;
    const totalGlobalAccuracy = parseFloat(globalStats[2]) || 0;
    const uniqueUsers = (await this.redis.scard('users:all')) || 0;

    pipeline.sadd('users:all', username);
    pipeline.hset('global:stats', {
      total_tests: totalGlobalTests + 1,
      total_wpm: totalGlobalWpm + testResult.wpm,
      total_accuracy: totalGlobalAccuracy + testResult.accuracy,
    });

    // Update simple stats for API
    pipeline.set('stats:total_tests', totalGlobalTests + 1);
    pipeline.set('stats:total_users', uniqueUsers + 1);
    pipeline.set(
      'stats:avg_wpm',
      (totalGlobalWpm + testResult.wpm) / (totalGlobalTests + 1)
    );
    pipeline.set(
      'stats:avg_accuracy',
      (totalGlobalAccuracy + testResult.accuracy) / (totalGlobalTests + 1)
    );

    await pipeline.exec();
  }

  async getGlobalStats() {
    const pipeline = this.redis.pipeline();
    pipeline.get('stats:total_tests');
    pipeline.get('stats:total_users');
    pipeline.get('stats:avg_wpm');
    pipeline.get('stats:avg_accuracy');

    const results = await pipeline.exec();

    return {
      totalTests: parseInt(results[0][1]) || 0,
      totalUsers: parseInt(results[1][1]) || 0,
      averageWPM: parseFloat(results[2][1]) || 0,
      averageAccuracy: parseFloat(results[3][1]) || 0,
    };
  }
}

module.exports = StatsService;
