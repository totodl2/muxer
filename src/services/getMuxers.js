/* eslint-disable no-param-reassign */
const FFMpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);

const { TRANSIT_DIR } = process.env;

function getMuxer(instances, preset) {
  if (!instances[preset]) {
    instances[preset] = {
      ffo: new FFMpeg(),
      nextStream: 0,
      nextFile: 0,
    };
  }
  return instances[preset];
}

function getStreamTitle(stream) {
  const { tags: { title } = {}, language } = stream;
  const titles = (title || language || '').split(',');

  if (titles.length <= 0) {
    return null;
  }

  return titles[titles.length - 1];
}

function addMetadata(muxer, stream) {
  const title = getStreamTitle(stream);
  const streamPosition = muxer.nextStream;

  if (title.length <= 0) {
    return;
  }

  muxer.ffo.withOutputOption(
    `-metadata:s:${streamPosition} title="${title.replace('"', '_')}"`,
  );
}

module.exports = async (id, transco) => {
  const transitDirectory = path.join(TRANSIT_DIR, id);
  const informations = await transco.reduce(
    async (prev, current) => [
      ...(await prev),
      JSON.parse(
        await readFile(path.join(transitDirectory, `${current}.json`)),
      ),
    ],
    Promise.resolve([]),
  );

  const muxers = {};
  let subtitles = [];

  // create output muxers & add audio & video streams
  informations.forEach(({ subtitles: subtitlesFiles, ...presets }, i) => {
    if (subtitlesFiles) {
      subtitles = [...subtitles, ...subtitlesFiles];
    }

    Object.values(presets).forEach(
      ({ preset: presetName, name: filename, streams }) => {
        const muxer = getMuxer(muxers, presetName);
        const filepath = path.join(transitDirectory, presetName, filename);
        muxer.ffo.input(filepath).withOutputOption(`-map ${i}`);
        muxer.nextFile = i + 1;

        streams.forEach(stream => {
          addMetadata(muxer, stream);
          muxer.nextStream += 1;
        });
      },
    );
  });

  const results = [];
  subtitles = subtitles.filter(
    ({ name: filename }) =>
      !!fs.existsSync(path.join(transitDirectory, 'subtitles', filename)),
  );
  // add subtitles to presets & prepare sub transcoding to webvtt
  subtitles.forEach(({ name: filename, stream }, i) => {
    const filepath = path.join(transitDirectory, 'subtitles', filename);

    Object.entries(muxers).forEach(([name, muxer]) => {
      muxer.ffo.input(filepath).withOutputOption(`-map ${muxer.nextFile}`);
      muxer.nextFile += 1;

      addMetadata(muxer, stream);
      muxer.nextStream += 1;
    });

    results.push({
      type: 'sub',
      title: getStreamTitle(stream),
      outfile: `${i}.vtt`,
      ffo: new FFMpeg(filepath),
    });
  });

  Object.entries(muxers).forEach(([name, muxer]) => {
    // set sub codec
    if (subtitles.length > 0) {
      muxer.ffo.withOutputOption('-c:s mov_text');
    }

    muxer.ffo
      .withOutputOption('-c:a copy')
      .withOutputOption('-c:v copy')
      .format('mp4');

    results.push({
      type: 'media',
      title: name,
      outfile: `${name}.mp4`,
      ffo: muxer.ffo,
    });
  });

  return results;
};
