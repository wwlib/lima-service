import express from 'express'
import http, { Server } from 'http'
// import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'
import * as handlers from '@handlers'
import { ExpressRouterWrapper } from './util/ExpressRouterWrapper'
// import { WSSRoutes, setupWebSocketServer } from './util/WebSocketServerWrapper'
import { setupSocketIoDeviceServer } from './SocketIoDeviceServer'
import { RedisClient } from './lima/redis/RedisClient'
import { TransactionProcessor } from './lima/TransactionProcessor'
import { LimaHandlers } from '@handlers'
import { AnnotationProcessor } from './lima/AnnotationProcessor'
import MetadataRequestProcessor from './lima/MetadataRequestProcessor'

const cors = require('cors');
const cookieParser = require("cookie-parser");
const jsonfile = require('jsonfile')

dotenv.config()

const main = async () => {
  const redisClient = new RedisClient(process.env.REDIS_HOST!)
  MetadataRequestProcessor.Instance().setRedisClient(redisClient)
  TransactionProcessor.Instance().setRedisClient(redisClient)
  AnnotationProcessor.Instance().setRedisClient(redisClient)
  LimaHandlers.setRedisClient(redisClient)

  // populate the metadata cache with bootstrap data independent of redis
  // allows lima-service to run without redis, if necessary
  // Note: RedisClient also loads bootstrap data
  try {
    console.log(`Loading and caching metadata from .limarc.json`)
    const limarcData = await jsonfile.readFile("./.limarc.json")
    if (limarcData && limarcData.metadata && limarcData.metadata.length) {
      for (let i: number = 0; i < limarcData.metadata.length; i++) {
        const item = limarcData.metadata[i]
        MetadataRequestProcessor.Instance().addMetadataToCache(item)
      }
    }
  } catch (error) {
    console.log(`Unable to load limarc data. proceeding...`)
  }

  console.log(process.env.REDIS_HOST, process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379, process.env.REDIS_PASSWORD)

  if (process.env.REDIS_HOST) {
    redisClient.connect(process.env.REDIS_HOST, process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379, process.env.REDIS_PASSWORD)
    .catch(error => {
      console.log(`index: error: redisClient.connect`, error)
      console.log(`Continuing without redis...`)
    })
  } else {
    console.log(`REDIS_HOST is undefined.`)
    console.log(`Proceeding without redis...`)
  }

  // console.log(`RedisClient instantiated.`)
  // try {
    // redisClient.connect()
    // console.log(`RedisClient connected.`)
    // console.log(`RedisClient initializing...`)
    // const defaultRedisData = await import("./lima/redis/defaultRedisData.json");
    // await redisClient.initWithData(defaultRedisData, 'defaultRedisData.json')
    // const limarcData = await jsonfile.readFile("./.limarc.json")
    // await redisClient.initWithData(limarcData, '.limarc.json')
    // console.log(`RedisClient initialized.`)
  // } catch (error) {
  //   console.log(`Error during RedisClient intialization.`, error)
  //   console.log(`Proceeding....`)
  // }

  const app = express()

  console.log(`LimaService: Looking for lima-app at path:`, process.env.LIMA_APP_PATH)
  // Set expected Content-Types
  app.use(express.text())
  app.use(express.json())
  app.use(express.static('public'));
  app.use(cookieParser());

  // https://www.section.io/engineering-education/how-to-use-cors-in-nodejs-with-express/
  app.use(cors({
    origin: process.env.CORS_ORIGIN, // 'http://localhost:3000',
    credentials: true,
  }));

  // HealthCheck
  app.get('/healthcheck', handlers.HealthCheckHandler)

  const serviceOptions = { useAuth: false }
  if (process.env.USE_AUTH === 'true') {
    serviceOptions.useAuth = true;
    console.info('(USE_AUTH === true) so using mock JWT auth.')
  } else {
    console.info('(USE_AUTH !== true) so NOT using mock JWT auth.')
  }

  // http routes

  const expressRouterWrapper = new ExpressRouterWrapper('', serviceOptions)

  // AUTH
  expressRouterWrapper.addGetHandlerNoAuth('/signin', handlers.SiteHandlers.signinHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/forbidden', handlers.SiteHandlers.forbiddenHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/auth', handlers.MockAuthHandlers.authHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/refresh', handlers.MockAuthHandlers.refreshHandler)
  expressRouterWrapper.addPostHandlerNoAuth('/auth', handlers.MockAuthHandlers.authHandler)

  // ADMIN
  expressRouterWrapper.addGetHandler('/dashboard', handlers.SiteHandlers.dashboardHandler, ['example:read'])
  expressRouterWrapper.addGetHandler('/console', handlers.SiteHandlers.consoleHandler, ['example:admin'])

  // SERVICE
  expressRouterWrapper.addPostHandler('/users', handlers.LimaHandlers.findUsers, ['example:read'])
  expressRouterWrapper.addPostHandler('/metadata', handlers.LimaHandlers.findMetadata, ['example:read'])
  expressRouterWrapper.addPostHandler('/transaction', handlers.LimaHandlers.processTransaction, ['example:read'])
  expressRouterWrapper.addPostHandler('/transactions', handlers.LimaHandlers.searchTransactionsWithCriteria, ['example:read'])
  expressRouterWrapper.addPostHandler('/annotation', handlers.LimaHandlers.processAnnotation, ['example:read'])
  expressRouterWrapper.addPostHandler('/annotations', handlers.LimaHandlers.searchAnnotationsWithCriteria, ['example:read'])


  // UTIL
  expressRouterWrapper.addGetHandler('/time', handlers.TimeHandler, ['example:read'])

  // lima-app
  expressRouterWrapper.addGetHandler('*', handlers.SiteHandlers.limaAppHandler, ['example:read'])

  // expressRouterWrapper.addGetHandlerNoAuth('/', handlers.SiteHandlers.redirectToDashboardHandler)

  if (expressRouterWrapper) {
    const routerPath = expressRouterWrapper.path !== '' ? `/${expressRouterWrapper.path}` : ''
    app.use(`${routerPath}`, expressRouterWrapper.getRouter())
  }

  const port = parseInt(<string>process.env.SERVER_PORT) || 8084
  const httpServer: Server = http.createServer(app)

  // socket routes

  // const wssRoutes: WSSRoutes = [
  //   { path: '/ws-echo', handler: handlers.wsEchoHandler, permissions: ['example:read'] },
  //   { path: '/ws-silent', handler: handlers.wsSilentHandler, permissions: ['example:read'] },
  // ]
  // const wss: WebSocketServer = setupWebSocketServer(httpServer, wssRoutes, serviceOptions)

  // socket-io routes

  setupSocketIoDeviceServer(httpServer, '/socket-device/')

  process.on('SIGINT', () => {
    const errorTimestamp = new Date().toLocaleString()
    console.error(`LimaService: [${errorTimestamp}] Received interrupt, shutting down`)
    httpServer.close()
    process.exit(0)
  })

  httpServer.listen(port, () => {
    console.log(`LimaService: (HTTP/ws/socket-io server) is ready and listening at port ${port}!`)
  })
}

process.on('uncaughtException', function (exception) {
  const errorTimestamp = new Date().toLocaleString()
  console.error(`LimaService: [${errorTimestamp}] uncaughtException:`, exception);

});

process.on('unhandledRejection', (reason, p) => {
  const errorTimestamp = new Date().toLocaleString()
  console.error(`LimaService: [${errorTimestamp}] unhandledRejection at: Promise`, p, " reason: ", reason);
});

main().catch((error) => {
  const errorTimestamp = new Date().toLocaleString()
  console.error(`LimaService: [${errorTimestamp}] Detected an unrecoverable error. Stopping!`)
  console.error(error)
})
