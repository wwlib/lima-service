import { db } from "./mongoClient";
import { Annotation, AnnotationCriteria, Transaction } from "@types";
import { ensureArray, mongoId, unwrapId, WithMongoId } from "./utils";

export async function newAnnotationWithDataAndTransaction(
  annotationData: Omit<Annotation, "id">,
  transaction: Transaction,
): Promise<Annotation> {
  const annotation: WithMongoId<Annotation> = {
    ...annotationData,
    sessionId: transaction.sessionId,
    transactionId: transaction.id,
    datestamp: Date.now(),
    datestampModified: Date.now(),
    _id: mongoId(),
  };

  return unwrapId((await annotations().insertOne(annotation)).ops[0]);
}

export async function updateAnnotationWithDataAndAnotationId(
  annotationData: Partial<Annotation>,
  annotationId: string,
) {
  const annotation = await getAnnotationWithId(annotationId);

  if (!annotation) {
    throw new Error("Annotation not found. Update aborted.");
  }
  if (annotationData.revision != annotation.revision) {
    throw new Error("Revision mismatch. AnnotationData is out of sync. Update aborted.");
  }

  annotationData.datestampModified = Date.now();

  await annotations().updateOne(
    { _id: annotationId },
    { $set: { revision: annotationData.revision + 1, ...annotationData } },
  );
}

export async function getAnnotationWithId(id: string): Promise<Annotation | null> {
  return unwrapId(await annotations().findOne({ _id: id }));
}

// tag search (i.e. for jiraIds)
// https://stackoverflow.com/questions/6940503/mongodb-get-documents-by-tags
// regex alternative
// ...(jiraIds ? { jiraIds: {$regex: jiraIds} } : {}),

export async function searchAnnotationsWithCriteria(criteria: AnnotationCriteria): Promise<Annotation[]> {
  const { annotationId, status, jiraId, ...query } = criteria;

  return unwrapId(
    await (
      await annotations()
        .find({
          ...query,
          ...(annotationId ? { _id: annotationId } : {}),
          ...(status ? { status: { $in: ensureArray(status) } } : {}),
          // ...(jiraIds ? { jiraIds: {$regex: jiraIds} } : {}),
          ...(jiraId ? { jiraIds: { $elemMatch: { $eq: jiraId } } } : {}),
        })
        .limit(500)
        .sort({ intentId: 1, datestamp: 1 })
    ).toArray(),
  );
}

function annotations() {
  return db.collection("annotations");
}
