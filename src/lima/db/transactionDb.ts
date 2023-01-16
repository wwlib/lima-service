import { db } from "./mongoClient";
import { Session, Transaction, TransactionCriteria } from "@types";
import { byMongoId, mongoId, unwrapId, WithMongoId } from "./utils";

export async function newTransactionWithDataAndSession(
  transactionData: Omit<Transaction, "id" | "sessionId">,
  session: Session,
): Promise<Transaction> {
  const transaction: WithMongoId<Transaction> = {
    ...transactionData,
    sessionId: session.id,
    datestamp: Date.now(),
    _id: mongoId(),
  };

  return unwrapId((await transactions().insertOne(transaction)).ops[0]);
}

export async function getTransactionWithId(id: string): Promise<Transaction | null> {
  return unwrapId(await transactions().findOne(byMongoId(id)));
}

export async function searchTransactionsWithCriteria(criteria: TransactionCriteria): Promise<Transaction[]> {
  const { transactionId, ...query } = criteria;

  return unwrapId(
    await (
      await transactions()
        .find({
          ...query,
          ...(transactionId ? byMongoId(transactionId) : {}),
        })
        .limit(500)
        .sort({ datestamp: -1 })
    ).toArray(),
  );
}

function transactions() {
  return db.collection("transactions");
}
