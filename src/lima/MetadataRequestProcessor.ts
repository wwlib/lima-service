import { Role, Metadata } from "./schema";
import { assertRole, AuthContext } from "./auth";
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

  async getMetadata(options: any, ctx: AuthContext): Promise<any> {
    let result: any = await findMetadata();
    if (options && options.appName) {
      result = await findMetadataByAppName(options.appName);
    }
    if (result && result.length) {
      result.forEach((metadata: Metadata) => {
        this._cachedMetadata[metadata.appName] = metadata;
      });
    }
    try {
      assertRole(ctx, Role.Reviewer);
    } catch (e) {
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
    }
    return result;
  }

  async process(body: any, ctx: AuthContext): Promise<any> {
    const appName: string = body.appName;
    const action: string = body.action;
    const metadata: Metadata = body.metadata;
    let result: any | undefined = undefined;
    switch (action) {
      case "insert":
        try {
          assertRole(ctx, Role.Admin);
          result = await insertMetadata(metadata);
        } catch (error) {
          throw new Error(`MetadataRequestProcessor: insert failed. insufficient permissions.`);
        }
        break;
      case "update":
        try {
          assertRole(ctx, Role.Admin);
          result = await updateMetadata(metadata);
        } catch (error) {
          throw new Error(`MetadataRequestProcessor: update failed. insufficient permissions.`);
        }
        break;
      case "delete":
        try {
          assertRole(ctx, Role.Admin);
          result = await deleteMetadata(metadata.id);
        } catch (error) {
          throw new Error(`MetadataRequestProcessor: delete failed. insufficient permissions.`);
        }
        break;
      default:
        result = await this.getMetadata({ appName }, ctx);
    }
    if (result) {
      return result;
    } else {
      throw new Error(`MetadataRequestProcessor: api call failed. unable to process metadata request.`);
    }
  }
}
