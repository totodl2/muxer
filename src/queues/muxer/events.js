const status = require('../../services/workerStatus');

module.exports = {
  removed: async job => {
    const {
      data: { id },
    } = job;

    await status.remove(id);
  },
};
