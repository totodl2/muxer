const Queue = require('bull');
const config = require('./config');

module.exports = new Queue(config.name, {
  redis: config.redis,
  defaultJobOptions: {
    attempts: 1,
  },
});
