const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup (To Store numbrs that have been submitted by users)
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on('connect', () => {
  pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

// According to Redis docs we need to create dup because if client listening/publishing it cannot be used for anything else
// Here we need to have a Redis client running and the ability to publish 
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

// From PG, get all indices 
app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
});

// From Redis, get all indices and values  
app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

// Handles new values submitted by user, adds to PG and Redis.
app.post('/values', async (req, res) => {
  const index = req.body.index; // index = indice

  // If number is too high our function will take a very long time to calculate fib e.g. years 
  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  // 'Nothing yet' is just place holder that the worker thread will replace for given index
  redisClient.hset('values', index, 'Nothing yet!');
  // Make insert call to Redis
  redisPublisher.publish('insert', index);
  // Insert to PG
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log('Listening');
});
