import { Collection } from "mongodb";
import { User } from "../schema";
import { db } from "./mongoClient";
import { byMongoId, deleteProps, mongoId, skipId, unwrapId, WithMongoId, WithoutId } from "./utils";

export async function insertUser(user: WithoutId<User>): Promise<User> {
  const r: WithMongoId<User> = {
    _id: mongoId(),
    ...user,
  };

  return unwrapId((await usersCollection().insertOne(r)).ops[0]);
}

export async function updateUser(user: User) {
  await usersCollection().updateOne(byMongoId(user.id), { $set: skipId(user) });
}

export async function deleteUser(id: string) {
  await usersCollection().deleteOne(byMongoId(id));
}

export async function findUsers(): Promise<User[]> {
  const users = await (await usersCollection().find()).toArray();
  deleteProps(users, "passwordHash");
  return unwrapId(users);
}

export async function findUserByEmail(email: string): Promise<User> {
  return unwrapId(await usersCollection().findOne({ email }));
}

export async function findUserById(id: string): Promise<User> {
  return unwrapId(await usersCollection().findOne(byMongoId(id)));
}

export function usersCollection(): Collection<WithMongoId<User>> {
  return db.collection("limaUsers");
}
