class ApiController {
  constructor(textService, statsService, leaderboardService, userService) {
    this.textService = textService;
    this.statsService = statsService;
    this.leaderboardService = leaderboardService;
    this.userService = userService;
  }

  async getHealth(req, res) {
    try {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ status: 'unhealthy', error: error.message });
    }
  }

  async getText(req, res) {
    try {
      const textData = await this.textService.getRandomText();
      res.json(textData);
    } catch (error) {
      console.error('Error fetching text:', error);
      res.status(500).json({ error: 'Failed to fetch typing text' });
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.statsService.getGlobalStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  async getLeaderboard(req, res) {
    try {
      const type = req.query.type || 'wpm';
      const limit = parseInt(req.query.limit) || 10;
      const leaderboard = await this.leaderboardService.getLeaderboard(
        type,
        limit
      );
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  }

  async getUserProfile(req, res) {
    try {
      const { username } = req.params;
      const profile = await this.userService.getUserProfile(username);

      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  async submitTest(req, res) {
    try {
      const {
        username,
        wpm,
        rawWpm,
        accuracy,
        consistency,
        timeSpent,
        textId,
        keystrokeData,
        errorCount,
      } = req.body;

      if (!username || !wpm || !accuracy) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const timestamp = new Date().toISOString();
      const testResult = {
        wpm: parseFloat(wpm),
        rawWpm: parseFloat(rawWpm),
        accuracy: parseFloat(accuracy),
        consistency: parseFloat(consistency),
        timeSpent: parseFloat(timeSpent),
        textId,
        errorCount: parseInt(errorCount),
        timestamp,
        keystrokeData: keystrokeData || [],
      };

      // Store the test result and update stats
      await this.userService.storeTestResult(username, testResult);
      await this.statsService.updateGlobalStats(testResult, username);

      res.json({
        success: true,
        message: 'Test result submitted successfully',
        result: testResult,
      });
    } catch (error) {
      console.error('Error submitting test result:', error);
      res.status(500).json({ error: 'Failed to submit test result' });
    }
  }
}

module.exports = ApiController;
