const Router = require('koa-router');
const Joi = require('@hapi/joi');
const path = require('path');
const fs = require('fs');
const { sync: mkdir } = require('mkdirp');

const queue = require('../queues/muxer/queue');
const writeChunk = require('../services/writeChunk');
const debug = require('../debug')('routes');
const joi = require('../middlewares/joi');
const cleaner = require('../services/cleaner');
const allTranscoFinished = require('../services/allTranscoFinished');
const status = require('../services/workerStatus');

const router = new Router();

router.post(
  '/upload',
  joi(
    Joi.object({
      id: Joi.alternatives()
        .try(Joi.number(), Joi.string())
        .required(),
      name: Joi.string().required(),
      preset: Joi.string().required(),
    }).options({ allowUnknown: true }),
    'query',
  ),
  async ctx => {
    const { id, name, preset } = ctx.query;
    const directory = path.join(process.env.TRANSIT_DIR, id, preset);
    const fileoutput = path.join(directory, name);
    mkdir(directory);
    debug(
      'Receiving file %s for preset %s with id %s, headers %o',
      name,
      preset,
      id,
      ctx.req.headers,
    );

    await new Promise((resolve, reject) => {
      let start = 0;
      if (ctx.req.headers['content-range']) {
        const [, range] = ctx.req.headers['content-range'].split(' ');
        start = parseInt(range.split('-')[0], 10) || 0;
      }

      const onData = data => {
        try {
          const len = data.byteLength;
          writeChunk(fileoutput, start, data);
          start += len;
        } catch (e) {
          debug(
            'File %s for preset %s with id %s failed %o',
            name,
            preset,
            id,
            e,
          );
          ctx.req.off('data', onData);
          reject(e);
        }
      };

      ctx.req.on('data', onData);
      ctx.req.on('end', () => {
        ctx.body = true;
        resolve();
      });
    });

    debug('File %s for preset %s with id %s received', name, preset, id);
  },
);

router.post(
  '/end',
  joi(
    Joi.object({
      id: Joi.alternatives()
        .try(Joi.number(), Joi.string())
        .required(),
      name: Joi.string().required(),
      waiting: Joi.string().required(),
      cancelled: Joi.number().required(),
      notify: Joi.string().uri({ scheme: ['http', 'https'] }),
      subtitle: Joi.string().uri({ scheme: ['http', 'https'] }),
    }).options({ allowUnknown: true }),
    'query',
  ),
  async ctx => {
    const { id, name, notify, subtitle } = ctx.query;
    const cancelled = !!parseInt(ctx.query.cancelled || 0, 10);
    const waiting = (ctx.query.waiting || '').split(',');

    debug(
      'End notification received for transcoding %s with id %s and cancellation status %o',
      name,
      id,
      cancelled,
    );

    if (cancelled) {
      await cleaner.all(id);
      ctx.body = true;
      return;
    }

    const resultPath = path.join(process.env.TRANSIT_DIR, id, `${name}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(ctx.request.body), {
      encoding: 'UTF-8',
    });

    const allFinished = await allTranscoFinished(id, waiting);
    debug('Transco finished : %o, for %o', allFinished, id);

    if (allFinished) {
      await status.setWaiting(id);
      await queue.add({ id, notify, transco: waiting, subtitle });
    }

    ctx.body = true;
  },
);

router.delete(
  '/:id',
  joi(
    Joi.object({
      id: Joi.alternatives()
        .try(Joi.number(), Joi.string())
        .required(),
    }),
    'params',
  ),
  async ctx => {
    const { id } = ctx.params;
    if (await status.exists(id)) {
      status.setCancelled(id);
    }
    await cleaner.all(id);
    ctx.body = true;
  },
);

module.exports = router;
