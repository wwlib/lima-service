import {
  getAnnotationWithId,
  newAnnotationWithDataAndTransaction,
  updateAnnotationWithDataAndAnotationId,
} from "./db/annotationDb";
import { AuthRequest, Annotation, AccountType, CreateAnnotation, UpdateAnnotation } from "@types";
import { getTransactionWithId } from "./db/transactionDb";

export default class AnnotationProcessor {
  private static _instance: AnnotationProcessor;

  constructor() {}

  static Instance() {
    return this._instance || (this._instance = new this());
  }

  async process(body: CreateAnnotation | UpdateAnnotation, req: AuthRequest): Promise<Annotation> {
    if ("id" in body) {
      // presence of annotation id indicates an UPDATE rather than a CREATE
      const data: Annotation = {
        // id: body.id,
        status: body.status,
        issueType: body.issueType,
        priority: body.priority,
        assignedTo: body.assignedTo,
        // datestamp: undefined,
        intentId: body.intentId,
        deidentifiedInput: body.deidentifiedInput,
        notes: body.notes,
        jiraIds: body.jiraIds,
        appSpecificData: body.appSpecificData,
        revision: body.revision,
      };

      await updateAnnotationWithDataAndAnotationId(data, body.id);
      return (await getAnnotationWithId(body.id)) as Annotation;
    } else {
      const transaction = await getTransactionWithId(body.transactionId);

      const auth = req.auth

      if (transaction) {
        const data = {
          type: body.type || AccountType.User,
          clientId: body.clientId,
          appName: transaction.appName,
          accountId: auth?.accessTokenPayload.accountId || body.accountId,
          sessionId: transaction.sessionId,
          transactionId: transaction.id,
          status: body.status,
          issueType: body.issueType,
          priority: body.priority,
          assignedTo: body.assignedTo,
          // datestamp: undefined,
          intentId: body.intentId,
          deidentifiedInput: body.deidentifiedInput,
          notes: body.notes,
          jiraIds: body.jiraIds,
          appSpecificData: body.appSpecificData,
          revision: 0,
        };

        return await newAnnotationWithDataAndTransaction(data, transaction);
      } else {
        throw new Error("Cannot find transaction.");
      }
    }
  }
}
