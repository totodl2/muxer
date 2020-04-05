const util = require('util');
const fs = require('fs');
const path = require('path');

const exists = util.promisify(fs.exists);

const { TRANSIT_DIR } = process.env;

/**
 * @param id
 * @param {String[]} transco
 * @return {boolean}
 */
module.exports = (id, transco) => {
  const directory = path.join(TRANSIT_DIR, id);
  return transco.reduce(
    async (prev, current) =>
      (await prev) && exists(path.join(directory, `${current}.json`)),
    Promise.resolve(true),
  );
};
