class LeaderboardService {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async getLeaderboard(type = 'wpm', limit = 10) {
    let leaderboardKey;
    switch (type) {
      case 'accuracy':
        leaderboardKey = 'leaderboard:accuracy';
        break;
      case 'consistency':
        leaderboardKey = 'leaderboard:consistency';
        break;
      default:
        leaderboardKey = 'leaderboard:wpm';
    }

    const results = await this.redis.zrevrange(
      leaderboardKey,
      0,
      limit - 1,
      'WITHSCORES'
    );

    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      const username = results[i];
      const score = parseFloat(results[i + 1]);

      // Get additional user data
      const userData = await this.redis.hgetall(`user:${username}`);

      leaderboard.push({
        rank: Math.floor(i / 2) + 1,
        username,
        score: Math.round(score * 100) / 100,
        totalTests: parseInt(userData.total_tests) || 0,
        avgAccuracy: parseFloat(userData.avg_accuracy) || 0,
        lastSeen: userData.last_seen || null,
      });
    }

    return { type, leaderboard };
  }

  async getLeaderboardForBroadcast(type = 'wpm') {
    const results = await this.redis.zrevrange(
      `leaderboard:${type}`,
      0,
      9,
      'WITHSCORES'
    );
    const leaderboard = [];

    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        rank: Math.floor(i / 2) + 1,
        username: results[i],
        score: Math.round(parseFloat(results[i + 1]) * 100) / 100,
      });
    }

    return leaderboard;
  }
}

module.exports = LeaderboardService;
