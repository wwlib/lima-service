import { AuthRequest, QueryBody } from '@types';
import { Socket } from 'socket.io';
import TransactionProcessor from 'src/lima/TransactionProcessor';
import { LimaCommand } from 'src/SocketIoDeviceServer';

export enum ConnectionType {
    DEVICE = 'device',
    APP = 'app',
    CONTROLLER = 'controller',
}

export enum ConnectionAnalyticsEventType {
    COMMAND_FROM = 'command_from',
    COMMAND_TO = 'command_to',
    MESSAGE_FROM = 'message_from',
    MESSAGE_TO = 'message_to',
    AUDIO_BYTES_FROM = 'audio_bytes_from'
}

export default class Connection {

    private _type: ConnectionType;
    private _socket: Socket | undefined;
    private _socketId: string;
    private _accountId: string;
    private _syncOffset: number;
    private _lastSyncTimestamp: number;
    private _commandCountFrom: number;
    private _commandCountFromQuota: number;
    private _commandCountTo: number;
    private _messageCountFrom: number;
    private _messageCountFromQuota: number;
    private _messageCountTo: number;
    private _syncOffest: number;

    constructor(type: ConnectionType, socket: Socket, accountId: string) {
        this._type = type
        this._socket = socket
        this._socketId = socket.id
        this._accountId = accountId
        this._syncOffset = 0
        this._lastSyncTimestamp = 0
        this._commandCountFrom = 0
        this._commandCountFromQuota = 0
        this._commandCountTo = 0
        this._messageCountFrom = 0
        this._messageCountFromQuota = 0
        this._messageCountTo = 0
        this._syncOffest = 0;
    }

    get accountId(): string {
        return this._accountId
    }

    get syncOffest(): number {
        return this._syncOffest
    }

    toString(): string {
        const syncOffset = Math.round(this._syncOffest * 1000) / 1000
        return `${this._accountId}: [${this._socketId.substring(0, 6)}] syncOffset: ${syncOffset} ms, commandsFrom: ${this._commandCountFrom}. messagesFrom: ${this._messageCountFrom}`
    }

    sendMessage(message: unknown) {
        if (this._socket && this._socket.connected) {
            this._socket.emit('message', message)
        }
    }

    sendCommand(command: LimaCommand) {
        if (this._socket && this._socket.connected) {
            this._socket.emit('command', command)
        }
    }

    onAnalyticsEvent(eventType: ConnectionAnalyticsEventType, data: string | number) {
        switch (eventType) {
            case ConnectionAnalyticsEventType.COMMAND_FROM:
                this._commandCountFrom += 1
                break;
            case ConnectionAnalyticsEventType.COMMAND_TO:
                this._commandCountTo += 1
                break;
            case ConnectionAnalyticsEventType.MESSAGE_FROM:
                this._messageCountFrom += 1
                break;
            case ConnectionAnalyticsEventType.MESSAGE_TO:
                this._messageCountTo += 1
                break;
        }
    }

    onSyncOffset(offset: number) {
        this._syncOffest = offset
    }

    emitEvent(eventName: string, data?: any) {
        if (this._socket) {
            this._socket.emit(eventName, data)
        }
    }

    // NLU

    async handleTextCommand(command: LimaCommand) {
        console.log('Connection: handleTextCommand:', command)
        // TODO: add error handling
        const queryBody: QueryBody = command.payload
        const req: any = { // AuthRequest
            auth: {
                accountId: this._accountId,
                accessTokenPayload: this._socket?.data.decodedAccessToken
            }
        }
        try {
            const response: any = await TransactionProcessor.Instance().process(queryBody, req)
            this.sendMessage({ status: 'OK', accountId: this._accountId, response })
        } catch (error) {
            this.sendMessage({ status: 'NOK', accountId: this._accountId, error })
        }
    }

    dispose() {

    }
}