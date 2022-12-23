import { Request, Response, Handler } from 'express'
import { AuthRequest } from '@types'
import { StatusCodes } from 'http-status-codes'
import { deleteMetadata, findMetadata, findMetadataByAppName, insertMetadata, updateMetadata } from "src/lima/db/metadataDb";
import { findUsers } from 'src/lima/db/usersDb';
import { searchTransactionsWithCriteria } from 'src/lima/db/transactionDb';
import TransactionProcessor from 'src/lima/TransactionProcessor';

export class LimaHandlers {
  private static instance: LimaHandlers;

  private constructor() {
  }

  public static getInstance(): LimaHandlers {
    if (!LimaHandlers.instance) {
      LimaHandlers.instance = new LimaHandlers()
    }
    return LimaHandlers.instance
  }

  public findUsers: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let metadata: any = await findUsers();
    const result = { status: 'OK', accountId, metadata }
    res.status(StatusCodes.OK).json(result)
  }

  public findMetadata: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let metadata: any = await findMetadata();
    const result = { status: 'OK', accountId, metadata }
    res.status(StatusCodes.OK).json(result)
  }

  public processTransaction: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    console.log('LimaHandlers: processTransaction: req.body:', req.body)
    // TODO: add error handling
    const response: any = await TransactionProcessor.Instance().process(req.body, { auth: { userId: accountId, roles: []}, token: '' })
    const result = { status: 'OK', accountId, response }
    res.status(StatusCodes.OK).json(result)
  }

  public searchTransactionsWithCriteria: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let transactions: any = await searchTransactionsWithCriteria(req.body);
    const result = { status: 'OK', accountId, transactions }
    res.status(StatusCodes.OK).json(result)
  }

}
