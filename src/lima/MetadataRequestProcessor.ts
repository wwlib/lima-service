import { Metadata, AuthRequest } from "@types";
import { deleteMetadata, findMetadata, findMetadataByAppName, insertMetadata, updateMetadata } from "./db/metadataDb";

type CachedMetadata = {
  [appName: string]: Metadata;
};

export default class MetadataRequestProcessor {
  private static _instance: MetadataRequestProcessor;
  private _cachedMetadata: CachedMetadata;

  constructor() {
    this._cachedMetadata = {};
  }

  static Instance() {
    return this._instance || (this._instance = new this());
  }

  invalidateCache() {
    this._cachedMetadata = {};
  }

  async getCachedMetadataWithAppName(appName: string): Promise<Metadata | undefined> {
    let result: Metadata | undefined = undefined;
    if (this._cachedMetadata[appName]) {
      result = this._cachedMetadata[appName];
    } else {
      this._cachedMetadata[appName] = await findMetadataByAppName(appName);
      result = this._cachedMetadata[appName];
    }
    return result;
  }

  async getMetadata(options: any, req: AuthRequest): Promise<any> {
    let result: any = await findMetadata();
    if (options && options.appName) {
      result = await findMetadataByAppName(options.appName);
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
    const appName: string = body.appName;
    const action: string = body.action;
    const metadata: Metadata = body.metadata;
    let result: any | undefined = undefined;
    switch (action) {
      case "insert":
        result = await insertMetadata(metadata);
        break;
      case "update":
        result = await updateMetadata(metadata);
        break;
      case "delete":
        result = await deleteMetadata(metadata.id);
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
