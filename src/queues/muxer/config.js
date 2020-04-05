module.exports = {
  // required string
  name: 'muxer',
  // host display name, give it a helpful name for reference
  // required string
  hostId: 'Muxer',
  // optional string
  // default: null (will assume Bull)
  type: 'bull',
  // queue keys prefix
  // optional string
  // default: "bq" for Bee, "bull" for Bull
  prefix: 'bull',
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
};
