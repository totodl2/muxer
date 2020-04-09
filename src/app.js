const Koa = require('koa');
const bodyParser = require('koa-body');

const authenticated = require('./middlewares/authenticated');
const errorsHandler = require('./middlewares/errorsHandler');

const router = require('./routes');

const app = new Koa();

app
  .use(bodyParser({ jsonLimit: '15mb' }))
  .use(errorsHandler)
  .use(authenticated)
  .use(router.routes());

app.proxy = process.env.PROXIED && !!parseInt(process.env.PROXIED, 10);
module.exports = app;
