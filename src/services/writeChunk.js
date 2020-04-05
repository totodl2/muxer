const fs = require('fs');
const { flockSync } = require('fs-ext');

module.exports = (filepath, position, chunk) => {
  let fd = null;
  if (!fs.existsSync(filepath)) {
    fd = fs.openSync(filepath, 'w');
  } else {
    fd = fs.openSync(filepath, 'r+');
  }

  flockSync(fd, 'ex');
  fs.writeSync(fd, chunk, 0, chunk.byteLength, position);
  flockSync(fd, 'un');
  fs.closeSync(fd);
};
