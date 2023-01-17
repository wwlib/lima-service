import { Request, Response, Handler } from 'express'
import { AuthRequest } from '@types'
import { StatusCodes } from 'http-status-codes'
import { deleteMetadata, findMetadata, findMetadataByAppName, insertMetadata, updateMetadata } from "src/lima/db/metadataDb";
import { searchTransactionsWithCriteria } from 'src/lima/db/transactionDb';
import TransactionProcessor from 'src/lima/TransactionProcessor';

export class LimaHandlers {

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
    let metadata: any = await findMetadata();
    const result = { status: 'OK', accountId, metadata }
    res.status(StatusCodes.OK).json(result)
  }

  static processTransaction: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    console.log('LimaHandlers: processTransaction: req.body:', req.body)
    // TODO: add error handling
    const response: any = await TransactionProcessor.Instance().process(req.body, req)
    const result = { status: 'OK', accountId, response }
    res.status(StatusCodes.OK).json(result)
  }

  static searchTransactionsWithCriteria: Handler = async (req: AuthRequest, res: Response) => {
    let accountId = '';
    if (req.auth && req.auth.accessTokenPayload) {
      accountId = req.auth.accessTokenPayload.accountId
    }
    let transactions: any = await searchTransactionsWithCriteria(req.body);
    const result = { status: 'OK', accountId, transactions }
    res.status(StatusCodes.OK).json(result)
  }

}
