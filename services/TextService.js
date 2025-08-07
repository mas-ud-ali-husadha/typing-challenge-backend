class TextService {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async initializeTexts() {
    const textsExist = await this.redis.exists('typing:texts');
    if (!textsExist) {
      const typingTexts = [
        'The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is commonly used for typing practice.',
        "In the midst of winter, I found there was, within me, an invincible summer. And that makes me happy. For it says that no matter how hard the world pushes against me, within me, there's something stronger.",
        'Technology is best when it brings people together. The internet was designed to be decentralized so that everybody could participate.',
        "Programming is not about typing, it's about thinking. The most important skill for a programmer is problem solving, not syntax memorization.",
        'The journey of a thousand miles begins with one step. Every expert was once a beginner. Every pro was once an amateur.',
      ];

      for (let i = 0; i < typingTexts.length; i++) {
        await this.redis.hset('typing:texts', i, typingTexts[i]);
      }
    }
  }

  async getRandomText() {
    const texts = await this.redis.hgetall('typing:texts');
    const textKeys = Object.keys(texts);
    const randomKey = textKeys[Math.floor(Math.random() * textKeys.length)];

    return {
      id: randomKey,
      text: texts[randomKey],
      length: texts[randomKey].length,
    };
  }
}

module.exports = TextService;
