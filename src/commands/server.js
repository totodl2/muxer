const debug = require('../debug')('server');
const app = require('../app');

module.exports = async () => {
  const port = process.env.PORT || 3000;
  const hostname = process.env.HOSTNAME || '0.0.0.0';
  const server = app.listen(port, hostname, () => {
    debug('Listening on %s:%i', hostname, port);
  });

  const close = () => server.close();
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
};
