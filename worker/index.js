// The worker watches Redis for changes 
const keys = require('./keys');
const redis = require('redis');

// Here we connect to our Redis server
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000 // re-connect every 1 sec if looses conn.
});

// 
const sub = redisClient.duplicate();

// A slower version of fib fn that simulates why we would want a worker 
function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

// Watch redis for message event i.e. a new value entering Redis 
sub.on('message', (channel, message) => {
  redisClient.hset('values', message, fib(parseInt(message)));
});

// Subscribing for insert event 
sub.subscribe('insert');
