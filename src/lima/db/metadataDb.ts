import { Collection } from "mongodb";
import { Metadata } from "@types";
import { db } from "./mongoClient";
import { byMongoId, mongoId, skipId, unwrapId, WithMongoId, WithoutId } from "./utils";

export async function insertMetadata(metadata: WithoutId<Metadata>): Promise<Metadata> {
  const r: WithMongoId<Metadata> = {
    _id: mongoId(),
    ...metadata,
  };

  return unwrapId((await metadataCollection().insertOne(r)).ops[0]);
}

export async function updateMetadata(metadata: Metadata) {
  return await metadataCollection().updateOne(byMongoId(metadata.id), { $set: skipId(metadata) });
}

export async function deleteMetadata(_id: string) {
  return await metadataCollection().deleteOne(byMongoId(_id));
}

export async function findMetadata(): Promise<Metadata[]> {
  const metadata = await (await metadataCollection().find()).toArray();
  return unwrapId(metadata);
}

export async function findMetadataByAppName(appName: string): Promise<Metadata> {
  return unwrapId(await metadataCollection().findOne({ appName }));
}

export async function findMetadataById(_id: string): Promise<Metadata> {
  return unwrapId(await metadataCollection().findOne(byMongoId(_id)));
}

export function metadataCollection(): Collection<WithMongoId<Metadata>> {
  return db.collection("limaMetadata");
}
