/**
 * RedisClient establishes a connection with a redis service and provides an abstracted api.
 */

import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionCriteria, Annotation, AnnotationCriteria, Metadata } from '@types'
import MetadataRequestProcessor from "../MetadataRequestProcessor";
import { createClient, RedisClientOptions } from 'redis';

const path = require('path')
const jsonfile = require('jsonfile')

export class RedisClient {

  static TRANSACTION_ID_PREFIX = 'lima:trx:'
  static ANNOTATION_ID_PREFIX = 'lima:anx:'

  private _graphName: string

  private _connected: boolean
  private _host: string;
  private _port: number;
  private _password: string | undefined;
  private _client: any
  private _errorCount: number
  private _reconnectAttempts: number


  constructor(host: string = '', port: number = 6379, graphName: string = 'TBD') {
    this._host = host
    this._port = port
    this._graphName = graphName
    this._connected = false
    this._errorCount = 0
    this._reconnectAttempts = 0
  }

  get redisUrl(): string {
    return this._host
  }

  get connected(): boolean {
    return this._connected
  }

  async connect(host: string = 'localhost', port: number = 6379, password?: string) {
    this._host = host
    this._port = port
    this._password = password
    this._connected = false

    const clientOptions: RedisClientOptions = {
      socket: {
        host: this._host,
        port: this._port,
        // connectTimeout: 5000,
        // keepAlive: false,
        // noDelay: false,
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.log('RedisClient: exceeded 10 reconnect attemtps. Continuing without redis...')
            return new Error('RedisClient: exceeded 10 reconnect attemtps. Continuing without redis...')
          } else {
            return 10000
          }
        }
      },
      password
    }
    this._client = createClient(clientOptions)
      .on('connect', () => {
        console.log('RedisClient: connect')
        // this._connected = true
        this._errorCount = 0
        this._reconnectAttempts = 0
      })
      .on('ready', () => {
        console.log('RedisClient: ready')
        this._connected = true
        this.checkForBootstrapData()
          .then((result: any) => {
            console.log(`initialized successfully:`, result)
          })
          .catch((error: any) => {
            console.log(`RedisClient: checkForBootstrapData: ERROR:`, error)
          })
      })
      .on('error', (e) => {
        this._errorCount++
        console.log(`RedisClient: error: _errorCount: ${this._errorCount}`, e)
      })
      .on('close', () => {
        console.log('RedisClient: close')
        this._connected = false
      })
      .on('reconnecting', () => {
        this._connected = false
        this._reconnectAttempts++
        console.log(`RedisClient: reconnecting: _reconnectAttempts: ${this._reconnectAttempts}`)
      })
      .on('end', () => {
        console.log('RedisClient: end')
      })

    console.log(`RedisClient: Connecting to:`, clientOptions.socket)
    await this._client.connect()
  }

  async checkForBootstrapData(): Promise<any> {
    console.log(`RedisClient initializing with bootstrap data...`)
    const defaultRedisData = await import("./defaultRedisData.json");
    this.initWithData(defaultRedisData, 'defaultRedisData.json')
    const limarcData = await jsonfile.readFile("./.limarc.json")
    this.initWithData(limarcData, '.limarc.json')
    console.log(`RedisClient initialized.`)
  }

  async initWithData(data: any, source: string = '') {
    console.log(`RedisClient: initWithData: ${source}`)

    const metadata: any[] = data.metadata
    if (metadata && metadata.length) {
      for (let i: number = 0; i < metadata.length; i++) {
        const item = metadata[i]
        MetadataRequestProcessor.Instance().addMetadataToCache(item)
        console.log(`RedisClient: ensuring metadata: ${item.key} exists`)
        try {
          await this.setJsonAsync(item.key, item)
        } catch (error) {
          console.log(`${item.key}: ${error}`)
        }
      }
    }

    const keys: any[] = data.keys
    if (keys && keys.length) {
      keys.forEach(item => {
        console.log(`RedisClient: ensuring keys: ${item.key} exists [unimpemented]`) // TODO
      })
    }

    const accounts: any[] = data.accounts
    if (accounts && accounts.length) {
      accounts.forEach(item => {
        console.log(`RedisClient: ensuring account: ${item.key} exists [unimpemented]`) // TODO
      })
    }

    const indices: any[] = data.indices
    if (indices && indices.length) {
      for (let i: number = 0; i < indices.length; i++) {
        const item = indices[i]
        console.log(`RedisClient: ensuring index: ${item.key} exists`)
        try {
          await this._client.ft.create(item.key, item.schema, item.options)
        } catch (error) {
          console.log(`${error}: ${item.key}`)
        }
      }
    }
  }

  queryGraphAsync = async (cypherQuery: string) => {
    if (!this._connected) {
      throw new Error('RedisClient: queryGraphAsync: redis client is not connected.')
    }
    let result: any = { cypherQuery }
    if (this._graphName) {
      result.response = await this._client.graph.query(this._graphName, cypherQuery)
    } else {
      result.error = `RedisClient: graphName is undefined.`
    }
    return result
  }

  getKeysAsync = async () => {
    if (!this._connected) {
      throw new Error('RedisClient: getKeysAsync: redis client is not connected.')
    }
    return await this._client.keys('*')
  }

  getAsync = async (key: string) => {
    if (!this._connected) {
      throw new Error('RedisClient: getAsync: redis client is not connected.')
    }
    return await this._client.get(key)
  }

  setAsync = async (key: string, value: string) => {
    if (!this._connected) {
      throw new Error('RedisClient: setAsync: redis client is not connected.')
    }
    return await this._client.set(key, value)
  }

  deleteAsync = async (key: string) => {
    if (!this._connected) {
      throw new Error('RedisClient: deleteAsync: redis client is not connected.')
    }
    return await this._client.del(key)
  }

  getJsonAsync = async (key: string, options?: any) => {
    if (!this._connected) {
      throw new Error('RedisClient: getJsonAsync: redis client is not connected.')
    }
    return await this._client.json.get(key, options)
  }

  setJsonAsync = async (key: string, json: any) => {
    if (!this._connected) {
      throw new Error('RedisClient: setJsonAsync: redis client is not connected.')
    }
    return await this._client.json.set(key, '$', json)
  }

  deleteJsonAsync = async (key: string, options?: any) => {
    if (!this._connected) {
      throw new Error('RedisClient: deleteJsonAsync: redis client is not connected.')
    }
    return await this._client.json.del(key, options)
  }

  ////// LIMA

  // Transactions

  getNewTransactionId() {
    return uuidv4().replaceAll('-', '')
  }

  getNewAnnotationId() {
    return uuidv4().replaceAll('-', '')
  }

  getNewSessionId() {
    return uuidv4().replaceAll('-', '')
  }

  async newTransactionWithDataAndSession(
    transactionData: Transaction,
    sessionId: string,
    overWriteId: boolean = true,
  ): Promise<Transaction> {
    if (!this._connected) {
      throw new Error('RedisClient: newTransactionWithDataAndSession: redis client is not connected.')
    }
    const newId = this.getNewTransactionId()
    const newSessionId = this.getNewSessionId()
    transactionData.id = overWriteId ? newId : transactionData.id ? transactionData.id : newId
    transactionData.sessionId = sessionId || newSessionId
    transactionData.datestamp = Date.now()
    await this.setJsonAsync(`${RedisClient.TRANSACTION_ID_PREFIX}${transactionData.id}`, transactionData)
    return transactionData
  }

  async getTransactionWithId(id: string): Promise<Transaction | null> {
    return await this.getJsonAsync(`${RedisClient.TRANSACTION_ID_PREFIX}${id}`)
  }

  async searchTransactionsWithCriteria(criteria: TransactionCriteria): Promise<Transaction[]> {
    console.log(`RedisClient: searchTransactionsWithCriteria: criteria:`, criteria)
    if (!this._connected) {
      throw new Error('RedisClient: searchTransactionsWithCriteria: redis client is not connected.')
    }
    let result = []
    let criteriaString: string = ''
    if (criteria.criteriaString) {
      criteriaString = criteria.criteriaString
    } else if (typeof criteria === 'object' && Object.keys(criteria).length > 0) {
      const criteriaKeys: string[] = Object.keys(criteria)
      criteriaKeys.forEach((key) => {
        criteriaString += `@${key}:'${criteria[key as keyof TransactionCriteria]}' `
      })
    } else {
      criteriaString = '*' // TODO: is this a good default?
    }
    console.log(`RedisClient: searchTransactionsWithCriteria: criteriaString:`, criteriaString)
    try {
      result = await this._client.ft.search('lima:idx:trx', criteriaString, { LIMIT: { from: 0, size: 100 } })
      return result.documents
    } catch (error) {
      throw error
    }
  }

  // Annotations

  async newAnnotationWithDataAndTransaction(
    annotationData: Annotation,
    transaction: Transaction,
  ): Promise<Annotation> {
    if (!this._connected) {
      throw new Error('RedisClient: newAnnotationWithDataAndTransaction: redis client is not connected.')
    }
    const id = this.getNewAnnotationId()
    annotationData.id = id
    annotationData.sessionId = transaction.sessionId
    annotationData.datestamp = Date.now()
    annotationData.datestampModified = Date.now()
    await this.setJsonAsync(`${RedisClient.ANNOTATION_ID_PREFIX}${id}`, annotationData)
    return annotationData
  }

  async updateAnnotationWithDataAndAnotationId(
    annotationData: Annotation,
    annotationId: string,
  ) {
    if (!this._connected) {
      throw new Error('RedisClient: updateAnnotationWithDataAndAnotationId: redis client is not connected.')
    }
    const annotation = await this.getAnnotationWithId(annotationId);
    if (!annotation) {
      throw new Error("Annotation not found. Update aborted.");
    }
    if (annotationData.revision != annotation.revision) {
      throw new Error("Revision mismatch. AnnotationData is out of sync. Update aborted.");
    }
    let updatedData: any = {}
    Object.assign(updatedData, annotation)
    const keysToUpdate = Object.keys(annotationData)
    const keysToSkip = ['id', 'transactionId', 'accountId', 'sessionId', 'serviceType', 'appName', 'clientId', 'type', 'revision', 'datestamp', 'datestampModified']
    
    keysToUpdate.forEach(key => {
      if (!(key in keysToSkip)) {
        const annotationKey = key as keyof Annotation
        updatedData[key] = annotationData[annotationKey]
      }
    })
    updatedData.datestampModified = Date.now();
    updatedData.revision = annotation.revision + 1
    await this.setJsonAsync(`${RedisClient.ANNOTATION_ID_PREFIX}${annotationId}`, updatedData)
  }

  async getAnnotationWithId(id: string): Promise<Annotation | null> {
    return await this.getJsonAsync(`${RedisClient.ANNOTATION_ID_PREFIX}${id}`)
  }

  async searchAnnotationsWithCriteria(criteria: AnnotationCriteria): Promise<Annotation[]> {
    if (!this._connected) {
      throw new Error('RedisClient: searchAnnotationsWithCriteria: redis client is not connected.')
    }
    let result = []
    let criteriaString: string = ''
    if (criteria.criteriaString) {
      criteriaString = criteria.criteriaString
    } else if (typeof criteria === 'object' && Object.keys(criteria).length > 0) {
      const criteriaKeys: string[] = Object.keys(criteria)
      criteriaKeys.forEach((key) => {
        criteriaString += `@${key}:'${criteria[key as keyof TransactionCriteria]}' `
      })
    } else {
      criteriaString = '*' // TODO: is this a good default?
    }
    console.log(`RedisClient: searchAnnotationsWithCriteria: criteriaString:`, criteriaString)
    try {
      result = await this._client.ft.search('lima:idx:anx', criteriaString)
      return result.documents
    } catch (error) {
      throw error
    }
  }

  // Metadata - service metadata

  async insertMetadata(metadata: Metadata): Promise<Metadata> {
    if (!this._connected) {
      throw new Error('RedisClient: insertMetadata: redis client is not connected.')
    }
    return await this.setJsonAsync(`lima:metadata:${metadata.appId}`, metadata)
  }

  // TODO: same as insertMetadata. redundant?
  async updateMetadata(metadata: Metadata): Promise<Metadata> {
    if (!this._connected) {
      throw new Error('RedisClient: updateMetadata: redis client is not connected.')
    }
    return await this.setJsonAsync(`lima:metadata:${metadata.appId}`, metadata)
  }

  async deleteMetadata(appName: string) {
    if (!this._connected) {
      throw new Error('RedisClient: deleteMetadata: redis client is not connected.')
    }
    await this.deleteJsonAsync(`lima:metadata:${appName}`)
  }

  async findMetadata(): Promise<Metadata[]> {
    if (!this._connected) {
      throw new Error('RedisClient: findMetadata: redis client is not connected.')
    }
    const result = await this._client.ft.search('lima:idx:metadata', '*')
    return result.documents
  }

  async findMetadataByAppName(appName: string): Promise<Metadata> {
    if (!this._connected) {
      throw new Error('RedisClient: findMetadataByAppName: redis client is not connected.')
    }
    return await this.getJsonAsync(`lima:metadata:${appName}`)
  }
}
