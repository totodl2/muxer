const Koa = require('koa');
const bodyParser = require('koa-body');

const authenticated = require('./middlewares/authenticated');
const errorsHandler = require('./middlewares/errorsHandler');

const router = require('./routes');

const app = new Koa();

app
  .use(bodyParser())
  .use(errorsHandler)
  .use(authenticated)
  .use(router.routes());

module.exports = app;
