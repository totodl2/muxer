const rimraf = require('rimraf');
const util = require('util');
const fs = require('fs');
const path = require('path');

const exists = util.promisify(fs.exists);
const rmrf = util.promisify(rimraf);

const { TRANSIT_DIR, TRANSCODED_DIR } = process.env;

module.exports = {
  async transit(id) {
    const transitPath = path.join(TRANSIT_DIR, id);
    if (await exists(transitPath)) {
      await rmrf(transitPath);
      return true;
    }
    return false;
  },

  async transcoded(id) {
    const transcodedPath = path.join(TRANSCODED_DIR, id);
    if (await exists(transcodedPath)) {
      await rmrf(transcodedPath);
      return true;
    }
    return false;
  },

  async all(id) {
    const transit = await this.transit(id);
    const transcoded = await this.transcoded(id);
    return transit || transcoded;
  },
};
