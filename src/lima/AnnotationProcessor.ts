import { AuthRequest, Annotation, AccountType, CreateAnnotation, UpdateAnnotation } from "@types";
import { RedisClient } from "./redis/RedisClient";

export class AnnotationProcessor {
  private static _instance: AnnotationProcessor;

  private _redisClient: RedisClient | undefined

  constructor() {}

  static Instance() {
    return this._instance || (this._instance = new this());
  }

  setRedisClient(redisClient: RedisClient) {
    this._redisClient = redisClient
  }

  async process(body: Annotation, req: AuthRequest): Promise<Annotation> {
    if (!this._redisClient) {
      throw new Error('AnnotationProcessor: error: redisClient is undefined.')
    }
    if ("id" in body) {
      // presence of annotation id indicates an UPDATE rather than a CREATE
      const data: Annotation = {
        type: body.type,
        clientId: body.clientId,
        appName: body.appName,
        serviceType: body.serviceType,
        accountId: body.accountId,
        sessionId: body.sessionId,
        transactionId: body.transactionId,
        status: body.status,
        issueType: body.issueType,
        priority: body.priority,
        assignedTo: body.assignedTo,
        intentId: body.intentId,
        category: body.category,
        deidentifiedInput: body.deidentifiedInput,
        notes: body.notes,
        jiraIds: body.jiraIds,
        appSpecificData: body.appSpecificData,
        datestamp: body.datestamp,
        datestampModified: Date.now(),
        revision: body.revision,
      };

      await this._redisClient.updateAnnotationWithDataAndAnotationId(data, body.id!);
      return (await this._redisClient.getAnnotationWithId(body.id!)) as Annotation;
    } else {
      const transaction = await this._redisClient.getTransactionWithId(body.transactionId!);
      const auth = req.auth
      if (transaction) {
        const data = {
          type: body.type || AccountType.User,
          clientId: body.clientId,
          appName: transaction.appName,
          serviceType: transaction.serviceType,
          accountId: auth?.accessTokenPayload.accountId || body.accountId,
          sessionId: transaction.sessionId,
          transactionId: transaction.id,
          status: body.status,
          issueType: body.issueType,
          priority: body.priority,
          assignedTo: body.assignedTo,
          intentId: body.intentId,
          category: body.category,
          deidentifiedInput: body.deidentifiedInput,
          notes: body.notes,
          jiraIds: body.jiraIds,
          appSpecificData: body.appSpecificData,
          datestamp: Date.now(),
          datestampModified: Date.now(),
          revision: 0,
        };

        return await this._redisClient.newAnnotationWithDataAndTransaction(data, transaction);
      } else {
        throw new Error("AnnotationProcessor: error: cannot find transaction.");
      }
    }
  }
}
