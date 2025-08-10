class StatsService {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async updateGlobalStats(testResult, username) {
    // First, attempt to add the user to the set of unique users.
    await this.redis.sadd('users:all', username);

    // Now, get the definitive total user count *after* the add operation.
    const totalUsers = await this.redis.scard('users:all');

    // Get other current global stats
    const globalStats = await this.redis.hmget(
      'global:stats',
      'total_tests',
      'total_wpm',
      'total_accuracy'
    );

    const totalGlobalTests = parseInt(globalStats[0]) || 0;
    const totalGlobalWpm = parseFloat(globalStats[1]) || 0;
    const totalGlobalAccuracy = parseFloat(globalStats[2]) || 0;
    const newTotalTests = totalGlobalTests + 1;

    // Use a pipeline for the remaining atomic updates for efficiency
    const pipeline = this.redis.pipeline();

    // Update the main stats hash
    pipeline.hset('global:stats', {
      total_tests: newTotalTests,
      total_wpm: totalGlobalWpm + testResult.wpm,
      total_accuracy: totalGlobalAccuracy + testResult.accuracy,
    });

    pipeline.set('stats:total_tests', newTotalTests);
    pipeline.set('stats:total_users', totalUsers);
    pipeline.set(
      'stats:avg_wpm',
      (totalGlobalWpm + testResult.wpm) / newTotalTests
    );
    pipeline.set(
      'stats:avg_accuracy',
      (totalGlobalAccuracy + testResult.accuracy) / newTotalTests
    );

    // Execute all commands in the pipeline
    await pipeline.exec();

    // After updating, get the latest stats to broadcast
    const updatedStats = await this.getGlobalStats();

    // Publish the stats update to the Redis channel for all clients
    await this.redis.publish(
      'typing:updates',
      JSON.stringify({
        type: 'stats_update',
        payload: updatedStats,
      })
    );
  }

  //  Retrieves the global statistics from Redis.
  async getGlobalStats() {
    // Use MGET for an efficient multi-key fetch
    const results = await this.redis.mget(
      'stats:total_tests',
      'stats:total_users',
      'stats:avg_wpm',
      'stats:avg_accuracy'
    );

    return {
      totalTests: parseInt(results[0]) || 0,
      totalUsers: parseInt(results[1]) || 0,
      averageWPM: parseFloat(results[2] || 0).toFixed(2),
      averageAccuracy: parseFloat(results[3] || 0).toFixed(2),
    };
  }
}

module.exports = StatsService;
