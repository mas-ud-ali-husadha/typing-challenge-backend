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
        await this.redis.hset('typing:texts', i.toString(), typingTexts[i]);
      }

      console.log('[TextService] Initialized default typing texts.');
    }
  }

  async getRandomText() {
    // 1. Get all texts
    let texts = await this.redis.hgetall('typing:texts');

    // 2. If empty, auto-initialize and fetch again
    if (Object.keys(texts).length === 0) {
      console.warn('[TextService] No texts found in Redis. Initializing...');
      await this.initializeTexts();
      texts = await this.redis.hgetall('typing:texts');
    }

    // 3. Still empty? Throw clear error
    const textKeys = Object.keys(texts);
    if (textKeys.length === 0) {
      throw new Error(
        'No typing texts available in Redis after initialization.'
      );
    }

    // 4. Pick random key safely
    const randomKey = textKeys[Math.floor(Math.random() * textKeys.length)];
    const chosenText = texts[randomKey];

    // 5. Safety check in case value is missing
    if (!chosenText) {
      throw new Error(`No value found for key ${randomKey} in Redis hash.`);
    }

    // 6. Return the result
    return {
      id: randomKey,
      text: chosenText,
      length: chosenText.length,
    };
  }
}

module.exports = TextService;
