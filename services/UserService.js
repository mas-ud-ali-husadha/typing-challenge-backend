class UserService {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async storeTestResult(username, testResult) {
    const pipeline = this.redis.pipeline();

    // Store individual test result
    pipeline.lpush(`user:${username}:tests`, JSON.stringify(testResult));
    pipeline.ltrim(`user:${username}:tests`, 0, 99); // Keep last 100 tests

    // Update user statistics
    const userData = await this.redis.hgetall(`user:${username}`);
    const totalTests = parseInt(userData.total_tests) || 0;
    const currentAvgWpm = parseFloat(userData.avg_wpm) || 0;
    const currentAvgAccuracy = parseFloat(userData.avg_accuracy) || 0;
    const currentAvgConsistency = parseFloat(userData.avg_consistency) || 0;
    const bestWpm = parseFloat(userData.best_wpm) || 0;

    // Calculate new averages
    const newTotalTests = totalTests + 1;
    const newAvgWpm =
      (currentAvgWpm * totalTests + testResult.wpm) / newTotalTests;
    const newAvgAccuracy =
      (currentAvgAccuracy * totalTests + testResult.accuracy) / newTotalTests;
    const newAvgConsistency =
      (currentAvgConsistency * totalTests + testResult.consistency) /
      newTotalTests;
    const newBestWpm = Math.max(bestWpm, testResult.wpm);

    // Update user data
    pipeline.hset(`user:${username}`, {
      total_tests: newTotalTests,
      avg_wpm: newAvgWpm,
      avg_accuracy: newAvgAccuracy,
      avg_consistency: newAvgConsistency,
      best_wpm: newBestWpm,
      last_seen: testResult.timestamp,
      join_date: userData.join_date || testResult.timestamp,
    });

    // Update leaderboards
    pipeline.zadd('leaderboard:wpm', newAvgWpm, username);
    pipeline.zadd('leaderboard:accuracy', newAvgAccuracy, username);
    pipeline.zadd('leaderboard:consistency', newAvgConsistency, username);

    await pipeline.exec();
  }

  async getUserProfile(username) {
    const userData = await this.redis.hgetall(`user:${username}`);

    if (Object.keys(userData).length === 0) {
      return null;
    }

    // Get recent test results
    const recentTests = await this.redis.lrange(`user:${username}:tests`, 0, 9);
    const tests = recentTests.map((test) => JSON.parse(test));

    return {
      username,
      totalTests: parseInt(userData.total_tests) || 0,
      bestWPM: parseFloat(userData.best_wpm) || 0,
      avgWPM: parseFloat(userData.avg_wpm) || 0,
      avgAccuracy: parseFloat(userData.avg_accuracy) || 0,
      avgConsistency: parseFloat(userData.avg_consistency) || 0,
      joinDate: userData.join_date,
      lastSeen: userData.last_seen,
      recentTests: tests,
    };
  }

  async updateUserLastSeen(username) {
    await this.redis.hset(
      `user:${username}`,
      'last_seen',
      new Date().toISOString()
    );
  }
}

module.exports = UserService;
