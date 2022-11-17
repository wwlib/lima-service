import { Metadata, Role } from "../schema";
import { hashPassword } from "../auth";
import { getConfig } from "../config";
import { Db, MongoClient } from "mongodb";
import { log } from "../logger";
import { insertUser } from "./usersDb";
import { insertMetadata } from "./metadataDb";
import { inTests } from "./utils";

let mongod: any;
let mongoClient: any;
let db: Db;

export async function initMongoClient() {
  let url = getConfig().ETCO_server_dbEndpoint;

  let createSeedData = false;

  if (!url) {
    log("Using in-memory MongoDB", true);

    if (inTests()) {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      mongod = new MongoMemoryServer();
    } else {
      const { MongoMemoryReplSet } = require("mongodb-memory-server");

      mongod = new MongoMemoryReplSet({
        replSet: { storageEngine: "wiredTiger" },
      });
      await mongod.waitUntilRunning();
    }

    createSeedData = true;

    url = await mongod.getUri();
  } else {
    log(`Connected to MongoDB server`);
  }

  try {
    mongoClient = new MongoClient(url, { useUnifiedTopology: true, useNewUrlParser: true })
    await mongoClient.connect();

    const dbName = "lima";
    db = mongoClient.db(dbName);

    if (createSeedData) {
      // users
      await insertUser({
        email: "admin",
        roles: [Role.Admin, Role.Reviewer],
        passwordHash: hashPassword("admin"),
      });
      await insertUser({
        email: "reviewer",
        roles: [Role.Reviewer],
        passwordHash: hashPassword("reviewer"),
      });
      await insertUser({
        email: "consumer",
        roles: [Role.Consumer],
        passwordHash: hashPassword("consumer"),
      });

      // metadata
      const metaData = await import("./seed/metadataSeed.json");

      for (const m of metaData.default) {
        const result = await insertMetadata(m as Metadata);
      }
    }
  } catch (error) {
    log(error);
  }
}

export async function stopMongo() {
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }

  if (mongoClient) {
    mongoClient.close();
    mongoClient = null;
  }
}

export { db };
