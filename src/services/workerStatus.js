const { get, set, del } = require('../redis');

const REDIS_PREFIX = `${process.env.REDIS_PREFIX || ''}status.`;

const STATUS_CANCELLED = 1;
const STATUS_WAITING = 2;
const STATUS_ACTIVE = 3;

const getStatus = async id => {
  const value = await get(`${REDIS_PREFIX}${id}`);
  if (value === null) {
    return value;
  }
  return parseInt(value, 10);
};

module.exports = {
  isCancelled: async id => (await getStatus(id)) === STATUS_CANCELLED,
  exists: async id => !!(await getStatus(id)),
  remove: id => del(`${REDIS_PREFIX}${id}`),
  setCancelled: id => set(`${REDIS_PREFIX}${id}`, STATUS_CANCELLED),
  setActive: id => set(`${REDIS_PREFIX}${id}`, STATUS_ACTIVE),
  setWaiting: id => set(`${REDIS_PREFIX}${id}`, STATUS_WAITING),
  STATUS: {
    ACTIVE: STATUS_ACTIVE,
    CANCELLED: STATUS_CANCELLED,
    WAITING: STATUS_WAITING,
  },
};
