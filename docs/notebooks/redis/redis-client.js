const redis = require('redis');

const graphName = 'TBD';

console.log(`connecting to: ${process.env.REDIS_HOST}`)
const client = redis.createClient({
  url: process.env.REDIS_HOST
});
client.connect()


const queryGraphAsync = async (cypherQuery) => {
  const result = await client.graph.query(graphName, cypherQuery);
  return { cypherQuery, result };
}

const getKeysAsync = async () => {
  const results = await client.keys('*');
  return results
}

const getAsync = async (key) => {
  return await client.get(key)
}

const setAsync = async (key, value) => {
  return await client.set(key, value)
}

const deleteAsync = async (key) => {
  return await client.del(key)
}

const getJsonAsync = async (key, options) => {
  const results = await client.json.get(key, options);
  return results
}

const setJsonAsync = async (key, json) => {
  const results = await client.json.set(key, '$', json);
  return results
}

const deleteJsonAsync = async (key, options) => {
  const results = await client.json.del(key, options);
  return results
}

module.exports = {
  ...client,
  getKeysAsync,
  getAsync,
  setAsync,
  deleteAsync,
  queryGraphAsync,
  getJsonAsync,
  setJsonAsync,
  deleteJsonAsync,
};
