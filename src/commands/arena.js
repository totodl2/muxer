const arena = require('bull-arena');
const { config: muxerConfig } = require('../queues/muxer');

module.exports = async () => {
  const port = process.env.ARENA_PORT || 3000;
  const host = process.env.ARENA_HOST || '0.0.0.0';
  arena({ queues: [muxerConfig] }, { port, host });
};
