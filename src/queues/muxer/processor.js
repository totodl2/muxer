const path = require('path');
const axios = require('axios');
const { sync: mkdir } = require('mkdirp');

const debug = require('../../debug')('muxer');
const getMuxers = require('../../services/getMuxers');
const status = require('../../services/workerStatus');
const cleaner = require('../../services/cleaner');

const { TRANSCODED_DIR } = process.env;

async function clean(id) {
  debug('Job cancelled for %s', id);
  await cleaner.all(id);
  return 'Cleaned';
}

function run(ffo) {
  return new Promise((resolve, reject) => {
    let cmd = '';
    ffo
      .on('error', (err, stdout, stderr) => {
        debug('Error received %o %o %o', err, stdout, stderr);
        reject(new Error(`${cmd}\n${stderr || err || stdout}`));
      })
      .on('end', () => {
        resolve(cmd);
      })
      .on('start', commandLine => {
        cmd = commandLine;
        debug(`Spawned Ffmpeg with command: %o`, commandLine);
      })
      .run();
  });
}

module.exports = async job => {
  const {
    data: { id, transco, notify, subtitle },
  } = job;

  debug('Muxing job for %s', id);
  if (await status.isCancelled(id)) {
    return clean(id);
  }

  await status.setActive(id);

  const directory = path.join(TRANSCODED_DIR, id);
  const muxers = await getMuxers(id, transco, subtitle);

  mkdir(directory);

  let results = null;
  try {
    results = await muxers.reduce(
      async (prev, { type, title, outfile, ffo }, i) => {
        const previous = await prev;
        debug('Running ffmpeg for %s, id %s', outfile, id);
        if (await status.isCancelled(id)) {
          throw new Error('Cancelled');
        }

        const relativeFilePath = path.join(id, outfile);
        const absoluteFilePath = path.join(TRANSCODED_DIR, relativeFilePath);

        ffo.output(absoluteFilePath);

        const cmd = await run(ffo);
        debug('Ffmpeg finished for %s, id %s', outfile, id);
        job.progress((i / muxers.length) * 100);
        previous.push({
          type,
          title,
          filepath: relativeFilePath,
          filename: outfile,
          cmd,
        });
        return previous;
      },
      Promise.resolve([]),
    );
  } catch (e) {
    if (await status.isCancelled(id)) {
      return clean(id);
    }
    throw e;
  }

  await status.remove(id);
  await cleaner.transit(id);

  if (notify) {
    await axios({
      method: 'POST',
      timeout: 5000,
      url: notify,
      data: results.map(({ cmd, ...el }) => el),
    });
  }

  return results;
};
