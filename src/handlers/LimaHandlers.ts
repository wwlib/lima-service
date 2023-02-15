import { Request, Response, Handler } from 'express'
import { AuthRequest } from '@types'
import { StatusCodes } from 'http-status-codes'
import { RedisClient } from 'src/lima/redis/RedisClient';
import { TransactionProcessor } from 'src/lima/TransactionProcessor';
import { AnnotationProcessor } from 'src/lima/AnnotationProcessor';

export class LimaHandlers {

  private static _redisClient: RedisClient | undefined

  static setRedisClient(redisClient: RedisClient) {
    LimaHandlers._redisClient = redisClient
  }

  static findUsers: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let users: any = { users: [] }; // TODO: implement this. get users from TBD auth service.
    const result = { status: 'OK', accountId, users }
    res.status(StatusCodes.OK).json(result)
  }

  static findMetadata: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let metadata: any = []
    let result: any = { status: 'OK', accountId, metadata }
    if (LimaHandlers._redisClient) {
      try {
        metadata = await LimaHandlers._redisClient.findMetadata()
        result.metadata = metadata
      } catch (error) {
        result = { status: 'NOK', accountId, error: `LimaHandlers: findMetadata: ${error}.` }
      }
    } else {
      result = { status: 'NOK', accountId, error: "LimaHandlers: findMetadata: redis client is undefined." }
    }
    res.status(StatusCodes.OK).json(result)
  }

  static processTransaction: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    console.log('LimaHandlers: processTransaction: req.body:', req.body)
    let response: any = {}
    let result: any = { status: 'OK', accountId, response }
    try {
      response = await TransactionProcessor.Instance().process(req.body, req)
      result.response = response
    } catch (error) {
      result = { status: 'NOK', accountId, error: `LimaHandlers: processTransaction: ${error}.` }
    }
    res.status(StatusCodes.OK).json(result)
  }

  static processTransactionLog: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    console.log('LimaHandlers: processTransactionLog: req.body:', req.body)
    let response: any = {}
    let result: any = { status: 'OK', accountId, response }
    try {
      response = await TransactionProcessor.Instance().processTransactionLog(req.body)
      result.response = response
    } catch (error) {
      result = { status: 'NOK', accountId, error: `LimaHandlers: processTransactionLog: ${error}.` }
    }
    res.status(StatusCodes.OK).json(result)
  }

  static searchTransactionsWithCriteria: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let transactions: any = []
    let result: any = { status: 'OK', accountId, transactions }
    if (LimaHandlers._redisClient) {
      try {
        transactions = await LimaHandlers._redisClient.searchTransactionsWithCriteria(req.body)
        result.transactions = transactions
      } catch (error) {
        result = { status: 'NOK', accountId, error: `LimaHandlers: searchTransactionsWithCriteria: ${error}.` }
      }
    } else {
      result = { status: 'NOK', accountId, error: "LimaHandlers: searchTransactionsWithCriteria: redis client is undefined." }
    }
    res.status(StatusCodes.OK).json(result)
  }

  static processAnnotation: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    console.log('LimaHandlers: processAnnotation: req.body:', req.body)
    let response: any = {}
    let result: any = { status: 'OK', accountId, response }
    try {
      response = await AnnotationProcessor.Instance().process(req.body, req)
      result.response = response
    } catch (error) {
      result = { status: 'NOK', accountId, error: `LimaHandlers: processAnnotation: ${error}.` }
    }
    res.status(StatusCodes.OK).json(result)
  }

  static searchAnnotationsWithCriteria: Handler = async (req: AuthRequest, res: Response) => {
    console.log(`LimaHandlers: searchAnnotationsWithCriteria: req.body:`, req.body)
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let annotations: any = []
    let result: any = { status: 'OK', accountId, annotations }
    if (LimaHandlers._redisClient) {
      try {
        annotations = await LimaHandlers._redisClient.searchAnnotationsWithCriteria(req.body)
        result.annotations = annotations
      } catch (error) {
        result = { status: 'NOK', accountId, error: `LimaHandlers: searchAnnotationsWithCriteria: ${error}.` }
      }
    } else {
      result = { status: 'NOK', accountId, error: "LimaHandlers: searchAnnotationsWithCriteria: redis client is undefined." }
    }
    res.status(StatusCodes.OK).json(result)
  }
}
