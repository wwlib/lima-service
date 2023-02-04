/**
 * To run:
 * node ./server
 * 
 * To test:
 * http://localhost:3000/store/hello/world
 * http://localhost:3000/keys
 * http://localhost:3000/get/hello
 */

const express = require('express');
const app = express();

const redisClient = require('./redis-client');

app.get('/store/:key/:value', async (req, res) => {
  const { key, value } = req.params;
  // const value = req.query;
  console.log(key, value)
  await redisClient.setAsync(key, value);
  return res.send('Success');
});

app.get('/get/:key', async (req, res) => {
  const { key } = req.params;
  const rawData = await redisClient.getAsync(key);
  return res.send(rawData);
});

app.get('/keys', async (req, res) => {
  const rawData = await redisClient.getKeysAsync();
  return res.json(rawData);
});

app.get('/graph/:action', async (req, res) => {
  const { action } = req.params;
  const value = req.query;
  const graphName = value.graphName;
  const query = value.query;
  const valueString = JSON.stringify(value);
  console.log(`graph: action: ${action}, value: ${valueString}`);
  let result = {};
  if (action == 'get') {
    result = await redisClient.getGraphAsync(query);
  }
  return res.send(JSON.stringify(result));
});

app.get('/', (req, res) => {
  return res.send('Hello world');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
