import express from 'express'
import http, { Server } from 'http'
// import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'
import * as handlers from '@handlers'
import { ExpressRouterWrapper } from './util/ExpressRouterWrapper'
// import { WSSRoutes, setupWebSocketServer } from './util/WebSocketServerWrapper'
import { setupSocketIoDeviceServer } from './SocketIoDeviceServer'
import { initMongoClient } from "./lima/db/mongoClient";

const cors = require('cors');
const cookieParser = require("cookie-parser");

dotenv.config()

const main = async () => {

  await initMongoClient();
  console.log(`Mongodb client initialized.`)

  const app = express()

  console.log(`LimaService: Looking for lima-app at path:`, process.env.LIMA_APP_PATH)
  // Set expected Content-Types
  app.use(express.json())
  app.use(express.text())
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
