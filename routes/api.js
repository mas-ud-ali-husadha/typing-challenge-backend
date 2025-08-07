const express = require('express');

function createApiRoutes(apiController, redisClient) {
  const router = express.Router();

  // Health check
  router.get('/health', async (req, res) => {
    try {
      await redisClient.ping();
      await apiController.getHealth(req, res);
    } catch (error) {
      res.status(500).json({ status: 'unhealthy', error: error.message });
    }
  });

  // API routes
  router.get('/api/text', (req, res) => apiController.getText(req, res));
  router.get('/api/stats', (req, res) => apiController.getStats(req, res));
  router.get('/api/leaderboard', (req, res) =>
    apiController.getLeaderboard(req, res)
  );
  router.get('/api/user/:username', (req, res) =>
    apiController.getUserProfile(req, res)
  );
  router.post('/api/submit', async (req, res) => {
    await apiController.submitTest(req, res);

    // Publish test completion event
    const { username } = req.body;
    await redisClient.publish(
      'typing:updates',
      JSON.stringify({
        type: 'test_completed',
        username,
        result: req.body,
      })
    );
  });

  return router;
}

module.exports = createApiRoutes;
