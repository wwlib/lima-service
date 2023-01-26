// launch with:
// REDIS_URL=redis://192.168.1.132:6379 NODE_ENV=development PORT=3000 node ./redis/test-redis-client.js 

const redisClient = require('./redis-client')

//console.log(redisClient)

doIt = async () => {
    result = await redisClient.getKeysAsync()
    console.log(result)
    process.exit(0)
}

doIt()
