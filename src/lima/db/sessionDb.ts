import { db } from "./mongoClient";
import { Session } from "../schema";
import { byMongoId, mongoId, unwrapId, WithMongoId } from "./utils";

export async function getNewSession(): Promise<Session> {
  const session: WithMongoId<Session> = {
    _id: mongoId(),
  };

  return unwrapId((await sessions().insertOne(session)).ops[0]);
}

export async function getSessionWithId(id: string): Promise<Session | null> {
  return unwrapId(await sessions().findOne(byMongoId(id)));
}

function sessions() {
  return db.collection("sessions");
}
