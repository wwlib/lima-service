import { Server as HTTPServer } from 'http'
import { Server as SocketIoServer } from 'socket.io'
import { JwtAuth } from './auth/JwtAuth'
import ConnectionManager from 'src/connection/ConnectionManager'
import { ConnectionAnalyticsEventType, ConnectionType } from 'src/connection/Connection'

export interface LimaCommand {
    type: string
    name: string
    payload: any
}

export enum LimaCommandType {
    nlu = 'nlu'
}

export const setupSocketIoDeviceServer = (httpServer: HTTPServer, path: string): SocketIoServer => {
    const ioSocketServer = new SocketIoServer(httpServer, {
        path: path,
    })

    ioSocketServer.use(function (socket: any, next: any) {
        var auth = socket.request.headers.authorization
        // console.log("auth", auth)
        if (auth) {
            const token = auth.replace("Bearer ", "")
            if (!token) {
                return next(new Error('socket.io DEVICE connection: unauthorized: Missing token.'))
            }
            let decodedAccessToken: any
            try {
                decodedAccessToken = JwtAuth.decodeAccessToken(token)
                if (process.env.DEBUG === 'true') {
                    console.log('DEBUG: DeviceServer: decoded access token:')
                    console.log(decodedAccessToken)
                }
                socket.data.accountId = decodedAccessToken.accountId
                socket.data.decodedAccessToken = decodedAccessToken
            } catch (error: any) {
                console.error(error)
                return next(new Error('DeviceServer: connection: unauthorized: Invalid token.'))
            }
            return next()
        } else {
            return next(new Error("no authorization header"))
        }
    })

    ioSocketServer.on('connection', function (socket: any) {
        console.log(`DeviceServer: on DEVICE connection:`, socket.id)
        const connection = ConnectionManager.getInstance().addConnection(ConnectionType.DEVICE, socket, socket.data.accountId)
        socket.emit('message', { source: 'Lima', event: 'handshake', message: 'DEVICE connection accepted' })

        socket.on('command', (command: LimaCommand) => {
            console.log(`DeviceServer: on command:`, socket.id, socket.data.accountId, command)
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionAnalyticsEventType.COMMAND_FROM)
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.CONTROLLER, socket, ConnectionAnalyticsEventType.COMMAND_TO)
            if (command.type === LimaCommandType.nlu && command.name === 'text' && command.payload) {

            } else {
                console.log(``)
            }
        })

        socket.on('command', (command: LimaCommand) => {
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionAnalyticsEventType.COMMAND_FROM, command.type)
            if (command.type === LimaCommandType.nlu) {
                if (process.env.DEBUG === 'true') {
                    console.log(`DEBUG: DeviceServer: on nlu command:`, socket.id, socket.data?.accountId, command)
                }
                if (command.name === 'text') {
                    if (connection) {
                        connection.handleTextCommand(command)
                    }
                }
            }
        })

        socket.on('message', (message: any) => {
            if (process.env.DEBUG === 'true') {
                console.log(`DEBUG: DeviceServer: on message:`, socket.id, socket.data.accountId, message)
                socket.emit('message', { source: 'Lima', event: 'ack', data: message })
            }
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionAnalyticsEventType.MESSAGE_FROM, message.event)
        })

        socket.once('disconnect', function (reason: string) {
            console.log(`DeviceServer: on DEVICE disconnect: ${reason}: ${socket.id}`)
            ConnectionManager.getInstance().removeConnection(ConnectionType.DEVICE, socket)
        })

        // time sync

        socket.on('timesync', function (data: any) {
            // console.log('device timesync message:', data)
            socket.emit('timesync', {
                id: data && 'id' in data ? data.id : null,
                result: Date.now()
            })
        })
    })

    return ioSocketServer
}
