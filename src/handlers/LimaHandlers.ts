import { Request, Response, Handler } from 'express'
import { AuthRequest } from '@types'
import { StatusCodes } from 'http-status-codes'
import { deleteMetadata, findMetadata, findMetadataByAppName, insertMetadata, updateMetadata } from "src/lima/db/metadataDb";
import { findUsers } from 'src/lima/db/usersDb';

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
}
