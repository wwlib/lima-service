import { Metadata, AuthRequest } from "@types";
import { RedisClient } from "./redis/RedisClient";

type CachedMetadata = {
  [appName: string]: Metadata;
};

export default class MetadataRequestProcessor {
  private static _instance: MetadataRequestProcessor;

  private _cachedMetadata: CachedMetadata;
  private _redisClient: RedisClient | undefined

  constructor() {
    this._cachedMetadata = {};
  }

  get cachedMetadata(): CachedMetadata {
    return this._cachedMetadata
  }

  static Instance() {
    return this._instance || (this._instance = new this());
  }

  setRedisClient(redisClient: RedisClient) {
    this._redisClient = redisClient
  }

  addMetadataToCache(metadata: Metadata) {
    if (metadata.appName) {
      this._cachedMetadata[metadata.appName] = metadata
    }
  }

  invalidateCache() {
    this._cachedMetadata = {};
  }

  async getCachedMetadataWithAppName(appName: string): Promise<Metadata | undefined> {
    let result: Metadata | undefined = undefined;
    if (this._cachedMetadata[appName]) {
      result = this._cachedMetadata[appName];
    } else {
      if (!this._redisClient) {
        throw new Error('MetadataRequestProcessor: getCachedMetadataWithAppName: error: redisClient is undefined.')
      }
      this._cachedMetadata[appName] = await this._redisClient.findMetadataByAppName(appName);
      result = this._cachedMetadata[appName];
    }
    return result;
  }

  async getMetadata(options: any, req: AuthRequest): Promise<any> {
    if (!this._redisClient) {
      throw new Error('MetadataRequestProcessor: getMetadata: error: redisClient is undefined.')
    }
    let result: any = await this._redisClient.findMetadata();
    if (options && options.appName) {
      result = await this._redisClient.findMetadataByAppName(options.appName);
    }
    if (result && result.length) {
      result.forEach((metadata: Metadata) => {
        this._cachedMetadata[metadata.appName] = metadata;
      });
    }
    const replacer = (key: string, value: any) => {
      if (key === "proprietary") {
        return undefined;
      } else {
        return value;
      }
    };
    if (result) {
      let resultString = JSON.stringify(result, replacer);
      result = JSON.parse(resultString);
    }
    return result;
  }

  async process(body: any, req: AuthRequest): Promise<any> {
    if (!this._redisClient) {
      throw new Error('MetadataRequestProcessor: process: error: redisClient is undefined.')
    }
    const appName: string = body.appName;
    const action: string = body.action;
    const metadata: Metadata = body.metadata;
    let result: any | undefined = undefined;
    switch (action) {
      case "insert":
        result = await this._redisClient.insertMetadata(metadata);
        break;
      case "update":
        result = await this._redisClient.updateMetadata(metadata);
        break;
      case "delete":
        result = await this._redisClient.deleteMetadata(metadata.appName);
        break;
      default:
        result = await this.getMetadata({ appName }, req);
    }
    if (result) {
      return result;
    } else {
      throw new Error(`MetadataRequestProcessor: api call failed. unable to process metadata request.`);
    }
  }
}
